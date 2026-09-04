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
        KeychainHelper.save(token, for: "auth_token")
    }

    nonisolated func clearToken() {
        KeychainHelper.delete(for: "auth_token")
    }

    private nonisolated func token() -> String? {
        KeychainHelper.load(for: "auth_token")
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
            let body = String(data: data, encoding: .utf8) ?? "<binary>"
            print("[API \(method) \(path)] HTTP \(http.statusCode): \(body)")
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
                ?? String(data: data, encoding: .utf8)?.prefix(200).description
                ?? "HTTP \(http.statusCode)"
            throw APIError.serverError(msg)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            print("[API \(method) \(path)] Decode error: \(error)")
            throw APIError.decodingError(error)
        }
    }

    private func requestVoid(_ path: String, method: String = "POST", body: Data? = nil) async throws {
        struct SuccessResponse: Decodable { let success: Bool }
        let _: SuccessResponse = try await request(path, method: method, body: body)
    }

    // MARK: - Auth

    struct AuthResponse: Decodable {
        let token: String
        let isNewUser: Bool

        enum CodingKeys: String, CodingKey { case token; case isNewUser = "is_new_user" }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            token = try c.decode(String.self, forKey: .token)
            isNewUser = try c.decodeIfPresent(Bool.self, forKey: .isNewUser) ?? false
        }
    }

    func signIn(email: String, password: String) async throws -> AuthResponse {
        let payload = try JSONEncoder().encode(["email": email, "password": password])
        return try await request("/auth/signin", method: "POST", body: payload)
    }

    func signUp(name: String?, email: String, password: String) async throws -> AuthResponse {
        struct Payload: Encodable { let name: String?; let email: String; let password: String }
        let payload = try JSONEncoder().encode(Payload(name: name, email: email, password: password))
        return try await request("/auth/signup", method: "POST", body: payload)
    }

    func signInWithApple(identityToken: String, fullName: PersonNameComponents?) async throws -> AuthResponse {
        struct FullNamePayload: Encodable { let givenName: String?; let familyName: String? }
        struct Payload: Encodable { let identityToken: String; let fullName: FullNamePayload? }
        let fn = fullName.map { FullNamePayload(givenName: $0.givenName, familyName: $0.familyName) }
        let payload = try JSONEncoder().encode(Payload(identityToken: identityToken, fullName: fn))
        return try await request("/auth/apple", method: "POST", body: payload)
    }

    // MARK: - Device Token

    func sendDeviceToken(_ token: String) async throws {
        let payload = try JSONEncoder().encode(["token": token])
        struct R: Decodable { let success: Bool }
        let _: R = try await request("/auth/device-token", method: "POST", body: payload)
    }

    // MARK: - Mountains

    func mountains() async throws -> [Mountain] {
        try await request("/mountains")
    }

    func peakLists() async throws -> [PeakList] {
        try await request("/mountains/lists")
    }

    func mountainDetail(_ id: Int) async throws -> MountainDetail {
        try await request("/mountains/\(id)")
    }

    func mountainClimbs(_ id: Int, month: String? = nil, year: String? = nil) async throws -> [RecentSummit] {
        var query = ""
        if let m = month { query += query.isEmpty ? "?month=\(m)" : "&month=\(m)" }
        if let y = year { query += query.isEmpty ? "?year=\(y)" : "&year=\(y)" }
        return try await request("/mountains/\(id)/climbs\(query)")
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

    func logClimb(mountainId: Int, date: String, notes: String?, visibility: String, photosData: [Data] = []) async throws -> Int {
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
        for (i, photo) in photosData.enumerated() {
            body.append(contentsOf: "--\(boundary)\r\nContent-Disposition: form-data; name=\"photos\"; filename=\"photo\(i).jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8)
            body.append(photo)
            body.append(contentsOf: "\r\n".utf8)
        }
        body.append(contentsOf: "--\(boundary)--\r\n".utf8)
        req.httpBody = body

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.serverError("No response") }
        print("[logClimb] HTTP \(http.statusCode)")
        if http.statusCode >= 400 {
            let body = String(data: data, encoding: .utf8) ?? "<binary>"
            print("[logClimb] Error body: \(body)")
        }
        if http.statusCode == 401 { Task { @MainActor in AuthManager.shared.signOut() }; throw APIError.unauthorized }
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
                ?? String(data: data, encoding: .utf8)?.prefix(200).description
                ?? "HTTP \(http.statusCode)"
            throw APIError.serverError("[\(http.statusCode)] \(msg)")
        }
        struct Created: Decodable { let id: Int }
        do {
            return try JSONDecoder().decode(Created.self, from: data).id
        } catch {
            let body = String(data: data, encoding: .utf8) ?? "<binary>"
            print("[logClimb] Decode error: \(error)\nBody: \(body)")
            throw APIError.decodingError(error)
        }
    }

    /// - Parameters:
    ///   - keepPhotoPaths: filenames (not full URLs) of existing photos to retain, in the
    ///     desired final order — e.g. the last path component of each `photo_urls` entry
    ///     the user didn't remove. Anything already on the climb but omitted here is deleted.
    ///   - newPhotosData: any newly-added photos, appended after the kept ones.
    func updateClimb(
        _ id: Int,
        mountainId: Int,
        date: String,
        notes: String,
        visibility: String,
        keepPhotoPaths: [String],
        newPhotosData: [Data] = []
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
        let keepJSON = (try? JSONEncoder().encode(keepPhotoPaths)).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        for (k, v) in [
            ("mountain_id", String(mountainId)),
            ("climb_date", date),
            ("notes", notes),
            ("visibility", visibility),
            ("keep_photos", keepJSON),
        ] {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(k)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(v)\r\n".data(using: .utf8)!)
        }
        for (i, photo) in newPhotosData.enumerated() {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"photos\"; filename=\"photo\(i).jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(photo)
            body.append("\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.serverError("No response") }
        if http.statusCode == 401 { Task { @MainActor in AuthManager.shared.signOut() }; throw APIError.unauthorized }
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

    func climbLikes(_ id: Int) async throws -> [FollowerUser] {
        try await request("/climbs/\(id)/likes")
    }

    // MARK: - Comments

    func comments(climbId: Int) async throws -> [Comment] {
        try await request("/climbs/\(climbId)/comments")
    }

    func postComment(climbId: Int, body: String, parentCommentId: Int? = nil) async throws -> Comment {
        struct Payload: Encodable { let body: String; let parent_comment_id: Int? }
        let data = try JSONEncoder().encode(Payload(body: body, parent_comment_id: parentCommentId))
        return try await request("/climbs/\(climbId)/comments", method: "POST", body: data)
    }

    func deleteComment(climbId: Int, commentId: Int) async throws {
        try await requestVoid("/climbs/\(climbId)/comments/\(commentId)", method: "DELETE")
    }

    func likeComment(climbId: Int, commentId: Int) async throws -> LikeResponse {
        try await request("/climbs/\(climbId)/comments/\(commentId)/like", method: "POST")
    }

    // MARK: - Invites

    func createInvite(mountainId: Int, climbDate: String?, note: String?, recipientUserIds: [Int], generateLink: Bool) async throws -> ClimbInvite {
        struct Payload: Encodable {
            let mountain_id: Int
            let climb_date: String?
            let note: String?
            let recipient_user_ids: [Int]
            let generate_link: Bool
        }
        let payload = Payload(mountain_id: mountainId, climb_date: climbDate, note: note,
                               recipient_user_ids: recipientUserIds, generate_link: generateLink)
        let data = try JSONEncoder().encode(payload)
        return try await request("/invites", method: "POST", body: data)
    }

    func myInvites() async throws -> MyInvites {
        try await request("/invites")
    }

    func invite(_ id: Int) async throws -> ClimbInvite {
        try await request("/invites/\(id)")
    }

    func respondToInvite(_ id: Int, status: String) async throws -> ClimbInvite {
        let payload = try JSONEncoder().encode(["status": status])
        return try await request("/invites/\(id)/respond", method: "POST", body: payload)
    }

    func claimInvite(token: String) async throws -> ClimbInvite {
        let payload = try JSONEncoder().encode(["token": token])
        return try await request("/invites/claim", method: "POST", body: payload)
    }

    // MARK: - Wishlist

    func wishlist() async throws -> [WishlistPeak] {
        try await request("/wishlist")
    }

    func addToWishlist(mountainId: Int) async throws {
        try await requestVoid("/wishlist/\(mountainId)", method: "POST")
    }

    func removeFromWishlist(mountainId: Int) async throws {
        try await requestVoid("/wishlist/\(mountainId)", method: "DELETE")
    }

    // MARK: - Feed

    func feedDiscover(page: Int = 1, sort: String = "chronological") async throws -> [FeedItem] {
        try await request("/feed/discover?page=\(page)&sort=\(sort)")
    }

    func feedFollowing(page: Int = 1, sort: String = "chronological") async throws -> [FeedItem] {
        try await request("/feed?page=\(page)&sort=\(sort)")
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

    func searchUsers(_ query: String) async throws -> [FollowerUser] {
        let q = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return try await request("/users/search?q=\(q)")
    }

    func leaderboard(scope: String) async throws -> [LeaderboardEntry] {
        try await request("/leaderboard?scope=\(scope)")
    }

    func followers(_ id: Int) async throws -> [FollowerUser] {
        try await request("/users/\(id)/followers")
    }

    func following(_ id: Int) async throws -> [FollowerUser] {
        try await request("/users/\(id)/following")
    }

    func follow(_ id: Int) async throws {
        try await requestVoid("/users/\(id)/follow", method: "POST")
    }

    func unfollow(_ id: Int) async throws {
        try await requestVoid("/users/\(id)/follow", method: "DELETE")
    }

    func blockUser(_ id: Int) async throws {
        try await requestVoid("/users/\(id)/block", method: "POST")
    }

    func unblockUser(_ id: Int) async throws {
        try await requestVoid("/users/\(id)/block", method: "DELETE")
    }

    func blockedUsers() async throws -> [FollowerUser] {
        try await request("/users/blocked")
    }

    // MARK: - Reports

    func report(targetType: String, targetId: Int, reason: String, details: String? = nil) async throws {
        struct Payload: Encodable { let target_type: String; let target_id: Int; let reason: String; let details: String? }
        let payload = try JSONEncoder().encode(Payload(target_type: targetType, target_id: targetId, reason: reason, details: details))
        try await requestVoid("/reports", method: "POST", body: payload)
    }

    // MARK: - Notifications

    func notifications() async throws -> [NotificationItem] {
        try await request("/notifications")
    }

    func unreadNotificationCount() async throws -> Int {
        struct R: Decodable { let count: Int }
        let r: R = try await request("/notifications/unread-count")
        return r.count
    }

    func markNotificationsRead() async throws {
        struct R: Decodable { let success: Bool }
        let _: R = try await request("/notifications/read-all", method: "POST")
    }

    func deleteAccount() async throws {
        struct R: Decodable { let success: Bool }
        let _: R = try await request("/auth/account", method: "DELETE")
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
