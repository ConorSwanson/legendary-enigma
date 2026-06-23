# 14ers iOS App

Native SwiftUI app for tracking Colorado 14er summits. Connects to the same Railway backend as the web app.

## Requirements

- Xcode 15+
- iOS 16+ deployment target
- An active Railway deployment of the backend

## Setup

### 1. Create the Xcode project

1. Open Xcode → **File → New → Project**
2. Choose **iOS → App**
3. Settings:
   - Product Name: `14ers`
   - Team: your Apple Developer team
   - Bundle Identifier: `com.yourname.fourteeners` (or anything you like)
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Minimum Deployments: **iOS 16.0**
4. Save the project inside the `ios/` folder of this repo (at the same level as the `14ers/` source folder)

### 2. Add source files

In Xcode, right-click the project navigator root → **Add Files to "14ers"** and add the entire `14ers/` source folder. Make sure **"Copy items if needed"** is **unchecked** and **"Create groups"** is selected.

The source tree should look like:

```
14ers/
├── App14ers.swift
├── Config.swift
├── Models.swift
├── Auth/
│   ├── AuthManager.swift
│   └── SignInView.swift
├── Networking/
│   └── APIClient.swift
└── Views/
    ├── MainTabView.swift
    ├── DashboardView.swift
    ├── FeedView.swift
    ├── LogClimbView.swift
    ├── HistoryView.swift
    ├── ClimbDetailView.swift
    ├── ProfileView.swift
    └── BadgeGridView.swift
```

### 3. Add WebKit framework

1. Select your project in the navigator → **Target → General → Frameworks, Libraries, and Embedded Content**
2. Click **+** → search for **WebKit** → Add

### 4. Configure the API URL

Edit `14ers/Config.swift` and set your Railway deployment URL:

```swift
enum Config {
    static let apiBaseURL = "https://your-app.up.railway.app"
    static let clerkPublishableKey = "pk_test_..."   // your Clerk publishable key
}
```

Both values are public/safe to include in client code.

### 5. Remove the generated ContentView

Xcode generates a `ContentView.swift` when you create the project. Delete it — `App14ers.swift` serves as the entry point.

### 6. Build and run

Select a simulator (iPhone 15 or later recommended) and press **⌘R**.

## Architecture

| File | Purpose |
|------|---------|
| `App14ers.swift` | App entry point; routes to `SignInView` or `MainTabView` based on auth state |
| `AuthManager.swift` | Singleton `ObservableObject`; holds sign-in state, Clerk token via Keychain |
| `SignInView.swift` | `WKWebView` that loads the web app's `/sign-in` page; extracts Clerk JWT via JS bridge |
| `APIClient.swift` | `actor` with async/await URLSession; stores Bearer token in Keychain |
| `Models.swift` | `Codable` structs mirroring the server JSON responses |
| `Views/` | SwiftUI screens: Dashboard, Feed (with likes), Log, History, ClimbDetail, Profile, Badges |

## Auth flow

The app reuses the web app's Clerk-powered sign-in page inside a `WKWebView`. After sign-in, the app injects JavaScript to call `window.Clerk.session.getToken()` and posts the JWT back via a native message handler. The token is stored in the iOS Keychain and sent as a `Bearer` header on all API requests — the same token the web app uses.
