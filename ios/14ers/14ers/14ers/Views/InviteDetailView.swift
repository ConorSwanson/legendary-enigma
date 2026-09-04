import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

struct InviteDetailView: View {
    let inviteId: Int

    @Environment(\.dismiss) private var dismiss
    @State private var invite: ClimbInvite?
    @State private var isLoading = true
    @State private var isResponding = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if let invite {
                    content(invite)
                } else if isLoading {
                    ProgressView().tint(.white).frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Text(errorMessage ?? "This invite is no longer available.")
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Climb Invite")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
        }
        .task { await load() }
    }

    private func load() async {
        do {
            invite = try await APIClient.shared.invite(inviteId)
        } catch {
            errorMessage = "This invite is no longer available."
        }
        isLoading = false
    }

    @ViewBuilder
    private func content(_ invite: ClimbInvite) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                whoCard(invite)
                peakCard(invite)
                if let note = invite.note, !note.isEmpty {
                    Text("\u{201C}\(note)\u{201D}")
                        .font(.subheadline.italic())
                        .foregroundColor(Color(white: 0.75))
                        .padding(.leading, 12)
                        .overlay(alignment: .leading) {
                            Rectangle().fill(Color(white: 0.2)).frame(width: 2)
                        }
                }

                if !invite.isInviter {
                    responseSection(invite)
                } else if !invite.recipients.isEmpty {
                    rosterSection(invite)
                }

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
            }
            .padding()
        }
    }

    private func whoCard(_ invite: ClimbInvite) -> some View {
        HStack(spacing: 10) {
            Group {
                if let urlStr = invite.inviterAvatarUrl, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: { avatarPlaceholder(invite.inviterName ?? "?") }
                } else {
                    avatarPlaceholder(invite.inviterName ?? "?")
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                (Text(invite.inviterName ?? "Someone").bold().foregroundColor(sky)
                 + Text(" wants to climb").foregroundColor(.white))
                    .font(.subheadline)
                Text(invite.mountainName ?? "a peak")
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
            }
            Spacer()
        }
    }

    private func peakCard(_ invite: ClimbInvite) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(invite.mountainName ?? "Peak").font(.headline).foregroundColor(.white)
                    if let elev = invite.mountainElevation {
                        Text("\(elev.formatted()) FT")
                            .font(.caption2.bold())
                            .foregroundColor(.gray)
                    }
                }
                Spacer()
            }
            Divider().background(Color(white: 0.15))
            HStack(spacing: 6) {
                Image(systemName: invite.climbDate != nil ? "calendar" : "clock")
                    .font(.caption)
                if let dateStr = invite.climbDate, let d = Self.parseDate(dateStr) {
                    Text(d.formatted(date: .abbreviated, time: .omitted)).bold()
                } else {
                    Text("No date yet — just floating the idea")
                }
            }
            .font(.caption)
            .foregroundColor(invite.climbDate != nil ? emerald : .gray)
        }
        .padding(14)
        .background(card)
        .cornerRadius(14)
    }

    @ViewBuilder
    private func responseSection(_ invite: ClimbInvite) -> some View {
        if let status = invite.myStatus, status != "pending" {
            statusBanner(status)
        } else {
            VStack(spacing: 8) {
                Button { Task { await respond("accepted") } } label: {
                    respondLabel("Accept", filled: true)
                }
                .buttonStyle(.plain)
                HStack(spacing: 8) {
                    Button { Task { await respond("maybe") } } label: {
                        respondLabel("Maybe", filled: false)
                    }
                    .buttonStyle(.plain)
                    Button { Task { await respond("declined") } } label: {
                        respondLabel("Decline", filled: false, tint: .gray)
                    }
                    .buttonStyle(.plain)
                }
            }
            .disabled(isResponding)
            .opacity(isResponding ? 0.6 : 1)
        }
    }

    private func respondLabel(_ text: String, filled: Bool, tint: Color = sky) -> some View {
        Text(text).bold()
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(filled ? emerald : card)
            .foregroundColor(filled ? bg : tint)
            .cornerRadius(13)
    }

    private func statusBanner(_ status: String) -> some View {
        let (icon, text, color): (String, String, Color) = {
            switch status {
            case "accepted": return ("checkmark.seal.fill", "You're in — this peak is on your Wishlist", emerald)
            case "declined": return ("xmark.circle.fill", "You declined this invite", .gray)
            default: return ("questionmark.circle.fill", "You said maybe", sky)
            }
        }()
        return HStack(spacing: 8) {
            Image(systemName: icon).foregroundColor(color)
            Text(text).font(.subheadline.bold()).foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 13)
        .background(color.opacity(0.12))
        .cornerRadius(13)
    }

    private func rosterSection(_ invite: ClimbInvite) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("WHO'S IN").font(.caption2.bold()).foregroundColor(.gray).tracking(1)
            VStack(spacing: 1) {
                ForEach(invite.recipients) { r in
                    HStack {
                        Text(r.userName).font(.subheadline).foregroundColor(.white)
                        Spacer()
                        Text(r.status.capitalized)
                            .font(.caption.bold())
                            .foregroundColor(r.status == "accepted" ? emerald : .gray)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(card)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func avatarPlaceholder(_ name: String) -> some View {
        Circle().fill(sky.opacity(0.2)).overlay(
            Text(name.prefix(1).uppercased()).font(.caption.bold()).foregroundColor(sky)
        )
    }

    private func respond(_ status: String) async {
        isResponding = true
        errorMessage = nil
        defer { isResponding = false }
        do {
            invite = try await APIClient.shared.respondToInvite(inviteId, status: status)
        } catch {
            errorMessage = "Couldn't send your response. Try again."
        }
    }

    private static func parseDate(_ s: String) -> Date? {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: s)
    }
}
