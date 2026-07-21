import SwiftUI
import MapKit

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

struct MountainsView: View {
    enum SortOption: String, CaseIterable, Identifiable {
        case recentActivity = "Recent activity"
        case elevationDesc  = "Highest first"
        case elevationAsc   = "Lowest first"
        case nameAsc        = "Name (A–Z)"
        var id: String { rawValue }
    }

    enum ViewMode { case list, map }

    @State private var mountains: [Mountain] = []
    @State private var climbedIds: Set<Int> = []
    @State private var search = ""
    @State private var rangeFilter: String? = nil   // nil = all ranges
    @State private var sort: SortOption = .elevationDesc
    @State private var viewMode: ViewMode = .list
    @State private var mapSelection: Mountain?
    @State private var isLoading = false
    @EnvironmentObject var userState: UserState

    private var ranges: [String] {
        Array(Set(mountains.map(\.range))).sorted()
    }

    private var filtered: [Mountain] {
        var list = mountains
        if let r = rangeFilter { list = list.filter { $0.range == r } }
        if !search.trimmingCharacters(in: .whitespaces).isEmpty {
            let q = search.lowercased()
            list = list.filter { $0.name.lowercased().contains(q) }
        }
        switch sort {
        case .elevationDesc: list.sort { $0.elevation > $1.elevation }
        case .elevationAsc:  list.sort { $0.elevation < $1.elevation }
        case .nameAsc:       list.sort { $0.name < $1.name }
        case .recentActivity:
            // Most recent public climb first; peaks with no activity sink to the bottom.
            list.sort { ($0.lastActivity ?? "") > ($1.lastActivity ?? "") }
        }
        return list
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterBar

                if viewMode == .map {
                    MountainsMapView(mountains: filtered, climbedIds: climbedIds, selection: $mapSelection)
                } else if isLoading && mountains.isEmpty {
                    Spacer(); ProgressView().tint(.white); Spacer()
                } else if filtered.isEmpty {
                    Spacer()
                    Text("No mountains match").foregroundColor(.gray)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(filtered) { m in
                                NavigationLink(destination: MountainDetailView(mountainId: m.id, fallbackName: m.name)) {
                                    MountainRow(mountain: m, climbed: climbedIds.contains(m.id))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding()
                    }
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationDestination(item: $mapSelection) { m in
                MountainDetailView(mountainId: m.id, fallbackName: m.name)
            }
            .navigationTitle("14ers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { HeaderAvatar() }
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 14) {
                        Button {
                            withAnimation { viewMode = viewMode == .list ? .map : .list }
                        } label: {
                            Image(systemName: viewMode == .list ? "map" : "list.bullet")
                                .foregroundColor(sky)
                        }
                        NotificationBellButton()
                    }
                }
            }
        }
        .task { await load() }
        .onChange(of: userState.selectedTab) { newTab in
            if newTab == 3 { Task { await load() } }   // refresh climbed state on tab open
        }
    }

    @ViewBuilder
    private var filterBar: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundColor(.gray)
                TextField("", text: $search,
                          prompt: Text("Search peaks").foregroundColor(Color(white: 0.4)))
                    .foregroundColor(.white)
                    .tint(sky)
                if !search.isEmpty {
                    Button { search = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundColor(.gray)
                    }
                }
            }
            .padding(.horizontal, 12)
            .frame(height: 40)
            .background(card)
            .cornerRadius(10)

            HStack(spacing: 10) {
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

                // Sort order is only meaningful in the list — hide it on the map.
                if viewMode == .list {
                    Menu {
                        ForEach(SortOption.allCases) { opt in
                            Button { sort = opt } label: {
                                Label(opt.rawValue, systemImage: sort == opt ? "checkmark" : "")
                            }
                        }
                    } label: {
                        filterChip(icon: "arrow.up.arrow.down", text: sort.rawValue)
                    }
                }

                Spacer()
                Text("\(filtered.count)")
                    .font(.caption.bold())
                    .foregroundColor(.gray)
            }
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
        if let ms = try? await APIClient.shared.mountains() { mountains = ms }
        if let stats = try? await APIClient.shared.stats() { climbedIds = Set(stats.climbedIds) }
    }
}

private struct MountainRow: View {
    let mountain: Mountain
    let climbed: Bool

    var body: some View {
        HStack(spacing: 12) {
            MountainPlaceholder(mountainId: mountain.id)
                .frame(width: 58, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 3) {
                Text(mountain.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                Text("\(mountain.elevation.formatted()) ft")
                    .font(.caption.bold())
                    .foregroundColor(emerald)
                Text(mountain.range)
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
            Spacer()
            if climbed {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundColor(emerald)
            }
            Image(systemName: "chevron.right")
                .font(.caption2.bold())
                .foregroundColor(.gray.opacity(0.4))
        }
        .padding(10)
        .background(card)
        .cornerRadius(12)
    }
}

// MARK: - Map view

private struct MountainsMapView: View {
    let mountains: [Mountain]
    let climbedIds: Set<Int>
    @Binding var selection: Mountain?

    private static let coords: [Int: CLLocationCoordinate2D] = Dictionary(
        uniqueKeysWithValues: allPeakCoordinates.map {
            ($0.mountainId, CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude))
        }
    )

    private static let coloradoRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 38.9, longitude: -106.3),
        span: MKCoordinateSpan(latitudeDelta: 4.2, longitudeDelta: 5.0)
    )

    var body: some View {
        Map(initialPosition: .region(Self.coloradoRegion)) {
            ForEach(mountains) { m in
                if let coord = Self.coords[m.id] {
                    Annotation(m.name, coordinate: coord) {
                        Button { selection = m } label: {
                            pin(climbed: climbedIds.contains(m.id))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic))
    }

    private func pin(climbed: Bool) -> some View {
        Image(systemName: "mountain.2.fill")
            .font(.system(size: 12))
            .foregroundColor(climbed ? Color(red: 3/255, green: 7/255, blue: 18/255) : .white)
            .padding(7)
            .background(Circle().fill(climbed ? emerald : Color.black.opacity(0.6)))
            .overlay(Circle().stroke(climbed ? Color.white.opacity(0.7) : Color.white.opacity(0.5), lineWidth: 1.5))
            .shadow(color: .black.opacity(0.3), radius: 2, y: 1)
    }
}
