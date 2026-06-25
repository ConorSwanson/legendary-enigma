import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case notFound
    case serverError(String)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized:      return "Session expired. Please sign in again."
        case .notFound:          return "Not found."
        case .serverError(let m): return m
        case .decodingError(let e): return "Data error: \(e.localizedDescription)"
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession

    private init() {
        self.baseURL = Config.apiBaseURL
        self.session = URLSession.shared
    }

    // MARK: - Token management

    nonisolated func setToken(_ token: String) {
        KeychainHelper.save(token, for: "clerk_token")
    }

    nonisolated func clearToken() {
        KeychainHelper.delete(for: "clerk_token")
    }

    private nonisolated func token() -> String? {
        KeychainHelper.load(for: "clerk_token")
    }

    // MARK: - Core request

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let url = URL(string: baseURL + "/api" + path) else {
            throw APIError.serverError("Invalid URL")
        }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let tok = token() {
            req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = body

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.serverError("No response")
        }

        if http.statusCode == 401 {
            Task { @MainActor in AuthManager.shared.signOut() }
            throw APIError.unauthorized
        }
        if http.statusCode == 404 { throw APIError.notFound }
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "Request failed"
            throw APIError.serverError(msg)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    private func requestVoid(_ path: String, method: String = "POST") async throws {
        let _: [String: String] = try await request(path, method: method)
    }

    // MARK: - Mountains

    func mountains() async throws -> [Mountain] {
        try await request("/mountains")
    }

    // MARK: - Stats

    func stats() async throws -> Stats {
        try await request("/stats")
    }

    // MARK: - Climbs

    func climbs(year: String? = nil, mountainId: Int? = nil, page: Int = 1) async throws -> [Climb] {
        var query = "?page=\(page)"
        if let y = year { query += "&year=\(y)" }
        if let m = mountainId { query += "&mountain_id=\(m)" }
        return try await request("/climbs\(query)")
    }

    func climb(_ id: Int) async throws -> Climb {
        try await request("/climbs/\(id)")
    }

    func logClimb(mountainId: Int, date: String, notes: String?, visibility: String, photoData: Data? = nil) async throws -> Int {
        guard let url = URL(string: baseURL + "/api/climbs") else {
            throw APIError.serverError("Invalid URL")
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let tok = token() { req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization") }

        var body = Data()
        func field(_ name: String, _ value: String) {
            body.append(contentsOf: "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n".utf8)
        }
        field("mountain_id", String(mountainId))
        field("climb_date", date)
        if let notes = notes { field("notes", notes) }
        field("visibility", visibility)
        if let photo = photoData {
            body.append(contentsOf: "--\(boundary)\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"photo.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8)
            body.append(photo)
            body.append(contentsOf: "\r\n".utf8)
        }
        body.append(contentsOf: "--\(boundary)--\r\n".utf8)
        req.httpBody = body

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.serverError("No response") }
        if http.statusCode == 401 {
            Task { @MainActor in AuthManager.shared.signOut() }
            throw APIError.unauthorized
        }
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "Request failed"
            throw APIError.serverError(msg)
        }
        struct Created: Decodable { let id: Int }
        return try JSONDecoder().decode(Created.self, from: data).id
    }

    func updateClimb(
        _ id: Int,
        mountainId: Int,
        date: String,
        notes: String,
        visibility: String
    ) async throws -> Climb {
        guard let url = URL(string: baseURL + "/api/climbs/\(id)") else {
            throw APIError.serverError("Invalid URL")
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let tok = token() {
            req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization")
        }
        var body = Data()
        for (k, v) in [
            ("mountain_id", String(mountainId)),
            ("climb_date", date),
            ("notes", notes),
            ("visibility", visibility),
        ] {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(k)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(v)\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.serverError("No response") }
        if http.statusCode == 401 {
            Task { @MainActor in AuthManager.shared.signOut() }
            throw APIError.unauthorized
        }
        if http.statusCode == 404 { throw APIError.notFound }
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "Update failed"
            throw APIError.serverError(msg)
        }
        return try JSONDecoder().decode(Climb.self, from: data)
    }

    func deleteClimb(_ id: Int) async throws {
        try await requestVoid("/climbs/\(id)", method: "DELETE")
    }

    func likeClimb(_ id: Int) async throws -> LikeResponse {
        try await request("/climbs/\(id)/like", method: "POST")
    }

    // MARK: - Feed

    func feedDiscover(page: Int = 1) async throws -> [FeedItem] {
        try await request("/feed/discover?page=\(page)")
    }

    func feedFollowing(page: Int = 1) async throws -> [FeedItem] {
        try await request("/feed?page=\(page)")
    }

    // MARK: - Profile

    func myProfile() async throws -> UserProfile {
        try await request("/auth/me")
    }

    func userProfile(_ id: Int) async throws -> UserProfile {
        try await request("/users/\(id)")
    }

    func userClimbs(_ id: Int) async throws -> [Climb] {
        try await request("/users/\(id)/climbs")
    }

    func follow(_ id: Int) async throws {
        try await requestVoid("/users/\(id)/follow", method: "POST")
    }

    func unfollow(_ id: Int) async throws {
        try await requestVoid("/users/\(id)/follow", method: "DELETE")
    }

    func updateProfile(name: String? = nil, bio: String? = nil, avatarData: Data? = nil, backgroundData: Data? = nil) async throws -> UserProfile {
        guard let url = URL(string: baseURL + "/api/profile") else {
            throw APIError.serverError("Invalid URL")
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let tok = token() { req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization") }

        var body = Data()
        func field(_ name: String, _ value: String) {
            body.append(contentsOf: "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n".utf8)
        }
        func fileField(_ name: String, _ fileData: Data, filename: String) {
            body.append(contentsOf: "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8)
            body.append(fileData)
            body.append(contentsOf: "\r\n".utf8)
        }
        if let name = name { field("name", name) }
        if let bio = bio { field("bio", bio) }
        if let avatarData = avatarData { fileField("avatar", avatarData, filename: "avatar.jpg") }
        if let backgroundData = backgroundData { fileField("background", backgroundData, filename: "background.jpg") }
        body.append(contentsOf: "--\(boundary)--\r\n".utf8)
        req.httpBody = body

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.serverError("No response") }
        if http.statusCode == 401 {
            Task { @MainActor in AuthManager.shared.signOut() }
            throw APIError.unauthorized
        }
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "Update failed"
            throw APIError.serverError(msg)
        }
        do {
            return try JSONDecoder().decode(UserProfile.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - Keychain helper

enum KeychainHelper {
    nonisolated static func save(_ value: String, for key: String) {
        let data = Data(value.utf8)
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecValueData:   data,
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    nonisolated static func load(for key: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass:            kSecClassGenericPassword,
            kSecAttrAccount:      key,
            kSecReturnData:       true,
            kSecMatchLimit:       kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    nonisolated static func delete(for key: String) {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrAccount: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
