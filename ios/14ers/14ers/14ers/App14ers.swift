import SwiftUI
import Combine

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

@main
struct App14ers: App {
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
            if authManager.isLoading {
                ZStack {
                    Color(red: 3/255, green: 7/255, blue: 18/255).ignoresSafeArea()
                    ProgressView()
                        .tint(.white)
                }
            } else if authManager.isSignedIn {
                MainTabView()
            } else {
                SignInView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: authManager.isSignedIn)
        .task(id: authManager.isSignedIn) {
            if authManager.isSignedIn { await userState.refresh() }
        }
    }
}
