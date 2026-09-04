import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

struct WishlistView: View {
    @State private var peaks: [WishlistPeak] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView().tint(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if peaks.isEmpty {
                emptyState
            } else {
                List {
                    ForEach(peaks) { peak in
                        NavigationLink(destination: MountainDetailView(mountainId: peak.id, fallbackName: peak.name)) {
                            WishlistRow(peak: peak)
                        }
                        .listRowBackground(card)
                        .listRowSeparatorTint(Color(white: 0.15))
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await remove(peak) }
                            } label: {
                                Label("Remove", systemImage: "bookmark.slash")
                            }
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle("Wishlist")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "bookmark")
                .font(.system(size: 44))
                .foregroundColor(.gray.opacity(0.4))
            Text("No peaks yet")
                .font(.headline)
                .foregroundColor(.white)
            Text("Tap the bookmark icon on any peak, climb, or badge to add it here.")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func load() async {
        peaks = (try? await APIClient.shared.wishlist()) ?? []
        isLoading = false
    }

    private func remove(_ peak: WishlistPeak) async {
        peaks.removeAll { $0.id == peak.id }
        try? await APIClient.shared.removeFromWishlist(mountainId: peak.id)
    }
}

private struct WishlistRow: View {
    let peak: WishlistPeak

    private var locationLabel: String {
        guard let state = peak.state, state != peak.range else { return peak.range }
        return "\(peak.range) · \(state)"
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "bookmark.fill")
                .foregroundColor(emerald)
                .font(.subheadline)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(peak.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                Text("\(peak.elevation.formatted()) FT · \(locationLabel.uppercased())")
                    .font(.caption2.bold())
                    .foregroundColor(.gray)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
