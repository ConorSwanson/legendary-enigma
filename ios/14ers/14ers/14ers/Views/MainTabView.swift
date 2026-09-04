import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var userState: UserState
    @State private var activeInviteId: Int?

    var body: some View {
        TabView(selection: $userState.selectedTab) {
            FeedView()
                .tabItem { Label("Feed", systemImage: "person.2.fill") }
                .tag(0)

            MountainsView()
                .tabItem { Label("Summits", systemImage: "mountain.2.fill") }
                .tag(1)

            LogClimbView()
                .tabItem { Label("Log", systemImage: "plus.circle.fill") }
                .tag(2)

            NavigationStack {
                BadgesView(isTabRoot: true)
            }
            .tabItem { Label("Badges", systemImage: "medal.fill") }
            .tag(3)

            HomeView()
                .tabItem { Label("Profile", systemImage: "house.fill") }
                .tag(4)
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
        .sheet(item: $activeInviteId) { id in
            InviteDetailView(inviteId: id)
        }
        .onChange(of: userState.pendingInviteId) { newValue in
            guard let id = newValue else { return }
            userState.pendingInviteId = nil
            activeInviteId = id
        }
    }
}
