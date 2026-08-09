import SwiftUI
import UIKit
import PhotosUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

struct ClimbDetailView: View {
    let climbId: Int

    @State private var climb: Climb?
    @State private var error: String?
    @State private var liked = false
    @State private var likeCount = 0
    @State private var showEdit = false
    @State private var showDeleteConfirm = false
    @State private var showLikes = false
    @State private var badgeUIImage: UIImage?
    @State private var isSharingToInstagram = false
    @State private var ascentCount: Int = 0
    @State private var otherAscents: [Climb] = []
    @State private var comments: [Comment] = []
    @State private var newCommentText: String = ""
    @State private var isPostingComment = false
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var userState: UserState

    private var badgeURL: URL? {
        guard let climb else { return nil }
        return URL(string: "\(Config.apiBaseURL)/api/badges/\(climb.mountainId)/png?climbed=1")
    }

    private var shareText: String {
        guard let climb else { return "" }
        let base = "Summited \(climb.mountainName) (\(climb.elevation.formatted()) ft) on \(climb.climbDate.formattedClimbDate())! 🏔️ \(climb.elevation.summitHashtags)"
        return "\(base)\n\(Config.shareBaseURL)/s/\(climbId)"
    }

    private var shareURL: URL? { URL(string: "\(Config.shareBaseURL)/s/\(climbId)") }
    private var storyImageURL: URL? { URL(string: "\(Config.apiBaseURL)/api/og/climb/\(climbId)/story") }

    private func shareToInstagramStory() {
        guard let storyImageURL, let shareURL else { return }
        isSharingToInstagram = true
        Task {
            defer { isSharingToInstagram = false }
            guard let (data, _) = try? await URLSession.shared.data(from: storyImageURL),
                  let image = UIImage(data: data) else { return }
            InstagramShareHelper.shareStory(backgroundImage: image, linkURL: shareURL)
        }
    }

