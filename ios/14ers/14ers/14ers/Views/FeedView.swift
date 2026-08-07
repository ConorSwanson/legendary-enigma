import SwiftUI

private let bg      = Color(red: 3/255,   green: 7/255,   blue: 18/255)
private let card    = Color(red: 17/255,  green: 24/255,  blue: 39/255)
private let emerald = Color(red: 52/255,  green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255,  green: 189/255, blue: 248/255)

struct FeedView: View {
    enum FeedTab: String, CaseIterable { case discover = "Discover", following = "Following" }

    enum SortMode: String, CaseIterable, Identifiable {
        case chronological = "Chronological"
        case activity       = "Recent Activity"
        var id: String { rawValue }
        var apiValue: String { self == .chronological ? "chronological" : "activity" }
    }

    @State private var feedTab: FeedTab = .discover
    @State private var sortMode: SortMode = .chronological
    @State private var items: [FeedItem] = []
    @State private var isLoading = false
    @State private var isLoadingMore = false
    @State private var page = 1
    @State private var canLoadMore = true
    @State private var error: String?
    @State private var showUserSearch = false
    @State private var pullDistance: CGFloat = 0
    @State private var isRefreshing = false
    @EnvironmentObject var userState: UserState

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Picker("Feed", selection: $feedTab) {
                        ForEach(FeedTab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    Menu {
                        ForEach(SortMode.allCases) { mode in
                            Button {
                                sortMode = mode
                            } label: {
                                Label(mode.rawValue, systemImage: sortMode == mode ? "checkmark" : "")
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.subheadline)
                            .foregroundColor(sky)
                            .padding(8)
                            .background(card)
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 10)

                if isLoading && items.isEmpty {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if let error {
                    Spacer()
                    Text(error).foregroundColor(.red).padding()
                    Spacer()
                } else if items.isEmpty {
                    Spacer()
                    Text("No posts yet").foregroundColor(.gray)
                    Spacer()
                } else if #available(iOS 18.0, *) {
                    ScrollView { feedList }
                        .scrollBounceBehavior(.always, axes: .vertical)
                        .onScrollGeometryChange(for: CGFloat.self) { geo in
                            geo.contentOffset.y
                        } action: { _, newOffset in
                            handlePullChange(newOffset)
                        }
                } else {
                    ScrollView { feedList }
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Feed")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { HeaderAvatar() }
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 14) {
                        Button { showUserSearch = true } label: {
                            Image(systemName: "magnifyingglass").foregroundColor(sky)
                        }
                        NotificationBellButton()
                    }
                }
            }
            .sheet(isPresented: $showUserSearch) {
                UserSearchView()
            }
        }
        .task { await load() }
        .onChange(of: feedTab) {
            items = []
            Task { await load() }
        }
        .onChange(of: sortMode) {
            items = []
            Task { await load() }
        }
        .onReceive(NotificationCenter.default.publisher(for: .climbDeleted)) { note in
            if let deletedId = note.object as? Int {
                items.removeAll { $0.id == deletedId }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .climbLikeChanged)) { note in
            guard let info = note.userInfo,
                  let id = info["climbId"] as? Int,
                  let liked = info["liked"] as? Bool, let count = info["count"] as? Int,
                  let idx = items.firstIndex(where: { $0.id == id }) else { return }
            items[idx].isLiked = liked
            items[idx].likeCount = count
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        page = 1
        canLoadMore = true
        do {
            let fetched = try await feedTab == .discover
                ? APIClient.shared.feedDiscover(page: 1, sort: sortMode.apiValue)
                : APIClient.shared.feedFollowing(page: 1, sort: sortMode.apiValue)
            items = fetched
            if fetched.count < 30 { canLoadMore = false }
            prefetchImages(fetched)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loadMore() async {
        guard !isLoadingMore, canLoadMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        let nextPage = page + 1
        do {
            let more = try await feedTab == .discover
                ? APIClient.shared.feedDiscover(page: nextPage, sort: sortMode.apiValue)
                : APIClient.shared.feedFollowing(page: nextPage, sort: sortMode.apiValue)
            if more.isEmpty {
                canLoadMore = false
            } else {
                items.append(contentsOf: more)
                page = nextPage
                if more.count < 30 { canLoadMore = false }
                prefetchImages(more)
            }
        } catch {
            // Silently keep what's already loaded; next scroll attempt will retry.
        }
    }

    private func prefetchImages(_ list: [FeedItem]) {
        ImageCache.shared.prefetch(list.flatMap { item in
            [item.photoUrl.flatMap { URL(string: $0) },
             item.userAvatarUrl.flatMap { URL(string: $0) }]
        })
    }

    private var feedList: some View {
        LazyVStack(spacing: 12) {
            MountainRefreshHeader(pullDistance: pullDistance, isRefreshing: isRefreshing)

            ForEach(items) { item in
                FeedCard(item: item)
                    .onAppear {
                        if item.id == items.suffix(5).first?.id {
                            Task { await loadMore() }
                        }
                    }
            }
            if isLoadingMore {
                ProgressView().tint(.white).padding(.vertical, 16)
            }
        }
        .padding()
    }

    private func handlePullChange(_ contentOffsetY: CGFloat) {
        pullDistance = max(0, -contentOffsetY)
        guard pullDistance > pullToRefreshThreshold, !isRefreshing else { return }
        isRefreshing = true
        Task {
            await load()
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                isRefreshing = false
            }
        }
    }
}

// MARK: - Pull to Refresh

private let pullToRefreshThreshold: CGFloat = 70

private struct MountainRefreshHeader: View {
    let pullDistance: CGFloat
    let isRefreshing: Bool

