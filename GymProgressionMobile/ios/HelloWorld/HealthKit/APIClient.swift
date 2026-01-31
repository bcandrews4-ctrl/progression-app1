import Foundation

final class APIClient {
    static let shared = APIClient()

    private init() {}

    func uploadHealthData(baseURL: URL,
                          apiKey: String?,
                          workouts: [WorkoutPayload],
                          metrics: [HealthMetricPayload],
                          completion: @escaping (Result<Void, Error>) -> Void) {
        let payload = HealthIngestPayload(workouts: workouts, metrics: metrics)
        guard let data = try? JSONEncoder().encode(payload) else {
            completion(.failure(NSError(domain: "encode", code: 1)))
            return
        }

        var request = URLRequest(url: baseURL.appendingPathComponent("/api/health/ingest"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let apiKey = apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = data

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "upload", code: 2))) }
                return
            }
            DispatchQueue.main.async { completion(.success(())) }
        }.resume()
    }
}
