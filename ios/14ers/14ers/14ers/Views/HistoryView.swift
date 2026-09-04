import SwiftUI

private let bg = Color(red: 3/255, green: 7/255, blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

/// Full climb history, pushed from the Profile tab's "See All" and from
/// tapping the Summits/Unique numbers in the stats row above it -- same
/// list either way, just optionally pre-filtered to a chosen year.
struct ClimbHistoryView: View {
    enum SortOption: String, CaseIterable {
        case newest   = "Newest First"
        case oldest   = "Oldest First"
        case highest  = "Highest Elevation"
        case nameAZ   = "Peak Name A–Z"
    }

    @State private var climbs: [Climb] = []
    @State private var isLoading = false
    @State private var selectedClimbId: Int?
    @State private var yearFilter: String?   // nil = all years
    @State private var rangeFilter: String?  // nil = all ranges
    @State private var sortOption: SortOption = .newest

    init(initialYear: String? = nil) {
        _yearFilter = State(initialValue: initialYear)
    }

    private var years: [String] {
        Array(Set(climbs.map { String($0.climbDate.prefix(4)) })).sorted(by: >)
    }
    private var ranges: [String] {
        Array(Set(climbs.map(\.range))).sorted()
    }
    private var filtered: [Climb] {
        var list = climbs
        if let y = yearFilter { list = list.filter { $0.climbDate.prefix(4) == y } }
        if let r = rangeFilter { list = list.filter { $0.range == r } }
        switch sortOption {
        case .newest:  list.sort { $0.climbDate > $1.climbDate }
        case .oldest:  list.sort { $0.climbDate < $1.climbDate }
        case .highest: list.sort { $0.elevation > $1.elevation }
        case .nameAZ:  list.sort { $0.mountainName < $1.mountainName }
        }
        return list
    }

    var body: some View {
        VStack(spacing: 0) {
            if !climbs.isEmpty { filterBar }

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
                } else if filtered.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                            .font(.system(size: 40))
                            .foregroundColor(.gray.opacity(0.4))
                        Text("No climbs match those filters").foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(filtered) { climb in
                                ClimbRow(climb: climb) { selectedClimbId = climb.id }
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle("My Summits")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $selectedClimbId) { id in
            ClimbDetailView(climbId: id)
        }
        .task { await load() }
        .refreshable { await load() }
    }

    @ViewBuilder
    private var filterBar: some View {
        HStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    Menu {
                        Button { yearFilter = nil } label: {
                            Label("All Years", systemImage: yearFilter == nil ? "checkmark" : "")
                        }
                        ForEach(years, id: \.self) { y in
                            Button { yearFilter = y } label: {
                                Label(y, systemImage: yearFilter == y ? "checkmark" : "")
                            }
                        }
                    } label: {
                        filterChip(icon: "calendar", text: yearFilter ?? "All Years")
                    }

                    Menu {
                        Button { rangeFilter = nil } label: {
                            Label("All Ranges", systemImage: rangeFilter == nil ? "checkmark" : "")
                        }
                        ForEach(ranges, id: \.self) { r in
                            Button { rangeFilter = r } label: {
                                Label(r, systemImage: rangeFilter == r ? "checkmark" : "")
                            }
                        }
                    } label: {
                        filterChip(icon: "line.3.horizontal.decrease.circle", text: rangeFilter ?? "All Ranges")
                    }

                    Menu {
                        ForEach(SortOption.allCases, id: \.self) { option in
                            Button { sortOption = option } label: {
                                Label(option.rawValue, systemImage: sortOption == option ? "checkmark" : "")
                            }
                        }
                    } label: {
                        filterChip(icon: "arrow.up.arrow.down", text: sortOption.rawValue)
                    }
                }
            }
            Spacer(minLength: 8)
            Text("\(filtered.count)")
                .font(.caption.bold())
                .foregroundColor(.gray)
        }
        .padding(.horizontal)
        .padding(.top, 8)
        .padding(.bottom, 10)
    }

    private func filterChip(icon: String, text: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.caption)
            Text(text).font(.caption.bold()).lineLimit(1)
        }
        .foregroundColor(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(card)
        .cornerRadius(20)
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        climbs = (try? await APIClient.shared.climbs()) ?? []
    }
}

/// Tapping anywhere in the row opens the climb — there isn't enough room in
/// this compact layout for a separate mountain-detail tap target too (that's
/// still reachable from within the full ClimbDetailView).
struct ClimbRow: View {
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
                    Text("\(climb.elevation.formatted()) ft · \(climb.range)")
                        .font(.caption)
                        .foregroundColor(emerald)
                    Text(climb.climbDate.shortClimbDate())
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption2.bold())
                    .foregroundColor(.gray.opacity(0.4))
            }
            .padding(10)
            .background(card)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
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
