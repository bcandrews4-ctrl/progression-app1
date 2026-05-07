import Foundation

final class APIClient {
    static let shared = APIClient()

    // Supabase Edge Function endpoint for health metric ingestion
    static let ingestURL = URL(string: "https://fjfyglqsnbhhclbbdllu.supabase.co/functions/v1/ingest-health")!

    private init() {}

    // syncToken: the value shown in the web app under Profile → Apple Health Sync
    func uploadHealthData(syncToken: String, workouts: [WorkoutPayload], metrics: [HealthMetricPayload], completion: @escaping (Result<Void, Error>) -> Void) {
        let payload = HealthIngestPayload(workouts: workouts, metrics: metrics)
        guard let data = try? JSONEncoder().encode(payload) else {
            completion(.success(()))
            return
        }

        var request = URLRequest(url: APIClient.ingestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(syncToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = data

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "upload", code: 1))) }
                return
            }
            DispatchQueue.main.async { completion(.success(())) }
        }.resume()
    }
}
