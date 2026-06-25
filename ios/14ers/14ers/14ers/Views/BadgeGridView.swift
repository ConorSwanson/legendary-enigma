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

// MARK: - Shield Shape

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

// MARK: - Badge Cell — loads PNG from server, ShieldShape while loading

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
            ShieldShape()
                .stroke(
                    climbed ? emerald.opacity(0.55) : Color(red: 50/255, green: 60/255, blue: 75/255),
                    lineWidth: 1.5
                )
            ProgressView().tint(climbed ? emerald : .gray)
        }
        .frame(height: 132)
    }
}
