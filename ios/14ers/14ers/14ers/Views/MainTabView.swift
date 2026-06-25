import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.bar.fill") }

            FeedView()
                .tabItem { Label("Feed", systemImage: "person.2.fill") }

            LogClimbView()
                .tabItem { Label("Log", systemImage: "plus.circle.fill") }

            HistoryView()
                .tabItem { Label("History", systemImage: "clock.fill") }

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.fill") }
        }
        .tint(Color(red: 56/255, green: 189/255, blue: 248/255))
        .onAppear {
            let bg = UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1)
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = bg
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}
