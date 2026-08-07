import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

struct StatsDeepDiveView: View {
    let stats: Stats
    @State private var selectedYear: String

    init(stats: Stats, initialYear: String?) {
        self.stats = stats
        let years = stats.byYear.map(\.year).sorted()
        _selectedYear = State(initialValue: initialYear ?? years.last ?? "")
    }

    private var years: [String] { stats.byYear.map(\.year).sorted() }

    private var current: UserYearStat? {
        stats.byYear.first { $0.year == selectedYear }
    }

    private var previous: UserYearStat? {
        guard let idx = years.firstIndex(of: selectedYear), idx > 0 else { return nil }
        return stats.byYear.first { $0.year == years[idx - 1] }
    }

    private var monthCounts: [Int] {
        (1...12).map { month in
            let key = String(format: "%@-%02d", selectedYear, month)
            return stats.byMonth.first { $0.month == key }?.count ?? 0
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                yearRow
                headline
                chart
                if !historyYears.isEmpty { historyList }
            }
            .padding()
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle("Stats")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Year row

    private var yearRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(years, id: \.self) { y in
                    Button { selectedYear = y } label: {
                        Text(y)
                            .font(.subheadline.bold())
                            .foregroundColor(y == selectedYear ? bg : .gray)
                            .padding(.horizontal, 13)
                            .padding(.vertical, 6)
                            .background(y == selectedYear ? sky : card)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Headline

    private var headline: some View {
        HStack(spacing: 22) {
            headlineStat(value: "\(current?.count ?? 0)", label: "Summits", delta: delta { $0.count })
            headlineStat(value: "\((current?.elevation ?? 0).formatted())ft", label: "Elev. ft", delta: delta { $0.elevation })
            headlineStat(value: "\(current?.uniquePeaks ?? 0)", label: "Unique", delta: nil)
        }
    }

    private func delta(_ value: (UserYearStat) -> Int) -> Double? {
        guard let cur = current, let prev = previous, value(prev) > 0 else { return nil }
        return (Double(value(cur)) - Double(value(prev))) / Double(value(prev)) * 100
    }

    private func headlineStat(value: String, label: String, delta: Double?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value).font(.title2.bold()).foregroundColor(.white)
                if let d = delta {
                    Text("\(d >= 0 ? "▲" : "▼")\(abs(Int(d.rounded())))%")
                        .font(.caption2.bold())
                        .foregroundColor(d >= 0 ? emerald : .red)
                }
            }
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.gray)
        }
    }

    // MARK: - Chart

    private var chart: some View {
        let counts = monthCounts
        let maxCount = max(counts.max() ?? 0, 1)
        let months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
        return VStack(alignment: .leading, spacing: 10) {
            Text("SUMMITS BY MONTH · \(selectedYear)")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.gray)
            HStack(alignment: .bottom, spacing: 4) {
                ForEach(0..<12, id: \.self) { i in
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(counts[i] > 0 && counts[i] == maxCount ? emerald : Color.white.opacity(0.12))
                            .frame(height: max(CGFloat(counts[i]) / CGFloat(maxCount) * 70, 3))
                        Text(months[i]).font(.system(size: 9)).foregroundColor(.gray)
                    }
                }
            }
            .frame(height: 90, alignment: .bottom)
        }
        .padding()
        .background(card)
        .cornerRadius(12)
    }

    // MARK: - History

    private var historyYears: [String] {
        years.filter { $0 != selectedYear }.reversed()
    }

    private var historyList: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("PRIOR YEARS")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.gray)
                .padding(.bottom, 6)
            ForEach(historyYears, id: \.self) { y in
                if let stat = stats.byYear.first(where: { $0.year == y }) {
                    HStack {
                        Text(y).font(.subheadline.bold()).foregroundColor(.white)
                        Spacer()
                        Text("\(stat.count) summits").font(.caption).foregroundColor(.gray)
                        Text("\(stat.elevation.formatted())ft").font(.caption).foregroundColor(.gray)
                    }
                    .padding(.vertical, 10)
                    if y != historyYears.last {
                        Divider().background(Color.white.opacity(0.08))
                    }
                }
            }
        }
        .padding()
        .background(card)
        .cornerRadius(12)
    }
}
