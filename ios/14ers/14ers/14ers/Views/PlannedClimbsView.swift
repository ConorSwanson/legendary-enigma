import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

/// Everything to do with climbs you've invited people on or been invited
/// to -- the "can I see who accepted?" answer that previously only lived
/// in a notification you might have already swiped away. Reachable from
/// Profile any time, not just off a fresh response.
struct PlannedClimbsView: View {
    @State private var sent: [ClimbInvite] = []
    @State private var received: [ClimbInvite] = []
    @State private var isLoading = true
    @State private var selectedInviteId: Int?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().tint(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if sent.isEmpty && received.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        if !received.isEmpty {
                            section(title: "Invited You") {
                                ForEach(received) { invite in
                                    ReceivedInviteRow(invite: invite) { selectedInviteId = invite.id }
                                }
                            }
                        }
                        if !sent.isEmpty {
                            section(title: "You Invited") {
                                ForEach(sent) { invite in
                                    SentInviteRow(invite: invite) { selectedInviteId = invite.id }
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle("Planned Climbs")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedInviteId) { id in
            InviteDetailView(inviteId: id)
        }
        .onChange(of: selectedInviteId) { newValue in
            if newValue == nil { Task { await load() } }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 44))
                .foregroundColor(.gray.opacity(0.4))
            Text("No planned climbs yet")
                .font(.headline)
                .foregroundColor(.white)
            Text("Invite someone to climb from any peak's page, and invites you receive will show up here too.")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private func section<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption2.bold())
                .foregroundColor(.gray)
                .tracking(1)
            VStack(spacing: 8) { content() }
        }
    }

    private func load() async {
        isLoading = sent.isEmpty && received.isEmpty
        defer { isLoading = false }
        guard let mine = try? await APIClient.shared.myInvites() else { return }
        sent = mine.sent
        received = mine.received
    }
}

// MARK: - Rows

private func formattedInviteDate(_ dateStr: String?) -> String {
    guard let dateStr else { return "No date yet" }
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    guard let d = f.date(from: dateStr) else { return "No date yet" }
    let out = DateFormatter()
    out.dateFormat = "MMM d"
    return out.string(from: d)
}

private struct SentInviteRow: View {
    let invite: ClimbInvite
    let onTap: () -> Void

    private var accepted: Int { invite.recipients.filter { $0.status == "accepted" }.count }
    private var total: Int { invite.recipients.count }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(invite.mountainName ?? "Peak")
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                    Text(formattedInviteDate(invite.climbDate))
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                if total > 0 {
                    Text("\(accepted)/\(total) accepted")
                        .font(.caption.bold())
                        .foregroundColor(accepted > 0 ? emerald : .gray)
                } else {
                    Text("Link shared")
                        .font(.caption.bold())
                        .foregroundColor(sky)
                }
                Image(systemName: "chevron.right")
                    .font(.caption2.bold())
                    .foregroundColor(.gray.opacity(0.4))
            }
            .padding(14)
            .background(card)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

private struct ReceivedInviteRow: View {
    let invite: ClimbInvite
    let onTap: () -> Void

    private var statusColor: Color {
        switch invite.myStatus ?? "pending" {
        case "accepted": return emerald
        case "declined": return .gray
        case "maybe": return sky
        default: return sky
        }
    }

    private var statusLabel: String {
        switch invite.myStatus ?? "pending" {
        case "accepted": return "Accepted"
        case "declined": return "Declined"
        case "maybe": return "Maybe"
        default: return "Pending"
        }
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(invite.mountainName ?? "Peak")
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                    Text("\(invite.inviterName ?? "Someone") · \(formattedInviteDate(invite.climbDate))")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                Text(statusLabel)
                    .font(.caption.bold())
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(statusColor.opacity(0.15))
                    .clipShape(Capsule())
            }
            .padding(14)
            .background(card)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}
