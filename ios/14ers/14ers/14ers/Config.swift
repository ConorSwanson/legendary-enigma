import Foundation

enum Config {
    /// Base URL of your Railway deployment — no trailing slash
    nonisolated(unsafe) static let apiBaseURL = "https://legendary-enigma-production.up.railway.app"

    /// Clerk publishable key (same one used in the web app)
    nonisolated(unsafe) static let clerkPublishableKey = "pk_test_ZmVhc2libGUtdG91Y2FuLTE0LmNsZXJrLmFjY291bnRzLmRldiQ"
}
