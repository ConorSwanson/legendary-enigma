import SwiftUI

private let bg = Color(red: 3/255, green: 7/255, blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky = Color(red: 56/255, green: 189/255, blue: 248/255)

struct DashboardView: View {
    @State private var stats: Stats?
    @State private var error: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let error {
                        Text(error)
                            .foregroundColor(.red)
                            .padding()
                    } else if let stats {
                        LazyVGrid(
                            columns: [GridItem(.flexible()), GridItem(.flexible())],
                            spacing: 12
                        ) {
                            StatCard(title: "Total Climbs", value: "\(stats.totalClimbs)")
                            StatCard(title: "Unique Peaks", value: "\(stats.uniquePeaks)")
                            StatCard(
                                title: "Elevation Gained",
                                value: "\(stats.totalElevation.formatted())ft"
                            )
                            StatCard(title: "Total Mountains", value: "\(stats.totalMountains)")
                        }

                        if !stats.recentClimbs.isEmpty {
                            Text("Recent Climbs")
                                .font(.headline)
                                .foregroundColor(.white)

                            ForEach(stats.recentClimbs) { climb in
                                RecentClimbRow(climb: climb)
                            }
                        }
                    } else {
                        ForEach(0..<4, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 12)
                                .fill(card)
                                .frame(height: 72)
                        }
                    }
                }
                .padding()
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Dashboard")
        }
        .task {
            do {
                stats = try await APIClient.shared.stats()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

private struct StatCard: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.title2.bold())
                .foregroundColor(.white)
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(card)
        .cornerRadius(12)
    }
}

private struct RecentClimbRow: View {
    let climb: RecentClimb

    var body: some View {
        HStack {
            if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
                CachedAsyncImage(url: url) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    card
                }
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
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
}
