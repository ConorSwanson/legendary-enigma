import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

struct InviteToClimbView: View {
    let mountainId: Int
    let mountainName: String
    let mountainElevation: Int
    let mountainRange: String

    @Environment(\.dismiss) private var dismiss

    @State private var hasDate = false
    @State private var date = Date()
    @State private var note = ""
    @State private var searchQuery = ""
    @State private var following: [FollowerUser] = []
    @State private var searchResults: [FollowerUser] = []
    @State private var selectedIds: Set<Int> = []
    @State private var wantsLink = false
    @State private var isSending = false
    @State private var errorMessage: String?
    @State private var sentInvite: ClimbInvite?

    private var people: [FollowerUser] {
        searchQuery.trimmingCharacters(in: .whitespaces).isEmpty ? following : searchResults
    }

    private var shareURL: URL? {
        guard let token = sentInvite?.shareToken else { return nil }
        return URL(string: "\(Config.shareBaseURL)/i/\(token)")
    }

    private var shareText: String {
        guard let url = shareURL else { return "" }
        return "Want to climb \(mountainName) with me? \(url.absoluteString)"
    }

    var body: some View {
        NavigationStack {
            Group {
                if let sentInvite {
                    confirmation(sentInvite)
                } else {
                    form
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Invite to Climb")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(sentInvite == nil ? "Cancel" : "Done") { dismiss() }
                }
            }
        }
        .task { await loadFollowing() }
        .onChange(of: searchQuery) { _ in
            Task { await search() }
        }
    }

    // MARK: - Form

    @ViewBuilder
    private var form: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                peakChip

                linkButton

                VStack(alignment: .leading, spacing: 8) {
                    fieldLabel("When")
                    dateRow
                }

                VStack(alignment: .leading, spacing: 8) {
                    fieldLabel("Also Notify On Switchback")
                    searchField
                    if people.isEmpty {
                        Text(searchQuery.isEmpty ? "You're not following anyone yet — search by name." : "No one found.")
                            .font(.caption)
                            .foregroundColor(.gray)
                            .padding(.vertical, 6)
                    } else {
                        VStack(spacing: 7) {
                            ForEach(people) { person in personRow(person) }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    fieldLabel("Note (optional)")
                    TextField("Add a message…", text: $note, axis: .vertical)
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .tint(emerald)
                        .padding(12)
                        .background(card)
                        .cornerRadius(12)
                        .lineLimit(1...4)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }

                Button { Task { await send() } } label: {
                    HStack {
                        if isSending { ProgressView().tint(bg) }
                        Text(sendLabel).bold()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background((selectedIds.isEmpty && !wantsLink) ? Color(white: 0.2) : emerald)
                    .foregroundColor(bg)
                    .cornerRadius(14)
                }
                .buttonStyle(.plain)
                .disabled(isSending || (selectedIds.isEmpty && !wantsLink))
            }
            .padding()
        }
    }

    private var sendLabel: String {
        if selectedIds.isEmpty { return "Send Invite" }
        return "Send Invite · \(selectedIds.count) \(selectedIds.count == 1 ? "person" : "people")"
    }

