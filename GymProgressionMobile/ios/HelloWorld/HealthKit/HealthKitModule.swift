import Foundation
import React

@objc(HealthKitModule)
final class HealthKitModule: NSObject {
    @objc static func requiresMainQueueSetup() -> Bool {
        false
    }

    @objc(requestAuthorization:rejecter:)
    func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
        HealthKitManager.shared.requestAuthorization { success, error in
            if let error = error {
                reject("healthkit_auth_failed", error.localizedDescription, error)
                return
            }
            if !success {
                reject("healthkit_unavailable", "Health data unavailable or permission denied.", nil)
                return
            }
            resolve(true)
        }
    }

    @objc(syncHealthData:resolver:rejecter:)
    func syncHealthData(_ options: NSDictionary,
                        resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let baseURLString = options["baseURL"] as? String,
              let baseURL = URL(string: baseURLString) else {
            reject("invalid_base_url", "Missing or invalid baseURL.", nil)
            return
        }

        let apiKey = options["apiKey"] as? String
        let days = options["days"] as? Int ?? 30
        let since = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()

        let group = DispatchGroup()
        var workouts: [WorkoutPayload] = []
        var metrics: [HealthMetricPayload] = []

        group.enter()
        HealthKitManager.shared.fetchWorkouts(since: since) { results in
            workouts = results
            group.leave()
        }

        group.enter()
        HealthKitManager.shared.fetchDailyMetrics(since: since) { results in
            metrics = results
            group.leave()
        }

        group.notify(queue: .main) {
            APIClient.shared.uploadHealthData(baseURL: baseURL, apiKey: apiKey, workouts: workouts, metrics: metrics) { result in
                switch result {
                case .success:
                    resolve([
                        "workouts": workouts.count,
                        "metrics": metrics.count
                    ])
                case .failure(let error):
                    reject("healthkit_upload_failed", error.localizedDescription, error)
                }
            }
        }
    }
}
