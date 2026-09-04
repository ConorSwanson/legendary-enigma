import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

/// The full list behind the "Summits" / "Unique" numbers on the Profile
/// stats row -- both just open this, scoped to whichever year chip is
/// selected there. "Unique" doesn't get its own deduped view; tapping
/// either just surfaces the underlying climbs so you can actually see
/// what's behind the count.
struct MyClimbsListView: View {
    var year: String? = nil
    var title: String = "My Summits"

    @State private var climbs: [Climb] = []
    @State private var isLoading = true
    @State private var isLoadingMore = false
    @State private var canLoadMore = true
    @State private var page = 1
    @State private var selectedClimbId: Int?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().tint(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if climbs.isEmpty {
                Text("No summits logged\(year != nil ? " in \(year!)" : "") yet.")
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(climbs) { climb in
                            ClimbSummaryRow(climb: climb) { selectedClimbId = climb.id }
                                .onAppear {
                                    if climb.id == climbs.suffix(5).first?.id {
                                        Task { await loadMore() }
                                    }
                                }
                        }
                        if isLoadingMore {
                            ProgressView().tint(.white).padding(.vertical, 12)
                        }
                    }
                    .padding()
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $selectedClimbId) { id in
            ClimbDetailView(climbId: id)
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        page = 1
        canLoadMore = true
        climbs = (try? await APIClient.shared.climbs(year: year, page: 1)) ?? []
        if climbs.count < 50 { canLoadMore = false }
    }

    private func loadMore() async {
        guard !isLoadingMore, canLoadMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        let nextPage = page + 1
        let more = (try? await APIClient.shared.climbs(year: year, page: nextPage)) ?? []
        if more.isEmpty {
            canLoadMore = false
        } else {
            climbs.append(contentsOf: more)
            page = nextPage
            if more.count < 50 { canLoadMore = false }
        }
    }
}

private struct ClimbSummaryRow: View {
    let climb: Climb
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                photoThumb
                VStack(alignment: .leading, spacing: 3) {
                    Text(climb.mountainName)
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                    Text(climb.climbDate.shortClimbDate())
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                Text("\(climb.elevation.formatted())ft")
                    .font(.caption.bold())
                    .foregroundColor(emerald)
            }
            .padding()
            .background(card)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var photoThumb: some View {
        if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
            CachedAsyncImage(url: url) { img in
                img.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                RoundedRectangle(cornerRadius: 8).fill(card)
            }
            .frame(width: 48, height: 48)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        } else {
            MountainPlaceholder(mountainId: climb.mountainId)
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
