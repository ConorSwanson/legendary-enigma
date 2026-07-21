import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var userState: UserState

    var body: some View {
        TabView(selection: $userState.selectedTab) {
            HomeView()
                .tabItem { Label("Profile", systemImage: "house.fill") }
                .tag(0)

            FeedView()
                .tabItem { Label("Feed", systemImage: "person.2.fill") }
                .tag(1)

            LogClimbView()
                .tabItem { Label("Log", systemImage: "plus.circle.fill") }
                .tag(2)

            MountainsView()
                .tabItem { Label("14ers", systemImage: "mountain.2.fill") }
                .tag(3)
        }
        .tint(Color(red: 56/255, green: 189/255, blue: 248/255))
        .onAppear {
            let tabBg = UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1)
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = tabBg
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}
