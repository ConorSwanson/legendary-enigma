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
                                NavigationLink(destination: ClimbDetailView(climbId: item.id)) {
                                    FeedCard(item: item)
                                }
                                .buttonStyle(.plain)
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

    init(item: FeedItem) {
        self.item = item
        _liked = State(initialValue: item.isLiked ?? false)
        _likeCount = State(initialValue: item.likeCount ?? 0)
    }

    private var shareText: String {
        "Summited \(item.mountainName) (\(item.elevation.formatted()) ft) on \(item.climbDate.shortClimbDate())! 🏔️ #Colorado14ers #14ers\n\(Config.apiBaseURL)/s/\(item.id)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let photoUrl = item.photoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    card.frame(height: 180)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .clipped()
            }

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

                HStack {
                    // Profile avatar + name
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

                    Spacer()

                    // Like button
                    Button(action: toggleLike) {
                        HStack(spacing: 4) {
                            Image(systemName: liked ? "heart.fill" : "heart")
                                .font(.system(size: 15))
                                .foregroundColor(liked ? .red : .gray)
                            if likeCount > 0 {
                                Text("\(likeCount)")
                                    .font(.caption)
                                    .foregroundColor(liked ? .red : .gray)
                            }
                        }
                    }
                    .buttonStyle(.plain)

                    // Share button
                    ShareLink(item: shareText) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 15))
                            .foregroundColor(.gray)
                            .padding(.leading, 10)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(12)
        }
        .background(card)
        .cornerRadius(14)
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
        Task {
            do {
                let r = try await APIClient.shared.likeClimb(item.id)
                await MainActor.run { liked = r.liked; likeCount = r.count }
            } catch {
                await MainActor.run { liked = prev; likeCount += prev ? 1 : -1 }
            }
        }
    }
}
