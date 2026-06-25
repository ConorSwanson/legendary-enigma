import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Profile", systemImage: "house.fill") }

            FeedView()
                .tabItem { Label("Feed", systemImage: "person.2.fill") }

            LogClimbView()
                .tabItem { Label("Log", systemImage: "plus.circle.fill") }

            HistoryView()
                .tabItem { Label("History", systemImage: "clock.fill") }
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
