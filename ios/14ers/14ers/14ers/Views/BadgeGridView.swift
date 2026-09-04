import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let dimCard = Color(red: 31/255, green: 41/255, blue: 55/255)

// MARK: - Badges (Peaks + Climber Level + Leaderboard)

struct BadgesView: View {
    enum Filter: String, CaseIterable, Identifiable {
        case peaks = "Peaks"
        case rank  = "Climber Level"
        case leaderboard = "Leaderboard"
        var id: String { rawValue }
    }

    enum LeaderboardScope: String, CaseIterable, Identifiable {
        case global    = "Global"
        case following = "Following"
        var id: String { rawValue }
        var apiValue: String { self == .global ? "global" : "following" }
    }

    var initialFilter: Filter = .peaks
    var isTabRoot: Bool = false

    @EnvironmentObject var userState: UserState
    @State private var filter: Filter = .peaks
    @State private var mountains: [Mountain] = []
    @State private var peakLists: [PeakList] = []
    @State private var selectedListKey: String? = nil   // nil = All Summits
    @State private var peaksSearch: String = ""
    @State private var climbedIds: Set<Int>  = []
    @State private var ascentCounts: [Int: Int] = [:]
    @State private var rank: ClimberRank?
    @State private var isLoading = true
    @State private var leaderboardScope: LeaderboardScope = .global
    @State private var leaderboard: [LeaderboardEntry] = []
    @State private var isLoadingLeaderboard = false
    @State private var selectedUserId: Int?

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    private var scopedMountains: [Mountain] {
        var list = mountains
        if let key = selectedListKey {
            list = list.filter { $0.listKeys.contains(key) }
        }
        let q = peaksSearch.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty {
            let lower = q.lowercased()
            list = list.filter { $0.name.lowercased().contains(lower) }
        }
        return list
    }

