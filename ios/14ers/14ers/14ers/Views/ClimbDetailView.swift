import SwiftUI
import UIKit

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

struct ClimbDetailView: View {
    let climbId: Int

    @State private var climb: Climb?
    @State private var mountains: [Mountain] = []
    @State private var error: String?
    @State private var liked = false
    @State private var likeCount = 0
    @State private var showEdit = false
    @State private var showDeleteConfirm = false
    @State private var badgeUIImage: UIImage?
    @State private var comments: [Comment] = []
    @State private var newCommentText: String = ""
    @State private var isPostingComment = false
    @Environment(\.dismiss) private var dismiss

    private var badgeURL: URL? {
        guard let climb else { return nil }
        return URL(string: "\(Config.apiBaseURL)/api/badges/\(climb.mountainId)/png?climbed=1")
    }

    private var shareText: String {
        guard let climb else { return "" }
        let base = "Summited \(climb.mountainName) (\(climb.elevation.formatted()) ft) on \(climb.climbDate.formattedClimbDate())! 🏔️ #Colorado14ers #14ers"
        return "\(base)\n\(Config.apiBaseURL)/s/\(climbId)"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let climb {
                    if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
                        AsyncImage(url: url) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            card
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 280)
                        .clipped()
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        // Title row with badge inline
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(climb.mountainName)
                                    .font(.title2.bold())
                                    .foregroundColor(.white)
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
                            AsyncImage(url: badgeURL) { phase in
                                switch phase {
                                case .success(let img):
                                    img.resizable().aspectRatio(contentMode: .fit)
                                default:
                                    ProgressView().tint(emerald).frame(width: 140, height: 154)
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

                            Button { toggleLike() } label: {
                                likeIcon
                            }
                            .buttonStyle(.plain)

                            shareButton

                            Spacer()

                            if climb.isOwner == true {
                                iconButton(systemImage: "trash", tint: .red) { showDeleteConfirm = true }
                            }
                        }
                    }
                    .padding()

                    commentsSection

                } else if let error {
                    Text(error).foregroundColor(.red).padding()
                } else {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity, minHeight: 260)
                }
            }
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
                EditClimbView(climb: climb, mountains: mountains) { updated in
                    self.climb = updated
                    showEdit = false
                }
            }
        }
        .task { await load() }
    }

    @ViewBuilder
    private var likeIcon: some View {
        HStack(spacing: 5) {
            Image(systemName: liked ? "heart.fill" : "heart")
                .font(.system(size: 20))
                .foregroundColor(liked ? .red : Color(white: 0.6))
            if likeCount > 0 {
                Text("\(likeCount)")
                    .font(.caption.bold())
                    .foregroundColor(liked ? .red : Color(white: 0.6))
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.white.opacity(0.08))
        .cornerRadius(20)
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

    private func iconButton(systemImage: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            iconButtonLabel(systemImage: systemImage, tint: tint)
        }
        .buttonStyle(.plain)
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
            async let ms = APIClient.shared.mountains()
            async let cs = APIClient.shared.comments(climbId: climbId)
            let (fetched, fetchedMountains, fetchedComments) = try await (c, ms, cs)
            climb = fetched
            mountains = fetchedMountains
            comments = fetchedComments
            liked = fetched.isLiked ?? false
            likeCount = fetched.likeCount ?? 0
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
        Task {
            do {
                let r = try await APIClient.shared.likeClimb(climbId)
                liked = r.liked
                likeCount = r.count
            } catch {
                liked = prev
                likeCount += prev ? 1 : -1
            }
        }
    }

    private func deleteClimb() async {
        do {
            try await APIClient.shared.deleteClimb(climbId)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Comment Row

private let sky = Color(red: 56/255, green: 189/255, blue: 248/255)

struct CommentRow: View {
    let comment: Comment
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Group {
                if let urlStr = comment.userAvatarUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        if let img = phase.image { img.resizable().aspectRatio(contentMode: .fill) }
                        else { avatarPlaceholder }
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 28, height: 28)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(comment.userName)
                        .font(.caption.bold())
                        .foregroundColor(.white)
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

// MARK: - Edit Climb

struct EditClimbView: View {
    let climb: Climb
    let mountains: [Mountain]
    let onSave: (Climb) -> Void

    @State private var mountainId: Int
    @State private var date: Date
    @State private var notes: String
    @State private var visibility: String
    @State private var isSaving = false
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss

    init(climb: Climb, mountains: [Mountain], onSave: @escaping (Climb) -> Void) {
        self.climb = climb
        self.mountains = mountains
        self.onSave = onSave
        _mountainId = State(initialValue: climb.mountainId)
        let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
        _date = State(initialValue: fmt.date(from: climb.climbDate) ?? Date())
        _notes = State(initialValue: climb.notes ?? "")
        _visibility = State(initialValue: climb.visibility)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Peak") {
                    Picker("Mountain", selection: $mountainId) {
                        ForEach(mountains) { m in
                            Text("\(m.name) — \(m.elevation.formatted()) ft").tag(m.id)
                        }
                    }
                }
                Section("Date") {
                    DatePicker("Date", selection: $date, in: ...Date(), displayedComponents: .date)
                }
                Section("Notes") {
                    TextEditor(text: $notes).frame(minHeight: 80)
                }
                Section("Visibility") {
                    Picker("Visibility", selection: $visibility) {
                        Text("Public").tag("public")
                        Text("Followers").tag("followers")
                        Text("Private").tag("private")
                    }
                    .pickerStyle(.segmented)
                }
                if let error {
                    Section { Text(error).foregroundColor(.red).font(.caption) }
                }
            }
            .navigationTitle("Edit Climb")
            .navigationBarItems(
                leading: Button("Cancel") { dismiss() },
                trailing: Button(isSaving ? "Saving…" : "Save") {
                    Task { await save() }
                }
                .disabled(isSaving)
            )
        }
    }

    private func save() async {
        isSaving = true
        error = nil
        defer { isSaving = false }
        let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
        do {
            let updated = try await APIClient.shared.updateClimb(
                climb.id,
                mountainId: mountainId,
                date: fmt.string(from: date),
                notes: notes,
                visibility: visibility
            )
            onSave(updated)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
