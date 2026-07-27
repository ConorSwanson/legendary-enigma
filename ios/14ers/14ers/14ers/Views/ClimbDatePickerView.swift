import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let card2   = Color(red: 11/255, green: 18/255, blue: 32/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

/// Full calendar date picker — year/month scrub rails + a day grid, replacing
/// the old dial-plus-calendar combo. Built to make backdating years-old
/// climbs painless, not just picking "today."
struct ClimbDatePickerView: View {
    @Binding var date: Date
    @Environment(\.dismiss) private var dismiss

    @State private var displayedYear: Int
    @State private var displayedMonth: Int
    @State private var selectedDate: Date

    private let calendar = Calendar.current
    private static let monthAbbrev = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    private static let monthFull = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    private static let weekdaySymbols = ["S", "M", "T", "W", "T", "F", "S"]

    private var years: [Int] {
        let current = Calendar.current.component(.year, from: Date())
        return Array((current - 60)...current).reversed()
    }

    init(date: Binding<Date>) {
        _date = date
        let comps = Calendar.current.dateComponents([.year, .month], from: date.wrappedValue)
        let nowYear = Calendar.current.component(.year, from: Date())
        let nowMonth = Calendar.current.component(.month, from: Date())
        _displayedYear = State(initialValue: comps.year ?? nowYear)
        _displayedMonth = State(initialValue: comps.month ?? nowMonth)
        _selectedDate = State(initialValue: date.wrappedValue)
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    quickChips

                    VStack(alignment: .leading, spacing: 8) {
                        railLabel("Year")
                        yearRail
                        railLabel("Month")
                        monthRail

                        Divider().background(Color.white.opacity(0.08)).padding(.vertical, 3)

                        monthHeader
                        dayGrid
                    }
                    .padding(16)
                    .background(card)
                    .cornerRadius(16)

                    Text("The year rail scrolls as far back as you need — there's no cutoff.")
                        .font(.caption2)
                        .foregroundColor(.gray.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                }
                .padding()
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Climb Date")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundColor(sky)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        date = selectedDate
                        dismiss()
                    }
                    .fontWeight(.bold)
                    .foregroundColor(sky)
                }
            }
        }
    }

    // MARK: - Quick chips

    @ViewBuilder
    private var quickChips: some View {
        let today = calendar.startOfDay(for: Date())
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today) ?? today
        let lastWeekend = previousSaturday(before: today)

        HStack(spacing: 8) {
            quickChip("Today", date: today)
            quickChip("Yesterday", date: yesterday)
            quickChip("Last Weekend", date: lastWeekend)
        }
    }

    private func quickChip(_ label: String, date target: Date) -> some View {
        let isOn = calendar.isDate(target, inSameDayAs: selectedDate)
        return Button {
            selectedDate = target
            let comps = calendar.dateComponents([.year, .month], from: target)
            displayedYear = comps.year ?? displayedYear
            displayedMonth = comps.month ?? displayedMonth
        } label: {
            Text(label)
                .font(.caption.bold())
                .foregroundColor(isOn ? emerald : .gray)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(isOn ? emerald.opacity(0.14) : card)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(isOn ? emerald.opacity(0.4) : Color.white.opacity(0.06), lineWidth: 1)
                )
                .cornerRadius(10)
        }
        .buttonStyle(.plain)
    }

    private func previousSaturday(before date: Date) -> Date {
        var d = date
        for _ in 0..<7 {
            d = calendar.date(byAdding: .day, value: -1, to: d) ?? d
            if calendar.component(.weekday, from: d) == 7 { return d } // 7 = Saturday
        }
        return d
    }

    // MARK: - Rails

    private func railLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .bold))
            .tracking(0.8)
            .foregroundColor(.gray)
    }

    private var yearRail: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 7) {
                    ForEach(years, id: \.self) { y in
                        railChip("\(y)", isOn: y == displayedYear) {
                            displayedYear = y
                            clampMonthAndDay()
                        }
                        .id(y)
                    }
                }
            }
            .onAppear { proxy.scrollTo(displayedYear, anchor: .center) }
        }
    }

    private var monthRail: some View {
        let nowYear = calendar.component(.year, from: Date())
        let nowMonth = calendar.component(.month, from: Date())
        let maxMonth = displayedYear == nowYear ? nowMonth : 12
        return ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 7) {
                    ForEach(1...12, id: \.self) { m in
                        let disabled = m > maxMonth
                        railChip(Self.monthAbbrev[m], isOn: m == displayedMonth, disabled: disabled) {
                            displayedMonth = m
                            clampDay()
                        }
                        .id(m)
                    }
                }
            }
            .onAppear { proxy.scrollTo(displayedMonth, anchor: .center) }
        }
    }

    private func railChip(_ text: String, isOn: Bool, disabled: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(text)
                .font(.subheadline.bold())
                .foregroundColor(disabled ? Color(white: 0.25) : (isOn ? Color(red: 3/255, green: 7/255, blue: 18/255) : .gray))
                .padding(.horizontal, 13)
                .padding(.vertical, 7)
                .background(isOn ? emerald : card2)
                .cornerRadius(13)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }

    // MARK: - Day grid

    private var monthHeader: some View {
        HStack {
            Text("\(Self.monthFull[displayedMonth]) \(String(displayedYear))")
                .font(.subheadline.bold())
                .foregroundColor(.white)
            Spacer()
            Button { shiftMonth(-1) } label: {
                Image(systemName: "chevron.left").foregroundColor(.gray)
            }
            Button { shiftMonth(1) } label: {
                Image(systemName: "chevron.right").foregroundColor(canGoForward ? .gray : Color(white: 0.2))
            }
            .disabled(!canGoForward)
        }
    }

    private var canGoForward: Bool {
        let nowYear = calendar.component(.year, from: Date())
        let nowMonth = calendar.component(.month, from: Date())
        return displayedYear < nowYear || (displayedYear == nowYear && displayedMonth < nowMonth)
    }

    private func shiftMonth(_ delta: Int) {
        var m = displayedMonth + delta
        var y = displayedYear
        if m < 1 { m = 12; y -= 1 }
        if m > 12 { m = 1; y += 1 }
        displayedYear = min(y, calendar.component(.year, from: Date()))
        displayedMonth = m
        clampDay()
    }

    private func clampMonthAndDay() {
        let nowYear = calendar.component(.year, from: Date())
        let nowMonth = calendar.component(.month, from: Date())
        if displayedYear == nowYear && displayedMonth > nowMonth { displayedMonth = nowMonth }
        clampDay()
    }

    private func clampDay() {
        guard let maxDay = calendar.range(of: .day, in: .month, for: firstOfDisplayedMonth)?.count else { return }
        var comps = DateComponents(); comps.year = displayedYear; comps.month = displayedMonth
        comps.day = min(calendar.component(.day, from: selectedDate), maxDay)
        if let d = calendar.date(from: comps), d <= Date() {
            selectedDate = d
        }
    }

    private var firstOfDisplayedMonth: Date {
        var comps = DateComponents(); comps.year = displayedYear; comps.month = displayedMonth; comps.day = 1
        return calendar.date(from: comps) ?? Date()
    }

    private var dayCells: [Date?] {
        let first = firstOfDisplayedMonth
        let weekday = calendar.component(.weekday, from: first) // 1 = Sunday
        let range = calendar.range(of: .day, in: .month, for: first) ?? 1..<29
        var cells: [Date?] = Array(repeating: nil, count: weekday - 1)
        for day in range {
            var c = calendar.dateComponents([.year, .month], from: first)
            c.day = day
            cells.append(calendar.date(from: c))
        }
        while cells.count % 7 != 0 { cells.append(nil) }
        return cells
    }

    private var dayGrid: some View {
        let today = calendar.startOfDay(for: Date())
        return LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 6) {
            ForEach(0..<7, id: \.self) { i in
                Text(Self.weekdaySymbols[i])
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.gray)
            }
            ForEach(Array(dayCells.enumerated()), id: \.offset) { _, cellDate in
                if let cellDate {
                    let isFuture = cellDate > today
                    let isSelected = calendar.isDate(cellDate, inSameDayAs: selectedDate)
                    let isToday = calendar.isDate(cellDate, inSameDayAs: today)
                    Button {
                        selectedDate = cellDate
                    } label: {
                        Text("\(calendar.component(.day, from: cellDate))")
                            .font(.system(size: 13, weight: isSelected ? .bold : .regular))
                            .foregroundColor(
                                isFuture ? Color(white: 0.2) :
                                isSelected ? Color(red: 3/255, green: 7/255, blue: 18/255) : .white
                            )
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 7)
                            .background(isSelected ? emerald : Color.clear)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(isToday && !isSelected ? sky : Color.clear, lineWidth: 1.5)
                            )
                            .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                    .disabled(isFuture)
                } else {
                    Color.clear.frame(height: 28)
                }
            }
        }
    }
}