    // Sections ordered by their tallest peak, descending -- correct for any
    // range (current or future) with no hardcoded name list to maintain.
    private var mountainsByRange: [(range: String, mountains: [Mountain])] {
        let grouped = Dictionary(grouping: scopedMountains) { $0.range }
        return grouped
            .map { (range: $0.key, mountains: $0.value.sorted { $0.elevation > $1.elevation }) }
            .sorted { ($0.mountains.first?.elevation ?? 0) > ($1.mountains.first?.elevation ?? 0) }
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Filter", selection: $filter) {
                ForEach(Filter.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 10)

            ScrollView {
                if filter == .leaderboard {
                    leaderboardContent
                } else if isLoading {
                    ProgressView().tint(.white).padding(.top, 60)
                } else if filter == .peaks {
                    peaksContent
                } else {
                    rankContent
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle(navigationTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if isTabRoot {
                ToolbarItem(placement: .navigationBarLeading) { HeaderAvatar() }
                ToolbarItem(placement: .navigationBarTrailing) { NotificationBellButton() }
            }
        }
        .navigationDestination(item: $selectedUserId) { id in
            UserProfileView(userId: id)
        }
        .onAppear { filter = initialFilter }
        .task { await load() }
        .task(id: filter == .leaderboard ? leaderboardScope.rawValue : nil) {
            if filter == .leaderboard { await loadLeaderboard() }
        }
        .onChange(of: userState.selectedTab) { newTab in
            if newTab == 3 { Task { await load() } }   // refresh climbed state on tab open
        }
    }

    private var navigationTitle: String {
        switch filter {
        case .peaks: return "Badge Collection"
        case .rank: return "Climber Level"
        case .leaderboard: return "Leaderboard"
        }
    }

    @ViewBuilder
    private var peaksContent: some View {
        VStack(alignment: .leading, spacing: 28) {
            VStack(alignment: .leading, spacing: 10) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        listChip(title: "All Summits", isOn: selectedListKey == nil) {
                            selectedListKey = nil
                        }
                        ForEach(peakLists) { list in
                            listChip(title: list.name, isOn: selectedListKey == list.key) {
                                selectedListKey = list.key
                            }
                        }
                    }
                    .padding(.horizontal)
                }

                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundColor(.gray)
                    TextField("", text: $peaksSearch,
                              prompt: Text("Search peaks").foregroundColor(Color(white: 0.4)))
                        .foregroundColor(.white)
                        .tint(sky)
                        .autocorrectionDisabled()
                    if !peaksSearch.isEmpty {
                        Button { peaksSearch = "" } label: {
                            Image(systemName: "xmark.circle.fill").foregroundColor(.gray)
                        }
                    }
                }
                .padding(10)
                .background(card)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)
            }

            let climbedInScope = scopedMountains.filter { climbedIds.contains($0.id) }.count
            HStack {
                Text("\(climbedInScope) of \(scopedMountains.count) peaks summited")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                Spacer()
                ProgressView(
                    value: scopedMountains.isEmpty ? 0 : Double(climbedInScope) / Double(scopedMountains.count)
                )
                .tint(sky)
                .frame(width: 100)
            }
            .padding(.horizontal)

            if scopedMountains.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "mountain.2")
                        .font(.system(size: 36))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("No peaks match your search")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            }

            ForEach(mountainsByRange, id: \.range) { section in
                let sectionClimbed = section.mountains.filter { climbedIds.contains($0.id) }.count
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(section.range.uppercased())
                            .font(.caption.bold())
                            .foregroundColor(emerald)
                            .tracking(1.5)
                        Spacer()
                        Text("\(sectionClimbed)/\(section.mountains.count)")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal)

                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(section.mountains) { mountain in
                            let climbed = climbedIds.contains(mountain.id)
                            let count   = ascentCounts[mountain.id] ?? 0
                            NavigationLink(destination: BadgeDetailView(
                                mountain: mountain,
                                climbed: climbed,
                                ascentCount: count
                            )) {
                                BadgeTile(mountain: mountain, climbed: climbed, ascentCount: count)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical)
    }

    private func listChip(title: String, isOn: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.bold())
                .foregroundColor(isOn ? bg : .gray)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isOn ? emerald : card)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var rankContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let rank {
                VStack(spacing: 6) {
                    Text(rank.name)
                        .font(.title3.bold())
                        .foregroundColor(.white)
                    if let nextName = rank.nextName {
                        Text("\(rank.peaksToNext) more peak\(rank.peaksToNext == 1 ? "" : "s") to \(nextName)")
                            .font(.caption)
                            .foregroundColor(.gray)
                        ProgressView(value: rankProgress(rank))
                            .tint(emerald)
                            .frame(maxWidth: 220)
                    } else {
                        Text("You've reached the top rank!")
                            .font(.caption)
                            .foregroundColor(emerald)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
            }

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(climberLevels) { def in
                    let unlocked = (rank?.level ?? 0) >= def.level
                    let isCurrent = rank?.level == def.level
                    RankTile(def: def, unlocked: unlocked, isCurrent: isCurrent)
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
    }

    private func rankProgress(_ rank: ClimberRank) -> Double {
        guard let nextMin = rank.nextMinPeaks, nextMin > rank.minPeaks else { return 1 }
        let earned = nextMin - rank.peaksToNext - rank.minPeaks
        return min(1, max(0, Double(earned) / Double(nextMin - rank.minPeaks)))
    }

    @ViewBuilder
    private var leaderboardContent: some View {
        VStack(alignment: .leading, spacing: 14) {
            Picker("Scope", selection: $leaderboardScope) {
                ForEach(LeaderboardScope.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            if isLoadingLeaderboard {
                ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.top, 40)
            } else if leaderboard.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "trophy")
                        .font(.system(size: 40))
                        .foregroundColor(.gray.opacity(0.4))
                    Text(leaderboardScope == .following
                         ? "Follow other climbers to see them here"
                         : "No summits logged yet")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 50)
            } else {
                VStack(spacing: 1) {
                    ForEach(leaderboard) { entry in
                        Button {
                            selectedUserId = entry.userId
                        } label: {
                            LeaderboardRow(entry: entry)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            }
        }
        .padding(.vertical)
    }

    private func load() async {
        async let ms = APIClient.shared.mountains()
        async let st = APIClient.shared.stats()
        async let ls = APIClient.shared.peakLists()
        if let (fetchedMountains, stats) = try? await (ms, st) {
            mountains = fetchedMountains
            climbedIds = Set(stats.climbedIds)
            ascentCounts = Dictionary(uniqueKeysWithValues: stats.ascentCounts.map { ($0.id, $0.count) })
            rank = stats.rank
        }
        peakLists = (try? await ls) ?? []
        isLoading = false
    }

    private func loadLeaderboard() async {
        isLoadingLeaderboard = true
        leaderboard = (try? await APIClient.shared.leaderboard(scope: leaderboardScope.apiValue)) ?? []
        isLoadingLeaderboard = false
    }
}

// MARK: - Leaderboard Row

private struct LeaderboardRow: View {
    let entry: LeaderboardEntry

    private var medalColor: Color? {
        switch entry.position {
        case 1: return Color(red: 255/255, green: 215/255, blue: 0/255)
        case 2: return Color(red: 197/255, green: 202/255, blue: 210/255)
        case 3: return Color(red: 205/255, green: 133/255, blue: 63/255)
        default: return nil
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            if let medalColor {
                Image(systemName: "medal.fill")
                    .font(.title3)
                    .foregroundColor(medalColor)
                    .frame(width: 28)
            } else {
                Text("\(entry.position)")
                    .font(.subheadline.bold())
                    .foregroundColor(.gray)
                    .frame(width: 28)
            }

            Group {
                if let urlStr = entry.avatarUrl, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        avatarPlaceholder
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 36, height: 36)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.isSelf ? "You" : entry.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                Text(entry.rank.name)
                    .font(.caption2)
                    .foregroundColor(.gray)
            }

            Spacer()

            Text("\(entry.uniquePeaks)")
                .font(.subheadline.bold())
                .foregroundColor(emerald)
            Text(entry.uniquePeaks == 1 ? "peak" : "peaks")
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(entry.isSelf ? emerald.opacity(0.12) : card)
        Divider()
            .background(Color(red: 31/255, green: 41/255, blue: 55/255))
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text(entry.name.prefix(1).uppercased())
                    .font(.caption.bold())
                    .foregroundColor(sky)
            )
    }
}

// MARK: - Rank Tile

private struct RankTile: View {
    let def: ClimberLevelDef
    let unlocked: Bool
    let isCurrent: Bool

    private var pngURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/rank/\(def.level)/png?locked=\(unlocked ? 0 : 1)")
    }

    var body: some View {
        VStack(spacing: 6) {
            CachedAsyncImage(url: pngURL) { img in
                img.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Color.clear
            }
            .frame(height: 130)

            Text(def.name)
                .font(.caption.bold())
                .foregroundColor(unlocked ? .white : .gray)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
            Text("\(def.minPeaks) peaks")
                .font(.system(size: 9))
                .foregroundColor(.gray.opacity(0.7))
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isCurrent ? emerald : Color(red: 40/255, green: 50/255, blue: 65/255),
                        lineWidth: isCurrent ? 2 : 1)
        )
    }
}

