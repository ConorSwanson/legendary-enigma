import SwiftUI
import Combine
import UserNotifications
import Sentry

@MainActor
final class UserState: ObservableObject {
    @Published var avatarUrl: String?
    @Published var unreadCount: Int = 0
    @Published var selectedTab: Int = 0

    func refresh() async {
        async let p = APIClient.shared.myProfile()
        async let c = APIClient.shared.unreadNotificationCount()
        if let profile = try? await p { avatarUrl = profile.avatarUrl }
        if let count = try? await c { unreadCount = count }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        SentrySDK.start { options in
            options.dsn = "https://6e95e46a4a5afcf64374d250d3530293@o4511632586375168.ingest.us.sentry.io/4511632596795392"
            options.tracesSampleRate = 1.0
            options.attachScreenshot = true
            options.attachViewHierarchy = true
        }
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

    var body: some View {
        Group {
            if authManager.isSignedIn {
                MainTabView()
            } else {
                SignInView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: authManager.isSignedIn)
        .task(id: authManager.isSignedIn) {
            if authManager.isSignedIn {
                await userState.refresh()
                await requestPushPermission()
            }
        }
    }

    private func requestPushPermission() async {
        let center = UNUserNotificationCenter.current()
        guard (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) == true else { return }
        await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
    }
}
