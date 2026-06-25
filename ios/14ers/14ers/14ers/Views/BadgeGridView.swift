import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let dimCard = Color(red: 31/255, green: 41/255, blue: 55/255)

private let rangeOrder = [
    "Front Range", "Tenmile/Mosquito", "Sawatch",
    "Elk", "Sangre de Cristo", "San Juan"
]

// MARK: - Badge Grid

struct BadgeGridView: View {
    @State private var mountains: [Mountain] = []
    @State private var climbedIds: Set<Int>  = []
    @State private var isLoading = true

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    private var mountainsByRange: [(range: String, mountains: [Mountain])] {
        let grouped = Dictionary(grouping: mountains) { $0.range }
        return grouped
            .map { (range: $0.key, mountains: $0.value.sorted { $0.elevation > $1.elevation }) }
            .sorted {
                let ai = rangeOrder.firstIndex(of: $0.range) ?? rangeOrder.count
                let bi = rangeOrder.firstIndex(of: $1.range) ?? rangeOrder.count
                return ai == bi ? $0.range < $1.range : ai < bi
            }
    }

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView().tint(.white).padding(.top, 60)
            } else {
                VStack(alignment: .leading, spacing: 28) {
                    HStack {
                        Text("\(climbedIds.count) of \(mountains.count) peaks summited")
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
                                    NavigationLink(destination: BadgeDetailView(
                                        mountain: mountain,
                                        climbed: climbed
                                    )) {
                                        BadgeTile(mountain: mountain, climbed: climbed)
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
            mountains = fetchedMountains
            climbedIds = Set(stats.climbedIds)
        }
        isLoading = false
    }
}

// MARK: - Badge Tile (image + text table)

private struct BadgeTile: View {
    let mountain: Mountain
    let climbed: Bool

    private var pngURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/\(mountain.id)/png?climbed=\(climbed ? 1 : 0)")
    }

    var body: some View {
        VStack(spacing: 0) {
            AsyncImage(url: pngURL) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fit)
                default:
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
            }
            .frame(maxWidth: .infinity)
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
                        Text("Summited")
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
    let climbed: Bool

    @State private var climbDate: String?
    @State private var climbNotes: String?

    private var pngURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/\(mountain.id)/png?climbed=\(climbed ? 1 : 0)")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                AsyncImage(url: pngURL) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fit)
                    default:
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
                }
                .frame(maxWidth: 240)
                .padding(.top, 8)

                VStack(spacing: 1) {
                    detailRow(label: "Mountain", value: mountain.name)
                    detailRow(label: "Range", value: mountain.range)
                    detailRow(label: "Elevation", value: "\(mountain.elevation.formatted()) ft")
                    detailRow(
                        label: "Status",
                        value: climbed ? "Summited" : "Not yet summited",
                        valueColor: climbed ? emerald : .gray
                    )
                    if let date = climbDate {
                        detailRow(label: "Date", value: date.shortClimbDate())
                    }
                    if let notes = climbNotes, !notes.isEmpty {
                        detailRow(label: "Notes", value: notes)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            }
            .padding(.bottom, 32)
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle(mountain.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard climbed else { return }
            let climbs = (try? await APIClient.shared.climbs()) ?? []
            if let match = climbs.first(where: { $0.mountainId == mountain.id }) {
                climbDate = match.climbDate
                climbNotes = match.notes
            }
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
        AsyncImage(url: pngURL) { phase in
            switch phase {
            case .success(let img):
                img.resizable().aspectRatio(contentMode: .fit)
            default:
                shieldPlaceholder
            }
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