// MARK: - Badge Tile (image + text table)

private struct BadgeTile: View {
    let mountain: Mountain
    let climbed: Bool
    let ascentCount: Int

    private var pngURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/\(mountain.id)/png?climbed=\(climbed ? 1 : 0)")
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topTrailing) {
                CachedAsyncImage(url: pngURL) { img in
                    img.resizable().aspectRatio(contentMode: .fit)
                } placeholder: {
                    ZStack {
                        ShieldShape()
                            .fill(LinearGradient(
                                colors: climbed
                                    ? [Color(red: 18/255, green: 68/255, blue: 46/255),
                                       Color(red: 10/255, green: 36/255, blue: 26/255)]
                                    : [Color(red: 30/255, green: 38/255, blue: 52/255), card],
                                startPoint: .top, endPoint: .bottom
                            ))
                        ProgressView().tint(climbed ? emerald : .gray)
                    }
                    .aspectRatio(600.0 / 660.0, contentMode: .fit)
                }
                .frame(maxWidth: .infinity)

                if ascentCount > 1 {
                    AscentCountPill(count: ascentCount, size: .small)
                        .padding(.top, 6)
                        .padding(.trailing, 4)
                }
            }
            .padding(.top, 6)

            Color(red: 31/255, green: 41/255, blue: 55/255).frame(height: 1)

            VStack(spacing: 3) {
                Text(mountain.name)
                    .font(.caption.bold())
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Text("\(mountain.elevation.formatted()) ft  ·  \(mountain.range)")
                    .font(.system(size: 9))
                    .foregroundColor(.gray.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                if climbed {
                    HStack(spacing: 3) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 9))
                            .foregroundColor(emerald)
                        Text(ascentCount > 1 ? "\(ascentCount) ascents" : "Summited")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(emerald)
                    }
                } else {
                    Text("Not yet summited")
                        .font(.system(size: 9))
                        .foregroundColor(.gray.opacity(0.45))
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
        }
        .background(card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(climbed ? emerald.opacity(0.3) : Color(red: 40/255, green: 50/255, blue: 65/255), lineWidth: 1)
        )
    }
}

