## HealthKit iOS Bridge

Add these files to a new iOS app project in Xcode to read HealthKit data and
upload it to the backend.

### Xcode setup
1. Create a new iOS app project.
2. Enable **HealthKit** in Signing & Capabilities.
3. Add to `Info.plist`:
   - `NSHealthShareUsageDescription` = "Read your Health data to sync workouts and metrics."

### Usage example
```swift
HealthKitManager.shared.requestAuthorization { success, error in
    guard success else { return }

    let since = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
    HealthKitManager.shared.fetchWorkouts(since: since) { workouts in
        HealthKitManager.shared.fetchDailyMetrics(since: since) { metrics in
            let baseURL = URL(string: "https://your-backend.com")!
            APIClient.shared.uploadHealthData(
                baseURL: baseURL,
                apiKey: "YOUR_API_KEY",
                workouts: workouts,
                metrics: metrics
            ) { result in
                print(result)
            }
        }
    }
}
```

### Background updates (optional)
To keep data fresh:
- Add **Background Modes** capability.
- Use `HKObserverQuery` + `enableBackgroundDelivery` to fetch and upload
  incremental updates.
