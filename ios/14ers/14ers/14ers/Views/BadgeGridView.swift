import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let dimCard = Color(red: 31/255, green: 41/255, blue: 55/255)

struct BadgeGridView: View {
    @State private var mountains: [Mountain] = []
    @State private var climbedIds: Set<Int>  = []
    @State private var isLoading = true

    private let columns = [GridItem(.adaptive(minimum: 110, maximum: 160), spacing: 10)]

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView().tint(.white).padding(.top, 60)
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("\(climbedIds.count) of \(mountains.count) summited")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                        Spacer()
                        ProgressView(
                            value: mountains.isEmpty ? 0 : Double(climbedIds.count) / Double(mountains.count)
                        )
                        .tint(sky)
                        .frame(width: 100)
                    }
                    .padding(.horizontal)

                    LazyVGrid(columns: columns, spacing: 10) {
                        ForEach(mountains) { mountain in
                            BadgeCell(
                                mountain: mountain,
                                climbed: climbedIds.contains(mountain.id)
                            )
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.top)
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle("Badge Collection")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        async let ms = APIClient.shared.mountains()
        async let st = APIClient.shared.stats()
        if let (fetchedMountains, stats) = try? await (ms, st) {
            mountains = fetchedMountains.sorted { $0.elevation > $1.elevation }
            climbedIds = Set(stats.climbedIds)
        }
        isLoading = false
    }
}

// MARK: - Badge Cell (native SwiftUI — no WKWebView)

struct BadgeCell: View {
    let mountain: Mountain
    let climbed: Bool

    var body: some View {
        ZStack(alignment: .topTrailing) {
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: climbed
                            ? [emerald.opacity(0.22), Color(red: 14/255, green: 55/255, blue: 38/255)]
                            : [dimCard, card],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            VStack(spacing: 5) {
                Spacer()
                Image(systemName: climbed ? "mountain.2.fill" : "mountain.2")
                    .font(.system(size: 26))
                    .foregroundColor(climbed ? emerald : .gray.opacity(0.3))
                Text(mountain.name)
                    .font(.caption.bold())
                    .foregroundColor(climbed ? .white : .gray)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Text("\(mountain.elevation.formatted()) ft")
                    .font(.caption2)
                    .foregroundColor(climbed ? emerald.opacity(0.75) : .gray.opacity(0.45))
                Spacer()
            }
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity)

            if climbed {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(emerald)
                    .padding(6)
            }
        }
        .frame(height: 132)
    }
}