// MARK: - Badge Detail View

struct BadgeDetailView: View {
    let mountain: Mountain

    @State private var climbed: Bool
    @State private var ascentCount: Int
    @State private var isWishlisted: Bool
    @State private var ascents: [Climb] = []
    @State private var isLoading = false
    @State private var showLogClimb = false

    init(mountain: Mountain, climbed: Bool, ascentCount: Int) {
        self.mountain = mountain
        _climbed = State(initialValue: climbed)
        _ascentCount = State(initialValue: ascentCount)
        _isWishlisted = State(initialValue: mountain.isWishlisted)
    }

    private var pngURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/\(mountain.id)/png?climbed=\(climbed ? 1 : 0)")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Badge with count pill
                ZStack(alignment: .topTrailing) {
                    CachedAsyncImage(url: pngURL) { img in
                        img.resizable().aspectRatio(contentMode: .fit)
                    } placeholder: {
                        ZStack {
                            ShieldShape()
                                .fill(LinearGradient(
                                    colors: climbed
                                        ? [Color(red: 18/255, green: 68/255, blue: 46/255),
                                           Color(red: 10/255, green: 36/255, blue: 26/255)]
                                        : [Color(red: 30/255, green: 38/255, blue: 52/255), card],
                                    startPoint: .top, endPoint: .bottom
                                ))
                            ProgressView().tint(climbed ? emerald : .gray)
                        }
                        .aspectRatio(600.0 / 660.0, contentMode: .fit)
                    }
                    if ascentCount > 1 {
                        AscentCountPill(count: ascentCount, size: .large)
                            .padding(.top, 4)
                            .padding(.trailing, 4)
                    }
                }
                .frame(maxWidth: 240)
                .padding(.top, 8)

                logClimbSection
                    .padding(.horizontal)

                // Mountain info
                VStack(spacing: 1) {
                    detailRow(label: "Mountain", value: mountain.name)
                    detailRow(label: "Range", value: mountain.range)
                    detailRow(label: "Elevation", value: "\(mountain.elevation.formatted()) ft")
                    detailRow(
                        label: "Status",
                        value: climbed
                            ? (ascentCount > 1 ? "\(ascentCount) ascents" : "Summited")
                            : "Not yet summited",
                        valueColor: climbed ? emerald : .gray
                    )
                }
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

                // Past ascents list
                if climbed {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("ASCENTS")
                            .font(.caption.bold())
                            .foregroundColor(emerald)
                            .tracking(1.5)
                            .padding(.horizontal)

                        if isLoading {
                            ProgressView().tint(.white).frame(maxWidth: .infinity).padding()
                        } else {
                            VStack(spacing: 1) {
                                ForEach(ascents) { climb in
                                    NavigationLink(destination: ClimbDetailView(climbId: climb.id)) {
                                        AscentRow(climb: climb)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .padding(.horizontal)
                        }
                    }
                }
            }
            .padding(.bottom, 32)
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle(mountain.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                WishlistButton(mountainId: mountain.id, isWishlisted: $isWishlisted)
            }
        }
        .sheet(isPresented: $showLogClimb) {
            LogClimbView(preselectedMountainId: mountain.id)
        }
        .onReceive(NotificationCenter.default.publisher(for: .climbLogged)) { _ in
            Task { await loadAscents() }
        }
        .task {
            guard climbed else { return }
            await loadAscents()
        }
    }

    private func loadAscents() async {
        isLoading = true
        ascents = (try? await APIClient.shared.climbs(mountainId: mountain.id)) ?? []
        climbed = !ascents.isEmpty
        ascentCount = ascents.count
        isLoading = false
    }

    // MARK: - Log a climb / already-summited banner

    // Same pattern as MountainDetailView's logClimbSection -- lets someone
    // who found a peak via its badge tile log a climb for it without first
    // backing out to Summits or the Log tab.
    @ViewBuilder
    private var logClimbSection: some View {
        if climbed {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.title3)
                        .foregroundColor(emerald)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("You've summited this peak")
                            .font(.subheadline.bold())
                            .foregroundColor(.white)
                        Text(ascentCount > 1 ? "\(ascentCount) ascents logged" : "1 ascent logged")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    Spacer()
                }
                Button { showLogClimb = true } label: {
                    Text("Log Another Ascent")
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(card)
                        .foregroundColor(emerald)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
            .padding(14)
            .background(emerald.opacity(0.12))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(emerald.opacity(0.3), lineWidth: 1))
            .cornerRadius(14)
        } else {
            Button { showLogClimb = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                    Text("Log This Climb").bold()
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(emerald)
                .foregroundColor(bg)
                .cornerRadius(14)
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private func detailRow(label: String, value: String, valueColor: Color = .white) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.gray)
                .frame(width: 90, alignment: .leading)
            Text(value)
                .font(.subheadline)
                .foregroundColor(valueColor)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(card)
        Divider()
            .background(Color(red: 31/255, green: 41/255, blue: 55/255))
    }
}

