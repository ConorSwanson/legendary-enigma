import SwiftUI

private let bg = Color(red: 3/255, green: 7/255, blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky = Color(red: 56/255, green: 189/255, blue: 248/255)

struct BadgeGridView: View {
    @State private var mountains: [Mountain] = []
    @State private var climbedIds: Set<Int> = []
    @State private var isLoading = true

    private let columns = [GridItem(.adaptive(minimum: 100, maximum: 150), spacing: 10)]

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

private struct BadgeCell: View {
    let mountain: Mountain
    let climbed: Bool

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(climbed ? sky.opacity(0.15) : Color(red: 31/255, green: 41/255, blue: 55/255))
                    .frame(width: 58, height: 58)

                Image(systemName: "mountain.2.fill")
                    .font(.system(size: 26))
                    .foregroundColor(climbed ? sky : .gray.opacity(0.25))
            }
            .overlay(
                Group {
                    if climbed {
                        Circle()
                            .strokeBorder(sky.opacity(0.5), lineWidth: 1.5)
                            .frame(width: 58, height: 58)
                    }
                }
            )

            Text(mountain.name)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(climbed ? .white : .gray.opacity(0.35))
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .frame(height: 28)

            Text("\(mountain.elevation.formatted())ft")
                .font(.system(size: 9))
                .foregroundColor(climbed ? emerald : .gray.opacity(0.3))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .padding(.horizontal, 6)
        .background(card)
        .cornerRadius(12)
        .opacity(climbed ? 1.0 : 0.45)
    }
}