    @State private var spinning = false

    private var progress: CGFloat { min(pullDistance / pullToRefreshThreshold, 1) }

    var body: some View {
        HStack {
            Spacer()
            Image(systemName: "mountain.2.fill")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(sky)
                .rotationEffect(.degrees(isRefreshing ? (spinning ? 360 : 0) : Double(progress) * 180))
                .scaleEffect(0.6 + 0.4 * progress)
                .opacity(isRefreshing ? 1 : progress)
            Spacer()
        }
        .frame(height: isRefreshing ? 50 : pullDistance)
        .onChange(of: isRefreshing) { newValue in
            if newValue {
                withAnimation(.linear(duration: 0.7).repeatForever(autoreverses: false)) {
                    spinning = true
                }
            } else {
                spinning = false
            }
        }
    }
}

// MARK: - Feed Card

struct FeedCard: View {
    let item: FeedItem
    @State private var liked: Bool
    @State private var likeCount: Int
    private let commentCount: Int
    @State private var showLikes = false

    init(item: FeedItem) {
        self.item = item
        _liked = State(initialValue: item.isLiked ?? false)
        _likeCount = State(initialValue: item.likeCount ?? 0)
        commentCount = item.commentCount ?? 0
    }

    private var shareText: String {
        "Summited \(item.mountainName) (\(item.elevation.formatted()) ft) on \(item.climbDate.shortClimbDate())! 🏔️ #Colorado14ers #14ers\n\(Config.apiBaseURL)/s/\(item.id)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            NavigationLink(destination: ClimbDetailView(climbId: item.id)) {
                Group {
                    if let photoUrl = item.photoUrl, let url = URL(string: photoUrl) {
                        CachedAsyncImage(url: url) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            card
                        }
                    } else {
                        MountainPlaceholder(mountainId: item.mountainId)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .clipped()
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        // Mountain name → MountainDetailView
                        NavigationLink(destination: MountainDetailView(mountainId: item.mountainId, fallbackName: item.mountainName)) {
                            Text(item.mountainName)
                                .font(.headline)
                                .foregroundColor(.white)
                        }
                        .buttonStyle(.plain)
                        NavigationLink(destination: ClimbDetailView(climbId: item.id)) {
                            Text("\(item.elevation.formatted()) ft · \(item.range)")
                                .font(.caption)
                                .foregroundColor(emerald)
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer()
                    NavigationLink(destination: ClimbDetailView(climbId: item.id)) {
                        Text(item.climbDate.shortClimbDate())
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .buttonStyle(.plain)
                }

                if let notes = item.notes, !notes.isEmpty {
                    NavigationLink(destination: ClimbDetailView(climbId: item.id)) {
                        Text(notes)
                            .font(.caption)
                            .foregroundColor(Color(red: 156/255, green: 163/255, blue: 175/255))
                            .lineLimit(3)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    // Profile avatar + name → UserProfileView
                    NavigationLink(destination: UserProfileView(userId: item.userId)) {
                        HStack(spacing: 6) {
                            Group {
                                if let urlStr = item.userAvatarUrl, let url = URL(string: urlStr) {
                                    CachedAsyncImage(url: url) { img in
                                        img.resizable().aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        avatarPlaceholder
                                    }
                                } else {
                                    avatarPlaceholder
                                }
                            }
                            .frame(width: 24, height: 24)
                            .clipShape(Circle())

                            Text(item.userName)
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    // Like button (heart = toggle, count = see who liked)
                    HStack(spacing: 2) {
                        Button(action: toggleLike) {
                            Image(systemName: liked ? "heart.fill" : "heart")
                                .font(.system(size: 15))
                                .foregroundColor(liked ? .red : .gray)
                        }
                        .buttonStyle(.plain)
                        if likeCount > 0 {
                            Button { showLikes = true } label: {
                                Text("\(likeCount)")
                                    .font(.caption)
                                    .foregroundColor(liked ? .red : .gray)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Comment icon (tap to open detail)
                    NavigationLink(destination: ClimbDetailView(climbId: item.id)) {
                        HStack(spacing: 4) {
                            Image(systemName: "bubble.right")
                                .font(.system(size: 15))
                                .foregroundColor(.gray)
                            if commentCount > 0 {
                                Text("\(commentCount)")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(.leading, 8)

                    // Share button
                    ShareLink(item: shareText) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 15))
                            .foregroundColor(.gray)
                            .padding(.leading, 8)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(12)
        }
        .background(card)
        .cornerRadius(14)
        .sheet(isPresented: $showLikes) {
            LikesListView(climbId: item.id)
        }
        .onReceive(NotificationCenter.default.publisher(for: .climbLikeChanged)) { note in
            guard let info = note.userInfo,
                  let id = info["climbId"] as? Int, id == item.id,
                  let l = info["liked"] as? Bool, let c = info["count"] as? Int else { return }
            liked = l
            likeCount = c
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text(item.userName.prefix(1).uppercased())
                    .font(.caption2.bold())
                    .foregroundColor(sky)
            )
    }

    private func toggleLike() {
        let prev = liked
        liked = !prev
        likeCount += prev ? -1 : 1
        postLikeChange()
        Task {
            do {
                let r = try await APIClient.shared.likeClimb(item.id)
                await MainActor.run { liked = r.liked; likeCount = r.count; postLikeChange() }
            } catch {
                await MainActor.run { liked = prev; likeCount += prev ? 1 : -1; postLikeChange() }
            }
        }
    }

    private func postLikeChange() {
        NotificationCenter.default.post(
            name: .climbLikeChanged, object: nil,
            userInfo: ["climbId": item.id, "liked": liked, "count": likeCount]
        )
    }
}
