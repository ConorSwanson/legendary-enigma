import Foundation

enum Config {
    /// Base URL of your Railway deployment — no trailing slash. All real API
    /// networking goes through this; never repoint it at the marketing domain.
    nonisolated(unsafe) static let apiBaseURL = "https://legendary-enigma-production.up.railway.app"

    /// Public-facing base URL for user-shareable links (e.g. "/s/:id" share
    /// pages) — the custom domain, so links look like the app, not the host.
    nonisolated(unsafe) static let shareBaseURL = "https://www.getswitchback.co"

    /// developers.facebook.com App ID — required as source_application by
    /// Instagram's Stories share API. No Facebook login or SDK involved.
    nonisolated(unsafe) static let facebookAppId = "2624633384662433"

    /// Required in App Store Connect and shown in-app (Profile settings).
    nonisolated(unsafe) static let privacyPolicyURL = URL(string: "\(shareBaseURL)/privacy")!

    /// Also doubles as the abuse/report contact point required alongside
    /// in-app reporting for App Store Guideline 1.2 (UGC apps).
    nonisolated(unsafe) static let supportURL = URL(string: "\(shareBaseURL)/support")!

    /// App Store listing, for the Profile "Invite Friends" share sheet.
    nonisolated(unsafe) static let appStoreURL = URL(string: "https://apps.apple.com/us/app/switchback-summit-tracker/id6784754996")!
}
