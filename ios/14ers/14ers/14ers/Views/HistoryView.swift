import SwiftUI

private let bg = Color(red: 3/255, green: 7/255, blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

/// Full climb history, pushed from the Profile tab's "See All".
struct ClimbHistoryView: View {
    @State private var climbs: [Climb] = []
    @State private var isLoading = false

    var body: some View {
        Group {
            if isLoading && climbs.isEmpty {
                ProgressView().tint(.white).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if climbs.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "mountain.2")
                        .font(.system(size: 48))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("No climbs yet").foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(climbs) { climb in
                            ClimbRow(climb: climb)
                        }
                    }
                    .padding()
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle("My Climbs")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        climbs = (try? await APIClient.shared.climbs()) ?? []
    }
}

/// Row where the whole card opens the climb, but the mountain name opens the
/// mountain detail (sibling links — no nesting).
struct ClimbRow: View {
    let climb: Climb

    var body: some View {
        HStack(spacing: 12) {
            NavigationLink(destination: ClimbDetailView(climbId: climb.id)) {
                photoThumb
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 3) {
                NavigationLink(destination: MountainDetailView(mountainId: climb.mountainId, fallbackName: climb.mountainName)) {
                    Text(climb.mountainName)
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                }
                .buttonStyle(.plain)
                Text("\(climb.elevation.formatted()) ft · \(climb.range)")
                    .font(.caption)
                    .foregroundColor(emerald)
                Text(climb.climbDate.shortClimbDate())
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            NavigationLink(destination: ClimbDetailView(climbId: climb.id)) {
                Image(systemName: "chevron.right")
                    .font(.caption2.bold())
                    .foregroundColor(.gray.opacity(0.4))
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(card)
        .cornerRadius(12)
    }

    @ViewBuilder
    private var photoThumb: some View {
        if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
            CachedAsyncImage(url: url) { img in
                img.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color(red: 31/255, green: 41/255, blue: 55/255)
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        } else {
            MountainPlaceholder(mountainId: climb.mountainId)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