    var body: some View {
        GeometryReader { outerGeo in
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let climb {
                    ZStack(alignment: .topTrailing) {
                        Group {
                            if let urls = climb.photoUrls, urls.count > 1 {
                                TabView {
                                    ForEach(urls, id: \.self) { urlStr in
                                        if let url = URL(string: urlStr) {
                                            CachedAsyncImage(url: url) { img in
                                                img.resizable().aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                card
                                            }
                                            .frame(maxWidth: .infinity)
                                            .clipped()
                                        }
                                    }
                                }
                                .tabViewStyle(.page(indexDisplayMode: .always))
                                .indexViewStyle(.page(backgroundDisplayMode: .always))
                            } else if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
                                CachedAsyncImage(url: url) { img in
                                    img.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    card
                                }
                            } else {
                                MountainPlaceholder(mountainId: climb.mountainId)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 280)
                        .clipped()

                        PhotoCreditBadge(author: climb.photoIsDefault == true ? climb.photoCreditAuthor : nil)
                            .padding(10)
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        // Poster row → UserProfileView (hidden for your own climbs)
                        if climb.isOwner != true, let uid = climb.userId, let uname = climb.userName {
                            NavigationLink(destination: UserProfileView(userId: uid)) {
                                HStack(spacing: 10) {
                                    Group {
                                        if let urlStr = climb.userAvatarUrl, let url = URL(string: urlStr) {
                                            CachedAsyncImage(url: url) { img in
                                                img.resizable().aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                posterAvatarPlaceholder(uname)
                                            }
                                        } else {
                                            posterAvatarPlaceholder(uname)
                                        }
                                    }
                                    .frame(width: 36, height: 36)
                                    .clipShape(Circle())

                                    Text(uname)
                                        .font(.subheadline.bold())
                                        .foregroundColor(.white)
                                    Image(systemName: "chevron.right")
                                        .font(.caption2.bold())
                                        .foregroundColor(.gray.opacity(0.5))
                                    Spacer()
                                }
                            }
                            .buttonStyle(.plain)
                        }

                        // Title row with badge inline
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                NavigationLink(destination: MountainDetailView(mountainId: climb.mountainId, fallbackName: climb.mountainName)) {
                                    HStack(spacing: 5) {
                                        Text(climb.mountainName)
                                            .font(.title2.bold())
                                            .foregroundColor(.white)
                                            .multilineTextAlignment(.leading)
                                        Image(systemName: "chevron.right")
                                            .font(.caption.bold())
                                            .foregroundColor(.gray.opacity(0.5))
                                    }
                                }
                                .buttonStyle(.plain)
                                Text("\(climb.elevation.formatted()) ft")
                                    .font(.headline)
                                    .foregroundColor(emerald)
                                Text(climb.range)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                Text(climb.climbDate.formattedClimbDate())
                                    .font(.caption)
                                    .foregroundColor(Color(white: 0.6))
                                    .padding(.top, 2)
                            }
                            Spacer()
                            ZStack(alignment: .topTrailing) {
                                CachedAsyncImage(url: badgeURL) { img in
                                    img.resizable().aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    ProgressView().tint(emerald).frame(width: 140, height: 154)
                                }
                                if ascentCount > 1 {
                                    Text("×\(ascentCount)")
                                        .font(.system(size: 11, weight: .black, design: .rounded))
                                        .foregroundColor(Color(red: 3/255, green: 7/255, blue: 18/255))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 3)
                                        .background(emerald)
                                        .clipShape(Capsule())
                                        .padding(.top, 2)
                                        .padding(.trailing, 2)
                                }
                            }
                            .frame(width: 140)
                            .shadow(color: emerald.opacity(0.3), radius: 16)
                        }

                        // Notes
                        if let notes = climb.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.body)
                                .foregroundColor(Color(red: 209/255, green: 213/255, blue: 219/255))
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(card)
                                .cornerRadius(10)
                        }

                        // Action buttons
                        HStack(spacing: 16) {
                            if climb.isOwner == true {
                                iconButton(systemImage: "pencil", tint: .white) { showEdit = true }
                            }

                            likeControls

                            shareButton

                            if InstagramShareHelper.isInstagramInstalled {
                                instagramShareButton
                            }

                            Spacer()

                            if climb.isOwner == true {
                                iconButton(systemImage: "trash", tint: .red) { showDeleteConfirm = true }
                            }
                        }
                    }
                    .padding()

                    commentsSection

                    if !otherAscents.isEmpty {
                        otherAscentsSection
                    }

                } else if let error {
                    Text(error).foregroundColor(.red).padding()
                } else {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity, minHeight: 260)
                }
            }
            .frame(width: outerGeo.size.width, alignment: .leading)
        }
        .background(bg.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            "Delete this climb?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) { Task { await deleteClimb() } }
            Button("Cancel", role: .cancel) {}
        }
        .sheet(isPresented: $showEdit) {
            if let climb {
                LogClimbView(existingClimb: climb) { updated in
                    self.climb = updated
                    showEdit = false
                }
            }
        }
        .sheet(isPresented: $showLikes) {
            LikesListView(climbId: climbId)
        }
        .task { await load() }
        }
    }

    @ViewBuilder
    private var likeControls: some View {
        HStack(spacing: 8) {
            Button { toggleLike() } label: {
                Image(systemName: liked ? "heart.fill" : "heart")
                    .font(.system(size: 20))
                    .foregroundColor(liked ? .red : Color(white: 0.6))
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(20)
            }
            .buttonStyle(.plain)

            if likeCount > 0 {
                Button { showLikes = true } label: {
                    Text("\(likeCount) like\(likeCount == 1 ? "" : "s")")
                        .font(.caption.bold())
                        .foregroundColor(liked ? .red : Color(white: 0.5))
                        .underline()
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private var shareButton: some View {
        if let img = badgeUIImage {
            ShareLink(
                item: shareText,
                preview: SharePreview(climb?.mountainName ?? "Summit", image: Image(uiImage: img))
            ) {
                iconButtonLabel(systemImage: "square.and.arrow.up", tint: Color(white: 0.6))
            }
            .buttonStyle(.plain)
        } else {
            ShareLink(item: shareText) {
                iconButtonLabel(systemImage: "square.and.arrow.up", tint: Color(white: 0.6))
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private var instagramShareButton: some View {
        Button {
            shareToInstagramStory()
        } label: {
            Group {
                if isSharingToInstagram {
                    ProgressView().tint(Color(white: 0.6))
                } else {
                    Image(systemName: "camera.fill")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .symbolRenderingMode(.monochrome)
                        .foregroundStyle(instagramGradient)
                        .frame(width: 20, height: 20)
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(Color.white.opacity(0.08))
            .cornerRadius(20)
        }
        .buttonStyle(.plain)
        .disabled(isSharingToInstagram)
    }

    private func iconButton(systemImage: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            iconButtonLabel(systemImage: systemImage, tint: tint)
        }
        .buttonStyle(.plain)
    }

    private func posterAvatarPlaceholder(_ name: String) -> some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text(name.prefix(1).uppercased())
                    .font(.subheadline.bold())
                    .foregroundColor(sky)
            )
    }

    private func iconButtonLabel(systemImage: String, tint: Color) -> some View {
        Image(systemName: systemImage)
            .font(.system(size: 20))
            .foregroundColor(tint)
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(Color.white.opacity(0.08))
            .cornerRadius(20)
    }

    @ViewBuilder
    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Divider().background(Color.white.opacity(0.1))

            VStack(alignment: .leading, spacing: 12) {
                Text("Comments")
                    .font(.headline)
                    .foregroundColor(.white)

                if comments.isEmpty {
                    Text("No comments yet. Be the first!")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .padding(.vertical, 4)
                } else {
                    ForEach(comments) { comment in
                        CommentRow(comment: comment) {
                            Task { await deleteComment(comment) }
                        }
                    }
                }

                // New comment input
                HStack(spacing: 10) {
                    TextField("Add a comment…", text: $newCommentText, axis: .vertical)
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .tint(emerald)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(card)
                        .cornerRadius(20)
                        .lineLimit(1...4)

                    Button {
                        Task { await submitComment() }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(newCommentText.trimmingCharacters(in: .whitespaces).isEmpty ? Color(white: 0.3) : emerald)
                    }
                    .disabled(newCommentText.trimmingCharacters(in: .whitespaces).isEmpty || isPostingComment)
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private var otherAscentsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Divider().background(Color.white.opacity(0.1))

            VStack(alignment: .leading, spacing: 12) {
                Text("Other Ascents")
                    .font(.headline)
                    .foregroundColor(.white)

                ForEach(otherAscents) { ascent in
                    NavigationLink(destination: ClimbDetailView(climbId: ascent.id)) {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(ascent.climbDate.shortClimbDate())
                                    .font(.subheadline.bold())
                                    .foregroundColor(.white)
                                if let notes = ascent.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                        .lineLimit(1)
                                }
                            }
                            Spacer()
                            if ascent.photoUrl != nil {
                                Image(systemName: "photo")
                                    .font(.caption)
                                    .foregroundColor(.gray.opacity(0.5))
                            }
                            Image(systemName: "chevron.right")
                                .font(.caption2.bold())
                                .foregroundColor(.gray.opacity(0.4))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 11)
                        .background(card)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
    }

    private func submitComment() async {
        let text = newCommentText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        isPostingComment = true
        defer { isPostingComment = false }
        do {
            let created = try await APIClient.shared.postComment(climbId: climbId, body: text)
            newCommentText = ""
            comments.append(created)
        } catch {}
    }

    private func deleteComment(_ comment: Comment) async {
        guard comment.isOwner == true else { return }
        do {
            try await APIClient.shared.deleteComment(climbId: climbId, commentId: comment.id)
            comments.removeAll { $0.id == comment.id }
        } catch {}
    }

    private func load() async {
        do {
            async let c = APIClient.shared.climb(climbId)
            async let cs = APIClient.shared.comments(climbId: climbId)
            let (fetched, fetchedComments) = try await (c, cs)
            climb = fetched
            comments = fetchedComments
            liked = fetched.isLiked ?? false
            likeCount = fetched.likeCount ?? 0
            if fetched.isOwner == true {
                let ownAscents = (try? await APIClient.shared.climbs(mountainId: fetched.mountainId)) ?? []
                ascentCount = ownAscents.count
                otherAscents = ownAscents.filter { $0.id != climbId }
            }
            if let url = URL(string: "\(Config.apiBaseURL)/api/badges/\(fetched.mountainId)/png?climbed=1"),
               let (data, _) = try? await URLSession.shared.data(from: url) {
                badgeUIImage = UIImage(data: data)
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func toggleLike() {
        let prev = liked
        liked = !prev
        likeCount += prev ? -1 : 1
        postLikeChange()
        Task {
            do {
                let r = try await APIClient.shared.likeClimb(climbId)
                liked = r.liked
                likeCount = r.count
                postLikeChange()
            } catch {
                liked = prev
                likeCount += prev ? 1 : -1
                postLikeChange()
            }
        }
    }

    private func postLikeChange() {
        NotificationCenter.default.post(
            name: .climbLikeChanged, object: nil,
            userInfo: ["climbId": climbId, "liked": liked, "count": likeCount]
        )
    }

    private func deleteClimb() async {
        do {
            try await APIClient.shared.deleteClimb(climbId)
            NotificationCenter.default.post(name: .climbDeleted, object: climbId)
            userState.climbWasDeleted = true
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Deleted toast

struct DeletedToast: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(emerald)
            Text("Climb deleted")
                .font(.subheadline.bold())
                .foregroundColor(.white)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(Color(red: 17/255, green: 24/255, blue: 39/255))
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.4), radius: 10, y: 4)
    }
}

// MARK: - Comment Row

private let sky = Color(red: 56/255, green: 189/255, blue: 248/255)

struct CommentRow: View {
    let comment: Comment
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            NavigationLink(destination: UserProfileView(userId: comment.userId)) {
                Group {
                    if let urlStr = comment.userAvatarUrl, let url = URL(string: urlStr) {
                        CachedAsyncImage(url: url) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            avatarPlaceholder
                        }
                    } else {
                        avatarPlaceholder
                    }
                }
                .frame(width: 28, height: 28)
                .clipShape(Circle())
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    NavigationLink(destination: UserProfileView(userId: comment.userId)) {
                        Text(comment.userName)
                            .font(.caption.bold())
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    Text(comment.createdAt.shortNotifDate())
                        .font(.caption2)
                        .foregroundColor(.gray)
                    if comment.isOwner == true {
                        Button(action: onDelete) {
                            Image(systemName: "trash")
                                .font(.caption2)
                                .foregroundColor(.red.opacity(0.7))
                        }
                        .buttonStyle(.plain)
                    }
                }
                Text(comment.body)
                    .font(.subheadline)
                    .foregroundColor(Color(red: 209/255, green: 213/255, blue: 219/255))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.vertical, 4)
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text(comment.userName.prefix(1).uppercased())
                    .font(.caption2.bold())
                    .foregroundColor(sky)
            )
    }
}

// MARK: - Likes List

struct LikesListView: View {
    let climbId: Int
    @State private var users: [FollowerUser] = []
    @State private var isLoading = true
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().tint(.white)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if users.isEmpty {
                    Text("No likes yet")
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(users) { user in
                        NavigationLink(destination: UserProfileView(userId: user.id)) {
                            LikeRow(user: user)
                        }
                        .listRowBackground(card)
                    }
                    .listStyle(.plain)
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Liked by")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("Done") { dismiss() })
        }
        .task { await load() }
    }

    private func load() async {
        do { users = try await APIClient.shared.climbLikes(climbId) } catch {}
        isLoading = false
    }
}

private struct LikeRow: View {
    let user: FollowerUser

    var body: some View {
        HStack(spacing: 10) {
            Group {
                if let urlStr = user.avatarUrl, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        avatarPlaceholder
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 36, height: 36)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(user.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                if let bio = user.bio, !bio.isEmpty {
                    Text(bio)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text(user.name.prefix(1).uppercased())
                    .font(.caption.bold())
                    .foregroundColor(sky)
            )
    }
}
