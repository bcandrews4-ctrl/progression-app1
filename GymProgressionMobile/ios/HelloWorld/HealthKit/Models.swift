import Foundation

struct WorkoutPayload: Codable {
    let externalId: String
    let source: String
    let startTime: String
    let endTime: String
    let type: String
    let calories: Double?
    let distanceKm: Double?
    let avgHeartRate: Double?
    let device: String?
}

struct SleepStagePayload: Codable {
    let stage: String
    let minutes: Double
}

struct HealthMetricPayload: Codable {
    let dateISO: String
    let source: String
    let steps: Double?
    let sleepHours: Double?
    let avgBPM: Double?
    let caloriesBurned: Double?
    let sleepStages: [SleepStagePayload]?
}

struct HealthIngestPayload: Codable {
    let workouts: [WorkoutPayload]
    let metrics: [HealthMetricPayload]
}
