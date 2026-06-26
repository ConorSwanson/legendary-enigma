import Foundation
import Combine

@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var isSignedIn: Bool = false

    private init() {
        if let token = KeychainHelper.load(for: "auth_token") {
            APIClient.shared.setToken(token)
            isSignedIn = true
        }
    }

    func signIn(token: String) {
        KeychainHelper.save(token, for: "auth_token")
        APIClient.shared.setToken(token)
        isSignedIn = true
    }

    func signOut() {
        KeychainHelper.delete(for: "auth_token")
        APIClient.shared.clearToken()
        isSignedIn = false
    }
}
