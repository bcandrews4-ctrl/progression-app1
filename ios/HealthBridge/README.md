## HealthKit iOS Bridge

Add these files to a new iOS app project in Xcode to read HealthKit data and
upload it daily to Supabase via the `ingest-health` Edge Function.

### Xcode setup
1. Create a new iOS app project.
2. Enable **HealthKit** in Signing & Capabilities.
3. Add to `Info.plist`:
   - `NSHealthShareUsageDescription` = "Read your Health data to sync workouts and metrics."

### Getting your sync token
1. Open the web app and go to **Profile → Apple Health Sync**.
2. Copy your **Sync Token** (a UUID shown there).

### Usage example
```swift
HealthKitManager.shared.requestAuthorization { success, error in
    guard success else { return }

    let since = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
    HealthKitManager.shared.fetchWorkouts(since: since) { workouts in
        HealthKitManager.shared.fetchDailyMetrics(since: since) { metrics in
            APIClient.shared.uploadHealthData(
                syncToken: "PASTE_YOUR_SYNC_TOKEN_HERE",
                workouts: workouts,
                metrics: metrics
            ) { result in
                print(result)
            }
        }
    }
}
```

### Daily background sync (optional)
To keep data fresh without opening the app:
- Add **Background Modes** capability.
- Use `HKObserverQuery` + `enableBackgroundDelivery` to fetch and upload
  incremental updates automatically.
