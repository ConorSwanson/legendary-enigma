import Foundation

enum Config {
    /// Base URL of your Railway deployment — no trailing slash. All real API
    /// networking goes through this; never repoint it at the marketing domain.
    nonisolated(unsafe) static let apiBaseURL = "https://legendary-enigma-production.up.railway.app"

    /// Public-facing base URL for user-shareable links (e.g. "/s/:id" share
    /// pages) — the custom domain, so links look like the app, not the host.
    nonisolated(unsafe) static let shareBaseURL = "https://www.getswitchback.co"
}
