import SwiftUI
import Charts

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

struct MountainDetailView: View {
    let mountainId: Int
    var fallbackName: String? = nil

    @State private var detail: MountainDetail?
    @State private var error: String?
    @State private var selectedClimbId: Int?

    private static let monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    private static let fullMonthNames = ["", "January", "February", "March", "April", "May", "June",
                                        "July", "August", "September", "October", "November", "December"]

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
        .navigationDestination(item: $selectedClimbId) { id in
            ClimbDetailView(climbId: id)
        }
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
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Summits by Year")
            Chart(d.byYear) { yc in
                AreaMark(
                    x: .value("Year", yc.year),
                    y: .value("Summits", yc.count)
                )
                .interpolationMethod(.monotone)
                .foregroundStyle(LinearGradient(
                    colors: [emerald.opacity(0.35), emerald.opacity(0.02)],
                    startPoint: .top, endPoint: .bottom))
                LineMark(
                    x: .value("Year", yc.year),
                    y: .value("Summits", yc.count)
                )
                .interpolationMethod(.monotone)
                .foregroundStyle(emerald)
                .lineStyle(StrokeStyle(lineWidth: 2.5))
                PointMark(
                    x: .value("Year", yc.year),
                    y: .value("Summits", yc.count)
                )
                .foregroundStyle(emerald)
                .symbolSize(60)
            }
            .chartYAxis {
                AxisMarks(position: .leading) { _ in
                    AxisGridLine().foregroundStyle(Color.white.opacity(0.06))
                    AxisValueLabel().foregroundStyle(Color.gray)
                }
            }
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel().foregroundStyle(Color.gray)
                }
            }
            .frame(height: 170)
            .padding()
            .background(card)
            .cornerRadius(12)
        }
    }

    private func byMonthSection(_ d: MountainDetail) -> some View {
        // Fill all 12 months so seasonality reads cleanly.
        let lookup = Dictionary(uniqueKeysWithValues: d.byMonth.map { ($0.month, $0.count) })
        let maxCount = max(lookup.values.max() ?? 1, 1)
        return VStack(alignment: .leading, spacing: 8) {
            sectionTitle("Seasonality")
            HStack(alignment: .bottom, spacing: 5) {
                ForEach(1...12, id: \.self) { m in
                    let key = String(format: "%02d", m)
                    let count = lookup[key] ?? 0
                    let bar = barColumn(label: String(Self.monthNames[m].prefix(1)),
                                        value: count, maxCount: maxCount, tint: sky)
                    if count > 0 {
                        NavigationLink(destination: MonthClimbsView(
                            mountainId: mountainId,
                            month: key,
                            title: "\(Self.fullMonthNames[m]) · \(d.name)"
                        )) { bar }
                        .buttonStyle(.plain)
                    } else {
                        bar
                    }
                }
            }
            .frame(height: 110)
            .frame(maxWidth: .infinity)
            .padding()
            .background(card)
            .cornerRadius(12)
            Text("Tap a month to see those summits")
                .font(.caption2)
                .foregroundColor(.gray.opacity(0.55))
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
                        Button {
                            selectedClimbId = photo.climbId
                        } label: {
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

// MARK: - Month drill-in

struct MonthClimbsView: View {
    let mountainId: Int
    let month: String   // "01".."12"
    let title: String

    @State private var climbs: [RecentSummit] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView().tint(.white).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if climbs.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "mountain.2")
                        .font(.system(size: 40))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("No summits this month").foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(climbs) { c in
                            NavigationLink(destination: ClimbDetailView(climbId: c.climbId)) {
                                row(c)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding()
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            climbs = (try? await APIClient.shared.mountainClimbs(mountainId, month: month)) ?? []
            isLoading = false
        }
    }

    private func row(_ c: RecentSummit) -> some View {
        HStack(spacing: 10) {
            Group {
                if let urlStr = c.userAvatarUrl, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: { avatarPlaceholder(c.userName) }
                } else {
                    avatarPlaceholder(c.userName)
                }
            }
            .frame(width: 34, height: 34)
            .clipShape(Circle())

            Text(c.userName)
                .font(.subheadline.bold())
                .foregroundColor(.white)
            Spacer()
            Text(c.climbDate.shortClimbDate())
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

    private func avatarPlaceholder(_ name: String) -> some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(Text(name.prefix(1).uppercased()).font(.caption.bold()).foregroundColor(sky))
    }
}
