import Foundation
import HealthKit

final class HealthKitManager {
    static let shared = HealthKitManager()

    private let healthStore = HKHealthStore()
    private let calendar = Calendar.current

    private init() {}

    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, nil)
            return
        }

        let readTypes: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .basalEnergyBurned)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]

        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            DispatchQueue.main.async {
                completion(success, error)
            }
        }
    }

    func fetchWorkouts(since: Date, completion: @escaping ([WorkoutPayload]) -> Void) {
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(sampleType: HKObjectType.workoutType(),
                                  predicate: predicate,
                                  limit: HKObjectQueryNoLimit,
                                  sortDescriptors: [sortDescriptor]) { [weak self] _, samples, _ in
            guard let self = self, let workouts = samples as? [HKWorkout] else {
                completion([])
                return
            }
            let payloads = workouts.map { self.mapWorkout($0) }
            completion(payloads)
        }

        healthStore.execute(query)
    }

    func fetchDailyMetrics(since: Date, completion: @escaping ([HealthMetricPayload]) -> Void) {
        let startOfDay = calendar.startOfDay(for: since)
        let endDate = Date()
        let dayCount = calendar.dateComponents([.day], from: startOfDay, to: endDate).day ?? 0

        var results: [HealthMetricPayload] = []
        let group = DispatchGroup()

        for offset in 0...dayCount {
            guard let day = calendar.date(byAdding: .day, value: offset, to: startOfDay) else { continue }
            guard let dayEnd = calendar.date(byAdding: .day, value: 1, to: day) else { continue }

            group.enter()
            fetchMetricsForDay(start: day, end: dayEnd) { metric in
                if let metric = metric {
                    results.append(metric)
                }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            completion(results.sorted { $0.dateISO > $1.dateISO })
        }
    }

    private func fetchMetricsForDay(start: Date, end: Date, completion: @escaping (HealthMetricPayload?) -> Void) {
        let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        let activeEnergyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
        let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
        let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        var stepsValue: Double?
        var caloriesValue: Double?
        var avgBPMValue: Double?
        var sleepHoursValue: Double?
        var sleepStages: [SleepStagePayload] = []

        let group = DispatchGroup()

        group.enter()
        let stepsQuery = HKStatisticsQuery(quantityType: stepsType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
            stepsValue = stats?.sumQuantity()?.doubleValue(for: HKUnit.count())
            group.leave()
        }
        healthStore.execute(stepsQuery)

        group.enter()
        let caloriesQuery = HKStatisticsQuery(quantityType: activeEnergyType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
            caloriesValue = stats?.sumQuantity()?.doubleValue(for: HKUnit.kilocalorie())
            group.leave()
        }
        healthStore.execute(caloriesQuery)

        group.enter()
        let heartRateQuery = HKStatisticsQuery(quantityType: heartRateType, quantitySamplePredicate: predicate, options: .discreteAverage) { _, stats, _ in
            if let quantity = stats?.averageQuantity() {
                avgBPMValue = quantity.doubleValue(for: HKUnit.count().unitDivided(by: HKUnit.minute()))
            }
            group.leave()
        }
        healthStore.execute(heartRateQuery)

        group.enter()
        let sleepQuery = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, _ in
            guard let self = self, let categories = samples as? [HKCategorySample] else {
                group.leave()
                return
            }
            let totalMinutes = categories.reduce(0.0) { total, sample in
                total + sample.endDate.timeIntervalSince(sample.startDate) / 60.0
            }
            sleepHoursValue = totalMinutes / 60.0
            sleepStages = self.mapSleepStages(samples: categories)
            group.leave()
        }
        healthStore.execute(sleepQuery)

        group.notify(queue: .main) {
            let metric = HealthMetricPayload(
                dateISO: self.isoDateString(start),
                source: "Apple Health",
                steps: stepsValue,
                sleepHours: sleepHoursValue,
                avgBPM: avgBPMValue,
                caloriesBurned: caloriesValue,
                sleepStages: sleepStages.isEmpty ? nil : sleepStages
            )
            completion(metric)
        }
    }

    private func mapWorkout(_ workout: HKWorkout) -> WorkoutPayload {
        let distance = workout.totalDistance?.doubleValue(for: HKUnit.meter()) ?? 0
        let calories = workout.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie())

        return WorkoutPayload(
            externalId: workout.uuid.uuidString,
            source: "Apple Health",
            startTime: isoDateTimeString(workout.startDate),
            endTime: isoDateTimeString(workout.endDate),
            type: workout.workoutActivityType.name,
            calories: calories,
            distanceKm: distance > 0 ? distance / 1000.0 : nil,
            avgHeartRate: nil,
            device: workout.device?.name
        )
    }

    private func mapSleepStages(samples: [HKCategorySample]) -> [SleepStagePayload] {
        var totals: [String: Double] = [:]
        samples.forEach { sample in
            let minutes = sample.endDate.timeIntervalSince(sample.startDate) / 60.0
            let stage = sleepStageName(sample.value)
            totals[stage, default: 0] += minutes
        }
        return totals.map { SleepStagePayload(stage: $0.key, minutes: $0.value) }
    }

    private func sleepStageName(_ value: Int) -> String {
        switch value {
        case HKCategoryValueSleepAnalysis.asleepDeep.rawValue:
            return "Deep"
        case HKCategoryValueSleepAnalysis.asleepCore.rawValue:
            return "Core"
        case HKCategoryValueSleepAnalysis.asleepREM.rawValue:
            return "REM"
        case HKCategoryValueSleepAnalysis.awake.rawValue:
            return "Awake"
        default:
            return "Asleep"
        }
    }

    private func isoDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter.string(from: date)
    }

    private func isoDateTimeString(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }
}

private extension HKWorkoutActivityType {
    var name: String {
        switch self {
        case .running: return "Running"
        case .walking: return "Walking"
        case .cycling: return "Cycling"
        case .functionalStrengthTraining: return "Strength"
        case .traditionalStrengthTraining: return "Strength"
        case .elliptical: return "Elliptical"
        case .rowing: return "Rowing"
        case .swimming: return "Swimming"
        default: return "Workout"
        }
    }
}