// MARK: - Ascent Row (used in BadgeDetailView list)

private struct AscentRow: View {
    let climb: Climb

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(climb.climbDate.shortClimbDate())
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                if let notes = climb.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
            Spacer()
            if climb.photoUrl != nil {
                Image(systemName: "photo")
                    .font(.caption)
                    .foregroundColor(.gray.opacity(0.5))
            }
            Image(systemName: "chevron.right")
                .font(.caption2.bold())
                .foregroundColor(.gray.opacity(0.4))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(card)
        Divider()
            .background(Color(red: 31/255, green: 41/255, blue: 55/255))
    }
}

// MARK: - Ascent Count Pill

private enum PillSize { case small, large }

private struct AscentCountPill: View {
    let count: Int
    let size: PillSize

    private var fontSize: CGFloat { size == .small ? 9 : 11 }
    private var hPad:     CGFloat { size == .small ? 5 : 7 }
    private var vPad:     CGFloat { size == .small ? 2 : 3 }

    var body: some View {
        Text("×\(count)")
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .foregroundColor(Color(red: 3/255, green: 7/255, blue: 18/255))
            .padding(.horizontal, hPad)
            .padding(.vertical, vPad)
            .background(emerald)
            .clipShape(Capsule())
    }
}

// MARK: - Shield Shape (placeholder while PNG loads)

private struct ShieldShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height
        let r: CGFloat = 10
        let pivot = h * 0.64
        p.move(to: CGPoint(x: r, y: 0))
        p.addLine(to: CGPoint(x: w - r, y: 0))
        p.addArc(center: CGPoint(x: w - r, y: r), radius: r,
                 startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
        p.addLine(to: CGPoint(x: w, y: pivot))
        p.addCurve(to: CGPoint(x: w / 2, y: h),
                   control1: CGPoint(x: w,        y: pivot + (h - pivot) * 0.6),
                   control2: CGPoint(x: w * 0.78, y: h))
        p.addCurve(to: CGPoint(x: 0, y: pivot),
                   control1: CGPoint(x: w * 0.22, y: h),
                   control2: CGPoint(x: 0,        y: pivot + (h - pivot) * 0.6))
        p.addLine(to: CGPoint(x: 0, y: r))
        p.addArc(center: CGPoint(x: r, y: r), radius: r,
                 startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        p.closeSubpath()
        return p
    }
}

// BadgeCell kept for ProfileView's recentBadgesSection
struct BadgeCell: View {
    let mountain: Mountain
    let climbed: Bool

    private var pngURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/\(mountain.id)/png?climbed=\(climbed ? 1 : 0)")
    }

    var body: some View {
        CachedAsyncImage(url: pngURL) { img in
            img.resizable().aspectRatio(contentMode: .fit)
        } placeholder: {
            shieldPlaceholder
        }
        .frame(height: 132)
    }

    private var shieldPlaceholder: some View {
        ZStack {
            ShieldShape()
                .fill(LinearGradient(
                    colors: climbed
                        ? [Color(red: 18/255, green: 68/255, blue: 46/255),
                           Color(red: 10/255, green: 36/255, blue: 26/255)]
                        : [Color(red: 30/255, green: 38/255, blue: 52/255), card],
                    startPoint: .top, endPoint: .bottom
                ))
            ProgressView().tint(climbed ? emerald : .gray)
        }
        .frame(height: 132)
    }
}
