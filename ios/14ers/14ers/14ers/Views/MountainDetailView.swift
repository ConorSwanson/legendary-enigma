import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

struct MountainDetailView: View {
    let mountainId: Int
    var fallbackName: String? = nil

    @State private var detail: MountainDetail?
    @State private var error: String?

    private static let monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                hero
                if let d = detail {
                    VStack(alignment: .leading, spacing: 22) {
                        statRow(d)
                        if !d.byYear.isEmpty { byYearSection(d) }
                        if !d.byMonth.isEmpty { byMonthSection(d) }
                        if !d.recentPhotos.isEmpty { recentPhotosSection(d) }
                        if !d.recentSummits.isEmpty { recentSummitsSection(d) }
                        if d.totalClimbs == 0 { emptyState }
                    }
                    .padding()
                } else if error != nil {
                    Text(error ?? "").foregroundColor(.red).padding()
                } else {
                    ProgressView().tint(.white).frame(maxWidth: .infinity, minHeight: 200)
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle(detail?.name ?? fallbackName ?? "Mountain")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    // MARK: - Hero

    @ViewBuilder
    private var hero: some View {
        ZStack(alignment: .bottomLeading) {
            Group {
                if let urlStr = detail?.heroPhotoUrl, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        MountainPlaceholder(mountainId: mountainId)
                    }
                } else {
                    MountainPlaceholder(mountainId: mountainId)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 260)
            .clipped()

            LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .center, endPoint: .bottom)
                .frame(height: 260)
                .allowsHitTesting(false)

            VStack(alignment: .leading, spacing: 4) {
                if let d = detail {
                    HStack(spacing: 8) {
                        Text(d.name)
                            .font(.title.bold())
                            .foregroundColor(.white)
                        if d.isClimbed {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.title3)
                                .foregroundColor(emerald)
                        }
                    }
                    Text("\(d.elevation.formatted()) ft · \(d.range)")
                        .font(.subheadline.bold())
                        .foregroundColor(emerald)
                }
            }
            .padding()
        }
    }

    // MARK: - Stats

    private func statRow(_ d: MountainDetail) -> some View {
        HStack(spacing: 0) {
            statCell(value: "\(d.totalClimbs)", label: "Summits")
            Divider().frame(height: 34).background(Color.white.opacity(0.1))
            statCell(value: "\(d.uniqueClimbers)", label: "Climbers")
            Divider().frame(height: 34).background(Color.white.opacity(0.1))
            statCell(value: "\(d.userAscents)", label: "Your Ascents")
        }
        .padding(.vertical, 14)
        .background(card)
        .cornerRadius(12)
    }

    private func statCell(value: String, label: String) -> some View {
        VStack(spacing: 3) {
            Text(value).font(.title3.bold()).foregroundColor(.white)
            Text(label).font(.caption2).foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Charts

    private func byYearSection(_ d: MountainDetail) -> some View {
        let maxCount = max(d.byYear.map(\.count).max() ?? 1, 1)
        return VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Summits by Year")
            HStack(alignment: .bottom, spacing: 10) {
                ForEach(d.byYear) { yc in
                    barColumn(label: String(yc.year.suffix(2)),
                              value: yc.count, maxCount: maxCount, tint: emerald)
                }
            }
            .frame(height: 120)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(card)
            .cornerRadius(12)
        }
    }

    private func byMonthSection(_ d: MountainDetail) -> some View {
        // Fill all 12 months so seasonality reads cleanly.
        let lookup = Dictionary(uniqueKeysWithValues: d.byMonth.map { ($0.month, $0.count) })
        let months = (1...12).map { m -> (String, Int) in
            let key = String(format: "%02d", m)
            return (Self.monthNames[m], lookup[key] ?? 0)
        }
        let maxCount = max(months.map(\.1).max() ?? 1, 1)
        return VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Seasonality")
            HStack(alignment: .bottom, spacing: 5) {
                ForEach(months, id: \.0) { name, count in
                    barColumn(label: String(name.prefix(1)),
                              value: count, maxCount: maxCount, tint: sky)
                }
            }
            .frame(height: 110)
            .frame(maxWidth: .infinity)
            .padding()
            .background(card)
            .cornerRadius(12)
        }
    }

    private func barColumn(label: String, value: Int, maxCount: Int, tint: Color) -> some View {
        VStack(spacing: 5) {
            Text(value > 0 ? "\(value)" : "")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.gray)
            RoundedRectangle(cornerRadius: 3)
                .fill(value > 0 ? tint : Color.white.opacity(0.06))
                .frame(height: max(4, CGFloat(value) / CGFloat(maxCount) * 74))
            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Recent photos

    private func recentPhotosSection(_ d: MountainDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Recent Photos")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(d.recentPhotos) { photo in
                        NavigationLink(destination: ClimbDetailView(climbId: photo.climbId)) {
                            CachedAsyncImage(url: URL(string: photo.photoUrl)) { img in
                                img.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                card
                            }
                            .frame(width: 150, height: 150)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Recent summits

    private func recentSummitsSection(_ d: MountainDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Recent Summits")
            VStack(spacing: 8) {
                ForEach(d.recentSummits) { s in
                    NavigationLink(destination: UserProfileView(userId: s.userId)) {
                        HStack(spacing: 10) {
                            avatar(s.userAvatarUrl, name: s.userName)
                                .frame(width: 34, height: 34)
                                .clipShape(Circle())
                            Text(s.userName)
                                .font(.subheadline.bold())
                                .foregroundColor(.white)
                            Spacer()
                            Text(s.climbDate.shortClimbDate())
                                .font(.caption)
                                .foregroundColor(.gray)
                            Image(systemName: "chevron.right")
                                .font(.caption2.bold())
                                .foregroundColor(.gray.opacity(0.4))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 11)
                        .background(card)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder
    private func avatar(_ urlStr: String?, name: String) -> some View {
        if let urlStr, let url = URL(string: urlStr) {
            CachedAsyncImage(url: url) { img in
                img.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                avatarPlaceholder(name)
            }
        } else {
            avatarPlaceholder(name)
        }
    }

    private func avatarPlaceholder(_ name: String) -> some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(Text(name.prefix(1).uppercased()).font(.caption.bold()).foregroundColor(sky))
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "mountain.2")
                .font(.system(size: 40))
                .foregroundColor(.gray.opacity(0.4))
            Text("No public summits logged yet")
                .font(.subheadline)
                .foregroundColor(.gray)
            Text("Be the first to log a climb here!")
                .font(.caption)
                .foregroundColor(.gray.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text).font(.headline).foregroundColor(.white)
    }

    private func load() async {
        do {
            detail = try await APIClient.shared.mountainDetail(mountainId)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
