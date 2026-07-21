import SwiftUI

private let bg      = Color(red: 3/255,   green: 7/255,   blue: 18/255)
private let card    = Color(red: 17/255,  green: 24/255,  blue: 39/255)
private let emerald = Color(red: 52/255,  green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255,  green: 189/255, blue: 248/255)

struct FeedView: View {
    enum FeedTab: String, CaseIterable { case discover = "Discover", following = "Following" }

    @State private var feedTab: FeedTab = .discover
    @State private var items: [FeedItem] = []
    @State private var isLoading = false
    @State private var error: String?
    @EnvironmentObject var userState: UserState

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                Picker("Feed", selection: $feedTab) {
                    ForEach(FeedTab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
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
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(items) { item in
                                FeedCard(item: item)
                            }
                        }
                        .padding()
                    }
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Feed")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { HeaderAvatar() }
                ToolbarItem(placement: .navigationBarTrailing) { NotificationBellButton() }
            }
        }
        .task { await load() }
        .onChange(of: feedTab) {
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
        do {
            items = try await feedTab == .discover
                ? APIClient.shared.feedDiscover()
                : APIClient.shared.feedFollowing()
        } catch {
            self.error = error.localizedDescription
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
                VStack(alignment: .leading, spacing: 0) {
                    Group {
                        if let photoUrl = item.photoUrl, let url = URL(string: photoUrl) {
                            AsyncImage(url: url) { img in
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

                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.mountainName)
                                    .font(.headline)
                                    .foregroundColor(.white)
                                Text("\(item.elevation.formatted()) ft · \(item.range)")
                                    .font(.caption)
                                    .foregroundColor(emerald)
                            }
                            Spacer()
                            Text(item.climbDate.shortClimbDate())
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        if let notes = item.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.caption)
                                .foregroundColor(Color(red: 156/255, green: 163/255, blue: 175/255))
                                .lineLimit(3)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 12)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    // Profile avatar + name → UserProfileView
                    NavigationLink(destination: UserProfileView(userId: item.userId)) {
                        HStack(spacing: 6) {
                            Group {
                                if let urlStr = item.userAvatarUrl, let url = URL(string: urlStr) {
                                    AsyncImage(url: url) { phase in
                                        if let img = phase.image {
                                            img.resizable().aspectRatio(contentMode: .fill)
                                        } else {
                                            avatarPlaceholder
                                        }
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
