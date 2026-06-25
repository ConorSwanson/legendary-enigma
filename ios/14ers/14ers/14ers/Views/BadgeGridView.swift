import SwiftUI
import WebKit

private let bg   = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky  = Color(red: 56/255, green: 189/255, blue: 248/255)

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

// MARK: - Badge Cell

private struct BadgeCell: View {
    let mountain: Mountain
    let climbed: Bool

    var body: some View {
        BadgePatchView(mountainId: mountain.id, climbed: climbed)
            .frame(height: 132)
            .cornerRadius(12)
    }
}

// MARK: - Shield patch rendered via WKWebView (WebKit has full SVG support)

private struct BadgePatchView: UIViewRepresentable {
    let mountainId: Int
    let climbed: Bool

    func makeUIView(context: Context) -> WKWebView {
        let wv = WKWebView(frame: .zero)
        wv.isOpaque = false
        wv.backgroundColor = .clear
        wv.scrollView.isScrollEnabled = false
        wv.scrollView.bounces = false
        wv.scrollView.backgroundColor = .clear
        return wv
    }

    func updateUIView(_ wv: WKWebView, context: Context) {
        let climbed01 = climbed ? "1" : "0"
        let src = "\(Config.apiBaseURL)/api/badges/\(mountainId)?climbed=\(climbed01)"
        let html = """
        <!DOCTYPE html><html>
        <head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>html,body{margin:0;padding:0;background:transparent;width:100%;height:100%;overflow:hidden;}
        img{width:100%;height:100%;object-fit:contain;display:block;}</style>
        </head>
        <body><img src="\(src)"/></body></html>
        """
        wv.loadHTMLString(html, baseURL: URL(string: Config.apiBaseURL))
    }
}
