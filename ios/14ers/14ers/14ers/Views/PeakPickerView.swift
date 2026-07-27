import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

/// Full-screen searchable peak picker — replaces the old inline wheel Picker.
struct PeakPickerView: View {
    let mountains: [Mountain]
    let climbedIds: Set<Int>
    let onSelect: (Mountain) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var rangeFilter: String? = nil

    private var ranges: [String] {
        Array(Set(mountains.map(\.range))).sorted()
    }

    private var filtered: [Mountain] {
        var list = mountains
        if let r = rangeFilter { list = list.filter { $0.range == r } }
        let q = search.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty {
            let lower = q.lowercased()
            list = list.filter { $0.name.lowercased().contains(lower) }
        }
        return list.sorted { $0.elevation > $1.elevation }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundColor(.gray)
                    TextField("", text: $search,
                              prompt: Text("Search 58 peaks").foregroundColor(Color(white: 0.4)))
                        .foregroundColor(.white)
                        .tint(sky)
                        .autocorrectionDisabled()
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
                .padding(.horizontal)
                .padding(.top, 8)

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
                        HStack(spacing: 5) {
                            Image(systemName: "line.3.horizontal.decrease.circle").font(.caption)
                            Text(rangeFilter ?? "All Ranges").font(.caption.bold()).lineLimit(1)
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(card)
                        .cornerRadius(20)
                    }
                    Spacer()
                    Text("\(filtered.count) match\(filtered.count == 1 ? "" : "es")")
                        .font(.caption.bold())
                        .foregroundColor(.gray)
                }
                .padding(.horizontal)
                .padding(.top, 10)
                .padding(.bottom, 6)

                if filtered.isEmpty {
                    Spacer()
                    Text("No peaks match").foregroundColor(.gray)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(filtered) { m in
                                Button {
                                    onSelect(m)
                                    dismiss()
                                } label: {
                                    PeakPickerRow(mountain: m, climbed: climbedIds.contains(m.id), query: search)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding()
                    }
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Select Peak")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundColor(sky)
                }
            }
        }
    }
}

private struct PeakPickerRow: View {
    let mountain: Mountain
    let climbed: Bool
    let query: String

    var body: some View {
        HStack(spacing: 12) {
            MountainPlaceholder(mountainId: mountain.id)
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 3) {
                highlightedName
                    .font(.subheadline.bold())
                Text("\(mountain.elevation.formatted()) ft · \(mountain.range)")
                    .font(.caption)
                    .foregroundColor(emerald)
            }
            Spacer()
            if climbed {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundColor(emerald)
            }
        }
        .padding(10)
        .background(card)
        .cornerRadius(12)
    }

    /// Highlights the matched substring of the search query within the name.
    private var highlightedName: Text {
        let name = mountain.name
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty, let range = name.range(of: q, options: .caseInsensitive) else {
            return Text(name).foregroundColor(.white)
        }
        let before = Text(name[name.startIndex..<range.lowerBound]).foregroundColor(.white)
        let match = Text(name[range]).foregroundColor(sky)
        let after = Text(name[range.upperBound...]).foregroundColor(.white)
        return before + match + after
    }
}
