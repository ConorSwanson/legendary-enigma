import SwiftUI
import Combine
import UserNotifications
import UIKit

@MainActor
final class UserState: ObservableObject {
    @Published var avatarUrl: String?
    @Published var unreadCount: Int = 0
    @Published var selectedTab: Int = 0
    @Published var climbWasDeleted = false
    @Published var pendingClimbId: Int?
    @Published var pendingInviteId: Int?

    func refresh() async {
        async let p = APIClient.shared.myProfile()
        async let c = APIClient.shared.unreadNotificationCount()
        if let profile = try? await p { avatarUrl = profile.avatarUrl }
        if let count = try? await c { unreadCount = count }
    }

    // MARK: - Deferred invite claim
    //
    // A climb-invite share link opened before the app was installed can't
    // carry its token through the App Store round-trip via a URL, so the
    // web landing page copies "switchback-invite:<token>" to the clipboard
    // right before it hands off to the App Store. We read it back exactly
    // once, right after a fresh signup -- not on every launch -- so this
    // never triggers iOS's "pasted from X" prompt outside the one moment
    // it's actually expected. A link tapped while the app is already
    // installed but the user is signed out goes through the UserDefaults
    // stash instead (see .onOpenURL in RootView), which needs no clipboard
    // access at all.
    private static let pendingInviteTokenKey = "pendingInviteToken"

    func stashPendingInviteToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: Self.pendingInviteTokenKey)
    }

    func resolvePendingInvite(checkClipboard: Bool) async {
        var token = UserDefaults.standard.string(forKey: Self.pendingInviteTokenKey)
        if token != nil {
            UserDefaults.standard.removeObject(forKey: Self.pendingInviteTokenKey)
        } else if checkClipboard {
            token = Self.consumeClipboardInviteToken()
        }
        guard let token, !token.isEmpty else { return }
        if let invite = try? await APIClient.shared.claimInvite(token: token) {
            pendingInviteId = invite.id
        }
    }

    private static func consumeClipboardInviteToken() -> String? {
        let prefix = "switchback-invite:"
        guard let text = UIPasteboard.general.string, text.hasPrefix(prefix) else { return nil }
        UIPasteboard.general.string = ""
        return String(text.dropFirst(prefix.count))
    }
}

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        Task { try? await APIClient.shared.sendDeviceToken(token) }
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[Push] Registration failed: \(error.localizedDescription)")
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                 willPresent notification: UNNotification,
                                 withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                 didReceive response: UNNotificationResponse,
                                 withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        if let inviteId = userInfo["inviteId"] as? Int {
            NotificationCenter.default.post(name: .navigateToInvite, object: nil,
                                            userInfo: ["inviteId": inviteId])
        } else if let climbId = userInfo["climbId"] as? Int {
            NotificationCenter.default.post(name: .navigateToClimb, object: nil,
                                            userInfo: ["climbId": climbId])
        }
        completionHandler()
    }
}

@main
struct App14ers: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authManager: AuthManager = AuthManager.shared
    @StateObject private var userState = UserState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .environmentObject(userState)
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var userState: UserState
    @State private var showSplash = true

    var body: some View {
        Group {
            if showSplash {
                SplashView()
            } else if authManager.isSignedIn {
                MainTabView()
            } else {
                SignInView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: authManager.isSignedIn)
        .animation(.easeInOut(duration: 0.3), value: showSplash)
        .onReceive(NotificationCenter.default.publisher(for: .navigateToClimb)) { note in
            guard authManager.isSignedIn,
                  let climbId = note.userInfo?["climbId"] as? Int else { return }
            userState.selectedTab = 4
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                userState.pendingClimbId = climbId
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToInvite)) { note in
            guard authManager.isSignedIn,
                  let inviteId = note.userInfo?["inviteId"] as? Int else { return }
            userState.pendingInviteId = inviteId
        }
        .task(id: authManager.isSignedIn) {
            if authManager.isSignedIn {
                await userState.refresh()
                await requestPushPermission()
            }
        }
        .onOpenURL { url in
            // switchback://invite/<token> -- tapped from the /i/:token web
            // landing page when the app is already installed. If signed
            // out, stash the token rather than dropping it; it's picked up
            // right after the next sign-in (see SignInView/SignUpView).
            guard url.scheme == "switchback", url.host == "invite" else { return }
            let token = url.lastPathComponent
            guard !token.isEmpty else { return }
            if authManager.isSignedIn {
                Task {
                    if let invite = try? await APIClient.shared.claimInvite(token: token) {
                        userState.pendingInviteId = invite.id
                    }
                }
            } else {
                userState.stashPendingInviteToken(token)
            }
        }
        .task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            showSplash = false
        }
    }

    private func requestPushPermission() async {
        let center = UNUserNotificationCenter.current()
        guard (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) == true else { return }
        await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
    }
}

// MARK: - Splash

private let splashBgColor = Color(red: 3/255, green: 7/255, blue: 18/255)

struct SplashView: View {
    var body: some View {
        ZStack {
            splashBgColor.ignoresSafeArea()
            Image("SwitchbackLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 240)
        }
        .transition(.opacity)
    }
}
