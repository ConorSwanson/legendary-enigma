import SwiftUI

private let bg = Color(red: 3/255, green: 7/255, blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

struct HistoryView: View {
    @State private var climbs: [Climb] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var showDeletedToast = false
    @State private var deepLinkClimbId: Int?
    @State private var isDeepLinkActive = false
    @EnvironmentObject var userState: UserState

    var body: some View {
        NavigationView {
            Group {
                if isLoading && climbs.isEmpty {
                    ProgressView().tint(.white)
                } else if let error {
                    VStack {
                        Text(error).foregroundColor(.red).padding()
                        Spacer()
                    }
                } else if climbs.isEmpty {
                    VStack {
                        Spacer()
                        Image(systemName: "mountain.2")
                            .font(.system(size: 48))
                            .foregroundColor(.gray.opacity(0.4))
                            .padding(.bottom, 8)
                        Text("No climbs yet")
                            .foregroundColor(.gray)
                        Spacer()
                    }
                } else {
                    List(climbs) { climb in
                        NavigationLink(destination: ClimbDetailView(climbId: climb.id)) {
                            ClimbRow(climb: climb)
                        }
                        .listRowBackground(card)
                        .listRowSeparatorTint(Color(red: 31/255, green: 41/255, blue: 55/255))
                    }
                    .listStyle(.plain)
                    .background(bg)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("My Climbs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { HeaderAvatar() }
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    NotificationBellButton()
                    Button { Task { await load() } } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .overlay(alignment: .bottom) {
                if showDeletedToast {
                    DeletedToast()
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .padding(.bottom, 16)
                }
            }
            .background(
                NavigationLink(
                    isActive: $isDeepLinkActive,
                    destination: {
                        if let id = deepLinkClimbId {
                            ClimbDetailView(climbId: id)
                        }
                    },
                    label: { EmptyView() }
                )
            )
        }
        .task { await load() }
        .onChange(of: userState.pendingClimbId) { newValue in
            guard let id = newValue else { return }
            userState.pendingClimbId = nil
            deepLinkClimbId = id
            isDeepLinkActive = true
        }
        .onChange(of: userState.climbWasDeleted) { newValue in
            guard newValue else { return }
            userState.climbWasDeleted = false
            Task { await load() }
            withAnimation(.spring(response: 0.3)) { showDeletedToast = true }
            Task {
                try? await Task.sleep(nanoseconds: 2_500_000_000)
                withAnimation(.easeOut(duration: 0.3)) { showDeletedToast = false }
            }
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        climbs = (try? await APIClient.shared.climbs()) ?? []
    }
}

struct ClimbRow: View {
    let climb: Climb

    var body: some View {
        HStack(spacing: 12) {
            if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
                CachedAsyncImage(url: url) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(red: 31/255, green: 41/255, blue: 55/255)
                }
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(red: 31/255, green: 41/255, blue: 55/255))
                    Image(systemName: "mountain.2.fill")
                        .foregroundColor(.gray.opacity(0.4))
                }
                .frame(width: 56, height: 56)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(climb.mountainName)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                Text("\(climb.elevation.formatted()) ft · \(climb.range)")
                    .font(.caption)
                    .foregroundColor(emerald)
                Text(climb.climbDate.shortClimbDate())
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}
