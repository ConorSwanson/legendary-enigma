import SwiftUI

@main
struct App14ers: App {
    @StateObject private var authManager: AuthManager = AuthManager.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var authManager: AuthManager

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
    }
}