    private var peakChip: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 8)
                .fill(LinearGradient(colors: [Color(white: 0.15), Color(white: 0.06)], startPoint: .top, endPoint: .bottom))
                .frame(width: 34, height: 34)
            VStack(alignment: .leading, spacing: 1) {
                Text(mountainName).font(.subheadline.bold()).foregroundColor(.white)
                Text("\(mountainElevation.formatted()) FT · \(mountainRange.uppercased())")
                    .font(.caption2.bold())
                    .foregroundColor(.gray)
            }
            Spacer()
        }
        .padding(11)
        .background(card)
        .cornerRadius(12)
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption2.bold())
            .foregroundColor(Color(white: 0.4))
            .tracking(1)
    }

    private var dateRow: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.spring(response: 0.3)) { hasDate.toggle() }
            } label: {
                HStack {
                    HStack(spacing: 9) {
                        Image(systemName: hasDate ? "checkmark.circle.fill" : "plus.circle")
                            .foregroundColor(hasDate ? emerald : Color(white: 0.4))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(hasDate ? date.formatted(date: .abbreviated, time: .omitted) : "No date yet")
                                .font(.subheadline.bold())
                                .foregroundColor(hasDate ? emerald : Color(white: 0.85))
                            if !hasDate {
                                Text("That's OK — just floating the idea")
                                    .font(.caption2)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    Spacer()
                    Text(hasDate ? "Clear" : "Add")
                        .font(.caption.bold())
                        .foregroundColor(hasDate ? .gray : sky)
                }
                .padding(12)
                .background(card)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)

            if hasDate {
                DatePicker("", selection: $date, in: Date()..., displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(emerald)
                    .colorScheme(.dark)
                    .padding(.top, 8)
            }
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundColor(.gray)
            TextField("Search people you follow…", text: $searchQuery)
                .foregroundColor(.white)
                .tint(emerald)
                .autocorrectionDisabled()
        }
        .padding(11)
        .background(card)
        .cornerRadius(12)
    }

    private func personRow(_ person: FollowerUser) -> some View {
        let isOn = selectedIds.contains(person.id)
        return Button {
            if isOn { selectedIds.remove(person.id) } else { selectedIds.insert(person.id) }
        } label: {
            HStack(spacing: 10) {
                Group {
                    if let urlStr = person.avatarUrl, let url = URL(string: urlStr) {
                        CachedAsyncImage(url: url) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: { avatarPlaceholder(person) }
                    } else {
                        avatarPlaceholder(person)
                    }
                }
                .frame(width: 30, height: 30)
                .clipShape(Circle())

                Text(person.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                Spacer()
                ZStack {
                    Circle().stroke(isOn ? emerald : Color(white: 0.3), lineWidth: 1.4).frame(width: 21, height: 21)
                    if isOn {
                        Circle().fill(emerald).frame(width: 21, height: 21)
                        Image(systemName: "checkmark").font(.system(size: 10, weight: .black)).foregroundColor(bg)
                    }
                }
            }
            .padding(9)
            .background(card)
            .cornerRadius(11)
        }
        .buttonStyle(.plain)
    }

    private func avatarPlaceholder(_ person: FollowerUser) -> some View {
        Circle().fill(sky.opacity(0.2)).overlay(
            Text(person.name.prefix(1).uppercased()).font(.caption2.bold()).foregroundColor(sky)
        )
    }

    private var linkButton: some View {
        Button {
            withAnimation(.spring(response: 0.3)) { wantsLink.toggle() }
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(wantsLink ? emerald : sky.opacity(0.15)).frame(width: 34, height: 34)
                    Image(systemName: "link")
                        .font(.subheadline.bold())
                        .foregroundColor(wantsLink ? bg : sky)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text("Get a Shareable Link")
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                    Text("For friends who aren't on Switchback yet")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
                Spacer()
                Image(systemName: wantsLink ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(wantsLink ? emerald : Color(white: 0.3))
            }
            .padding(13)
            .background(wantsLink ? emerald.opacity(0.14) : card)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(wantsLink ? emerald.opacity(0.5) : Color.clear, lineWidth: 1.3)
            )
            .cornerRadius(14)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Confirmation

    @ViewBuilder
    private func confirmation(_ invite: ClimbInvite) -> some View {
        VStack(spacing: 18) {
            Spacer(minLength: 20)
            Image(systemName: "paperplane.circle.fill")
                .font(.system(size: 52))
                .foregroundColor(emerald)
            Text(invite.recipients.isEmpty ? "Link ready to share" : "Invite sent!")
                .font(.title3.bold())
                .foregroundColor(.white)
            if !invite.recipients.isEmpty {
                Text("\(invite.recipients.count) \(invite.recipients.count == 1 ? "person" : "people") will get a notification.")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }

            if let shareURL {
                ShareLink(item: shareText) {
                    HStack {
                        Image(systemName: "square.and.arrow.up")
                        Text("Share Invite Link").bold()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(card)
                    .foregroundColor(sky)
                    .cornerRadius(14)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 24)
                .padding(.top, 6)
            }

            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Networking

    private func loadFollowing() async {
        guard let me = try? await APIClient.shared.myProfile() else { return }
        following = (try? await APIClient.shared.following(me.id)) ?? []
    }

    private func search() async {
        let q = searchQuery.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        searchResults = (try? await APIClient.shared.searchUsers(q)) ?? []
    }

    private func send() async {
        isSending = true
        errorMessage = nil
        defer { isSending = false }
        do {
            let dateString: String? = hasDate ? Self.dateFormatter.string(from: date) : nil
            let invite = try await APIClient.shared.createInvite(
                mountainId: mountainId,
                climbDate: dateString,
                note: note.trimmingCharacters(in: .whitespaces).isEmpty ? nil : note,
                recipientUserIds: Array(selectedIds),
                generateLink: wantsLink
            )
            sentInvite = invite
        } catch let e as APIError {
            errorMessage = e.errorDescription
        } catch {
            errorMessage = "Couldn't send the invite. Try again."
        }
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
}
