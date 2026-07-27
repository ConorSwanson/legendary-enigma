import SwiftUI
import PhotosUI
import CoreLocation
import ImageIO
import UIKit

private let bg      = Color(red: 3/255,   green: 7/255,   blue: 18/255)
private let card    = Color(red: 17/255,  green: 24/255,  blue: 39/255)
private let card2   = Color(red: 11/255,  green: 18/255,  blue: 32/255)
private let emerald = Color(red: 52/255,  green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255,  green: 189/255, blue: 248/255)
private let ink     = Color(red: 3/255,   green: 7/255,   blue: 18/255)

struct LogClimbView: View {
    @State private var mountains: [Mountain] = []
    @State private var climbedIds: Set<Int> = []
    @State private var selectedMountainId: Int?
    @State private var date = Date()
    @State private var notes = ""
    @State private var visibility = "public"
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showSuccess = false
    @State private var successAscentCount: Int = 1
    @EnvironmentObject var userState: UserState

    // Photos — ordered; index 0 is the cover
    @State private var photosData: [Data] = []
    @State private var pickerItems: [PhotosPickerItem] = []

    // Sheets
    @State private var showPeakPicker = false
    @State private var showDatePicker = false
    @State private var showNearbyPhotos = false

    // Soft suggestion from a manually-picked photo's EXIF GPS (tap to accept)
    @State private var detectedMountainId: Int?
    @State private var detectedMountainName: String?

    // Success modal data
    @State private var successMountain: Mountain?
    @State private var successDate: Date = Date()
    @State private var successClimbId: Int = 0

    private var selectedMountain: Mountain? {
        mountains.first(where: { $0.id == selectedMountainId })
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    LogHeroScene()

                    VStack(spacing: 12) {
                        peakCard
                        dateRow
                        photosSection
                        notesSection
                        visibilityPills
                    }
                    .padding()
                    .padding(.top, -30)
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Log a Climb")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { HeaderAvatar() }
                ToolbarItem(placement: .navigationBarTrailing) { NotificationBellButton() }
            }
            .safeAreaInset(edge: .bottom) { ctaBar }
        }
        .task { await loadMountains() }
        .onChange(of: pickerItems) { Task { await loadPickedPhotos() } }
        .sheet(isPresented: $showPeakPicker) {
            PeakPickerView(mountains: mountains, climbedIds: climbedIds) { m in
                selectedMountainId = m.id
                detectedMountainId = nil
                detectedMountainName = nil
            }
        }
        .sheet(isPresented: $showDatePicker) {
            ClimbDatePickerView(date: $date)
        }
        .sheet(isPresented: $showNearbyPhotos) {
            NearbyPeakPhotosView(mountains: mountains) { selections in
                addNearbyPhotos(selections)
            }
        }
        .sheet(isPresented: $showSuccess, onDismiss: resetForm) {
            if let m = successMountain {
                ClimbSuccessView(mountain: m, climbDate: successDate, climbId: successClimbId, ascentCount: successAscentCount)
            }
        }
    }

    // MARK: - Peak

    @ViewBuilder
    private var peakCard: some View {
        Button { showPeakPicker = true } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("PEAK")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.8)
                        .foregroundColor(.gray)
                    if let m = selectedMountain {
                        Text(m.name)
                            .font(.title3.bold())
                            .foregroundColor(.white)
                        Text("\(m.elevation.formatted()) ft · \(m.range)")
                            .font(.caption.bold())
                            .foregroundColor(emerald)
                    } else {
                        Text("Select a Peak")
                            .font(.title3.bold())
                            .foregroundColor(.gray)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundColor(.gray)
            }
            .padding(15)
            .background(card)
            .cornerRadius(16)
        }
        .buttonStyle(.plain)

        if let detectedId = detectedMountainId,
           let detectedName = detectedMountainName,
           selectedMountainId == nil {
            Button {
                selectedMountainId = detectedId
                detectedMountainId = nil
                detectedMountainName = nil
            } label: {
                Label("Near \(detectedName) — tap to select", systemImage: "mappin.circle.fill")
                    .font(.caption.bold())
                    .foregroundColor(.orange)
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Date

    private var dateRow: some View {
        Button { showDatePicker = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "calendar")
                    .font(.subheadline)
                    .foregroundColor(sky)
                    .frame(width: 34, height: 34)
                    .background(sky.opacity(0.15))
                    .cornerRadius(10)
                VStack(alignment: .leading, spacing: 2) {
                    Text("CLIMB DATE")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.8)
                        .foregroundColor(.gray)
                    Text(date.formatted(date: .abbreviated, time: .omitted))
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundColor(.gray)
            }
            .padding(13)
            .background(card)
            .cornerRadius(14)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Photos

    @ViewBuilder
    private var photosSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("PHOTOS")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(0.8)
                    .foregroundColor(.gray)
                Spacer()
                if !photosData.isEmpty {
                    Text("\(photosData.count) added")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)
            .padding(.bottom, 9)

            VStack(spacing: 10) {
                if !photosData.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(Array(photosData.enumerated()), id: \.offset) { idx, data in
                                photoThumb(data, isCover: idx == 0) { removePhoto(at: idx) }
                            }
                        }
                    }
                }

                VStack(spacing: 7) {
                    Button { showNearbyPhotos = true } label: {
                        actionButtonLabel(icon: "mappin.and.ellipse", text: "Find Prior Climb Photos", primary: true)
                    }
                    .buttonStyle(.plain)

                    PhotosPicker(selection: $pickerItems, maxSelectionCount: 10, matching: .images) {
                        actionButtonLabel(icon: "photo.on.rectangle", text: "Choose from Library", primary: false)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 12)
        }
        .background(card)
        .cornerRadius(16)
    }

    private func photoThumb(_ data: Data, isCover: Bool, onRemove: @escaping () -> Void) -> some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage).resizable().aspectRatio(contentMode: .fill)
                } else {
                    card2
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(alignment: .bottom) {
                if isCover {
                    Text("COVER")
                        .font(.system(size: 7, weight: .black))
                        .foregroundColor(emerald)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(4)
                        .padding(.bottom, 3)
                }
            }

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .background(Circle().fill(Color.black.opacity(0.6)))
            }
            .buttonStyle(.plain)
            .offset(x: 5, y: -5)
        }
    }

    private func actionButtonLabel(icon: String, text: String, primary: Bool) -> some View {
        HStack(spacing: 7) {
            Image(systemName: icon)
            Text(text).bold()
        }
        .font(.subheadline)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(primary ? sky.opacity(0.14) : card2)
        .foregroundColor(primary ? sky : .white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(primary ? sky.opacity(0.4) : Color.white.opacity(0.06), lineWidth: 1)
        )
    }

    // MARK: - Notes

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("NOTES")
                .font(.system(size: 10, weight: .bold))
                .tracking(0.8)
                .foregroundColor(.gray)
                .padding(.horizontal, 14)
                .padding(.top, 12)
                .padding(.bottom, 4)

            ZStack(alignment: .topLeading) {
                if notes.isEmpty {
                    Text("How was the climb? Weather, route, partners…")
                        .font(.subheadline)
                        .foregroundColor(Color(white: 0.35))
                        .padding(.horizontal, 18)
                        .padding(.top, 8)
                }
                TextEditor(text: $notes)
                    .scrollContentBackground(.hidden)
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .tint(sky)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 80)
            }
            .padding(.bottom, 8)
        }
        .background(card)
        .cornerRadius(16)
    }

    // MARK: - Visibility

    private var visibilityPills: some View {
        HStack(spacing: 8) {
            visibilityPill(value: "public", icon: "globe", label: "Public")
            visibilityPill(value: "followers", icon: "person.2.fill", label: "Followers")
            visibilityPill(value: "private", icon: "lock.fill", label: "Private")
        }
    }

    private func visibilityPill(value: String, icon: String, label: String) -> some View {
        let isOn = visibility == value
        return Button { visibility = value } label: {
            HStack(spacing: 5) {
                Image(systemName: icon).font(.caption)
                Text(label).font(.caption.bold())
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(isOn ? sky : card)
            .foregroundColor(isOn ? ink : .gray)
            .cornerRadius(20)
        }
        .buttonStyle(.plain)
    }

    // MARK: - CTA

    private var ctaBar: some View {
        VStack(spacing: 6) {
            if selectedMountainId == nil {
                Text("Select a peak to continue")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
            if let saveError {
                Text(saveError).font(.caption).foregroundColor(.red)
            }
            Button {
                Task { await save() }
            } label: {
                Group {
                    if isSaving {
                        ProgressView().tint(ink)
                    } else {
                        Text("Log Climb").bold()
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(selectedMountainId == nil ? card : emerald)
                .foregroundColor(selectedMountainId == nil ? .gray : ink)
                .cornerRadius(16)
            }
            .disabled(selectedMountainId == nil || isSaving)
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }

    // MARK: - Photo intake

    private func removePhoto(at index: Int) {
        guard photosData.indices.contains(index) else { return }
        photosData.remove(at: index)
    }

    private func addNearbyPhotos(_ selections: [NearbyPhotoSelection]) {
        let wasEmpty = photosData.isEmpty
        for (i, sel) in selections.enumerated() {
            photosData.append(sel.data)
            if wasEmpty && i == 0 {
                if selectedMountainId == nil { selectedMountainId = sel.mountainId }
                if let d = sel.date { date = d }
            }
        }
    }

    private func loadPickedPhotos() async {
        guard !pickerItems.isEmpty else { return }
        let wasEmpty = photosData.isEmpty
        for item in pickerItems {
            guard let raw = try? await item.loadTransferable(type: Data.self) else { continue }
            let compressed = compressPhoto(raw)
            photosData.append(compressed)
            if wasEmpty && photosData.count == 1 {
                detectPeakFromExif(raw)
                extractDateFromExif(raw)
            }
        }
        pickerItems = []
    }

    private func extractDateFromExif(_ data: Data) {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any]
        else { return }

        let exif = props[kCGImagePropertyExifDictionary as String] as? [String: Any]
        let tiff = props[kCGImagePropertyTIFFDictionary as String] as? [String: Any]
        let dateString = exif?[kCGImagePropertyExifDateTimeOriginal as String] as? String
            ?? tiff?[kCGImagePropertyTIFFDateTime as String] as? String

        guard let str = dateString else { return }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy:MM:dd HH:mm:ss"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        if let d = formatter.date(from: str) { date = d }
    }

    private func detectPeakFromExif(_ data: Data) {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any],
              let gps = props[kCGImagePropertyGPSDictionary as String] as? [String: Any],
              let lat = gps[kCGImagePropertyGPSLatitude as String] as? Double,
              let lon = gps[kCGImagePropertyGPSLongitude as String] as? Double
        else {
            detectedMountainId = nil
            detectedMountainName = nil
            return
        }
        let latRef = gps[kCGImagePropertyGPSLatitudeRef as String] as? String ?? "N"
        let lonRef = gps[kCGImagePropertyGPSLongitudeRef as String] as? String ?? "W"
        let photoLoc = CLLocation(
            latitude:  latRef == "S" ? -lat : lat,
            longitude: lonRef == "W" ? -lon : lon
        )

        let nearest = allPeakCoordinates.min {
            CLLocation(latitude: $0.latitude, longitude: $0.longitude).distance(from: photoLoc) <
            CLLocation(latitude: $1.latitude, longitude: $1.longitude).distance(from: photoLoc)
        }
        guard let peak = nearest,
              CLLocation(latitude: peak.latitude, longitude: peak.longitude)
                .distance(from: photoLoc) <= twoMilesMeters
        else {
            detectedMountainId = nil
            detectedMountainName = nil
            return
        }
        detectedMountainId = peak.mountainId
        detectedMountainName = mountains.first(where: { $0.id == peak.mountainId })?.name
    }

    // MARK: - Helpers

    private func compressPhoto(_ data: Data) -> Data {
        guard let uiImage = UIImage(data: data) else { return data }
        let maxDim: CGFloat = 1200
        let size = uiImage.size
        let scale = min(maxDim / max(size.width, size.height), 1.0)
        guard scale < 1.0 else { return uiImage.jpegData(compressionQuality: 0.8) ?? data }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in uiImage.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: 0.8) ?? data
    }

    private func loadMountains() async {
        if let ms = try? await APIClient.shared.mountains() { mountains = ms }
        if let stats = try? await APIClient.shared.stats() { climbedIds = Set(stats.climbedIds) }
    }

    private func save() async {
        guard let mountainId = selectedMountainId else { return }
        isSaving = true
        saveError = nil
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        do {
            let newClimbId = try await APIClient.shared.logClimb(
                mountainId: mountainId,
                date: formatter.string(from: date),
                notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes,
                visibility: visibility,
                photosData: photosData
            )
            let allAscents = (try? await APIClient.shared.climbs(mountainId: mountainId)) ?? []
            successMountain = mountains.first(where: { $0.id == mountainId })
            successDate = date
            successClimbId = newClimbId
            successAscentCount = max(1, allAscents.count)
            NotificationCenter.default.post(name: .climbLogged, object: newClimbId)
            showSuccess = true
        } catch {
            self.saveError = error.localizedDescription
        }
    }

    private func resetForm() {
        selectedMountainId = nil
        date = Date()
        notes = ""
        visibility = "public"
        photosData = []
        pickerItems = []
        detectedMountainId = nil
        detectedMountainName = nil
        userState.selectedTab = 1
    }
}

// MARK: - Hero scene

/// Generative alpenglow scene for the Log a Climb hero — sunset sky, layered
/// ridgelines with snow-cap highlights, a few stars. Same Canvas approach as
/// MountainPlaceholder, but a single fixed palette since this isn't tied to
/// any specific peak.
private struct LogHeroScene: View {
    var body: some View {
        ZStack {
            GeometryReader { geo in
                let w = geo.size.width, h = geo.size.height
                Canvas { ctx, size in
                    ctx.fill(
                        Path(CGRect(origin: .zero, size: size)),
                        with: .linearGradient(
                            Gradient(stops: [
                                .init(color: Color(red: 52/255, green: 21/255, blue: 48/255), location: 0),
                                .init(color: Color(red: 122/255, green: 58/255, blue: 74/255), location: 0.45),
                                .init(color: Color(red: 201/255, green: 106/255, blue: 78/255), location: 0.75),
                                .init(color: Color(red: 232/255, green: 146/255, blue: 90/255), location: 1),
                            ]),
                            startPoint: .zero,
                            endPoint: CGPoint(x: 0, y: size.height)
                        )
                    )

                    ctx.fill(
                        Path(ellipseIn: CGRect(x: w * 0.42, y: h * 0.35, width: w * 0.9, height: w * 0.9)),
                        with: .radialGradient(
                            Gradient(colors: [Color(red: 1, green: 220/255, blue: 160/255).opacity(0.55), .clear]),
                            center: CGPoint(x: w * 0.87, y: h * 0.8),
                            startRadius: 0, endRadius: w * 0.45
                        )
                    )

                    for star in [(0.14, 0.13, 1.3), (0.26, 0.08, 1.0), (0.44, 0.11, 1.4), (0.8, 0.07, 1.0), (0.89, 0.15, 1.2)] {
                        ctx.fill(
                            Path(ellipseIn: CGRect(x: w * star.0, y: h * star.1, width: star.2, height: star.2)),
                            with: .color(.white.opacity(0.6))
                        )
                    }

                    var far = Path()
                    far.move(to: CGPoint(x: 0, y: h))
                    far.addLines([
                        CGPoint(x: 0,          y: h * 0.63),
                        CGPoint(x: w * 0.07,   y: h * 0.48),
                        CGPoint(x: w * 0.15,   y: h * 0.57),
                        CGPoint(x: w * 0.23,   y: h * 0.37),
                        CGPoint(x: w * 0.33,   y: h * 0.52),
                        CGPoint(x: w * 0.43,   y: h * 0.33),
                        CGPoint(x: w * 0.53,   y: h * 0.49),
                        CGPoint(x: w * 0.63,   y: h * 0.38),
                        CGPoint(x: w * 0.71,   y: h * 0.54),
                        CGPoint(x: w * 0.81,   y: h * 0.43),
                        CGPoint(x: w * 0.9,    y: h * 0.55),
                        CGPoint(x: w,          y: h * 0.46),
                        CGPoint(x: w,          y: h),
                    ])
                    far.closeSubpath()
                    ctx.fill(far, with: .color(Color(red: 122/255, green: 74/255, blue: 94/255).opacity(0.75)))

                    var mid = Path()
                    mid.move(to: CGPoint(x: 0, y: h))
                    mid.addLines([
                        CGPoint(x: 0,          y: h * 0.75),
                        CGPoint(x: w * 0.09,   y: h * 0.59),
                        CGPoint(x: w * 0.19,   y: h * 0.7),
                        CGPoint(x: w * 0.29,   y: h * 0.49),
                        CGPoint(x: w * 0.39,   y: h * 0.67),
                        CGPoint(x: w * 0.5,    y: h * 0.45),
                        CGPoint(x: w * 0.6,    y: h * 0.63),
                        CGPoint(x: w * 0.71,   y: h * 0.53),
                        CGPoint(x: w * 0.8,    y: h * 0.68),
                        CGPoint(x: w * 0.89,   y: h * 0.57),
                        CGPoint(x: w,          y: h * 0.71),
                        CGPoint(x: w,          y: h),
                    ])
                    mid.closeSubpath()
                    ctx.fill(mid, with: .color(Color(red: 77/255, green: 44/255, blue: 66/255)))

                    var near = Path()
                    near.move(to: CGPoint(x: 0, y: h))
                    near.addLines([
                        CGPoint(x: 0,          y: h * 0.88),
                        CGPoint(x: w * 0.11,   y: h * 0.67),
                        CGPoint(x: w * 0.2,    y: h * 0.77),
                        CGPoint(x: w * 0.31,   y: h * 0.54),
                        CGPoint(x: w * 0.35,   y: h * 0.59),
                        CGPoint(x: w * 0.36,   y: h * 0.54),
                        CGPoint(x: w * 0.47,   y: h * 0.75),
                        CGPoint(x: w * 0.57,   y: h * 0.59),
                        CGPoint(x: w * 0.6,    y: h * 0.63),
                        CGPoint(x: w * 0.63,   y: h * 0.59),
                        CGPoint(x: w * 0.75,   y: h * 0.81),
                        CGPoint(x: w * 0.87,   y: h * 0.71),
                        CGPoint(x: w,          y: h * 0.83),
                        CGPoint(x: w,          y: h),
                    ])
                    near.closeSubpath()
                    ctx.fill(near, with: .color(Color(red: 36/255, green: 19/255, blue: 38/255)))

                    let snowTint = Color(red: 244/255, green: 233/255, blue: 218/255).opacity(0.85)
                    for (cx, top, spread) in [(0.31, 0.54, 0.035), (0.47, 0.45, 0.035), (0.6, 0.59, 0.03)] {
                        var cap = Path()
                        cap.move(to: CGPoint(x: w * (cx - spread), y: h * (top + 0.05)))
                        cap.addLine(to: CGPoint(x: w * cx, y: h * top))
                        cap.addLine(to: CGPoint(x: w * (cx + spread), y: h * (top + 0.05)))
                        ctx.fill(cap, with: .color(snowTint))
                    }
                }
            }

            LinearGradient(
                colors: [.clear, ink.opacity(0.15), ink.opacity(0.95)],
                startPoint: .top, endPoint: .bottom
            )

            VStack(spacing: 6) {
                Image(systemName: "mountain.2.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white.opacity(0.92))
                    .shadow(color: .black.opacity(0.5), radius: 8, y: 2)
                Text("Every summit earns a badge — let's earn one")
                    .font(.subheadline.bold())
                    .foregroundColor(.white.opacity(0.92))
                    .shadow(color: .black.opacity(0.5), radius: 8, y: 2)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 24)
        }
        .frame(height: 190)
        .clipped()
    }
}

// MARK: - Climb success modal

private struct ClimbSuccessView: View {
    let mountain: Mountain
    let climbDate: Date
    let climbId: Int
    let ascentCount: Int
    @Environment(\.dismiss) private var dismiss
    @State private var badgeUIImage: UIImage?

    private let emerald   = Color(red: 52/255,  green: 211/255, blue: 153/255)
    private let bgColor   = Color(red: 3/255,   green: 7/255,   blue: 18/255)
    private let cardColor = Color(red: 17/255,  green: 24/255,  blue: 39/255)

    private var badgeURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/\(mountain.id)/png?climbed=1")
    }

    private var shareURL: URL? {
        URL(string: "\(Config.apiBaseURL)/s/\(climbId)")
    }

    private var titleText: String {
        if ascentCount <= 1 { return "Summit Achieved!" }
        let fmt = NumberFormatter()
        fmt.numberStyle = .ordinal
        let ordinal = fmt.string(from: NSNumber(value: ascentCount)) ?? "\(ascentCount)"
        return "\(ordinal) Ascent!"
    }

    private var shareText: String {
        let dateFmt = DateFormatter()
        dateFmt.dateStyle = .medium
        let verb: String
        if ascentCount > 1 {
            let ordFmt = NumberFormatter()
            ordFmt.numberStyle = .ordinal
            let ordinal = ordFmt.string(from: NSNumber(value: ascentCount)) ?? "\(ascentCount)"
            verb = "Summited \(mountain.name) for the \(ordinal) time"
        } else {
            verb = "Just summited \(mountain.name)"
        }
        let base = "\(verb) (\(mountain.elevation.formatted()) ft) on \(dateFmt.string(from: climbDate))! #Colorado14ers #14ers"
        if let url = shareURL {
            return "\(base)\n\(url.absoluteString)"
        }
        return base
    }

    var body: some View {
        ZStack {
            bgColor.ignoresSafeArea()
            ConfettiView()

            ScrollView {
                VStack(spacing: 28) {
                    VStack(spacing: 8) {
                        Text(titleText)
                            .font(.largeTitle.bold())
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                        Image(systemName: ascentCount > 1 ? "arrow.trianglehead.2.clockwise.rotate.90" : "mountain.2.fill")
                            .font(.system(size: 44))
                            .foregroundColor(emerald)
                    }
                    .padding(.top, 48)

                    // Badge with optional repeat-ascent pill overlay
                    ZStack(alignment: .topTrailing) {
                        CachedAsyncImage(url: badgeURL) { img in
                            img.resizable().aspectRatio(contentMode: .fit)
                        } placeholder: {
                            ProgressView().tint(emerald).frame(height: 200)
                        }
                        if ascentCount > 1 {
                            Text("×\(ascentCount)")
                                .font(.system(size: 13, weight: .black, design: .rounded))
                                .foregroundColor(Color(red: 3/255, green: 7/255, blue: 18/255))
                                .padding(.horizontal, 9)
                                .padding(.vertical, 4)
                                .background(emerald)
                                .clipShape(Capsule())
                                .padding(.top, 4)
                                .padding(.trailing, 4)
                        }
                    }
                    .frame(maxWidth: 220)
                    .shadow(color: emerald.opacity(0.35), radius: 24)

                    VStack(spacing: 6) {
                        Text(mountain.name)
                            .font(.title2.bold())
                            .foregroundColor(.white)
                        Text("\(mountain.elevation.formatted()) ft  ·  \(mountain.range)")
                            .font(.subheadline)
                            .foregroundColor(emerald)
                        Text(climbDate, style: .date)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }

                    VStack(spacing: 12) {
                        shareButton
                        Button("Done") { dismiss() }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(cardColor)
                            .cornerRadius(14)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 48)
                }
            }
        }
        .task {
            guard let url = badgeURL,
                  let (data, _) = try? await URLSession.shared.data(from: url) else { return }
            badgeUIImage = UIImage(data: data)
        }
    }

    @ViewBuilder
    private var shareButton: some View {
        let label = HStack(spacing: 8) {
            Image(systemName: "square.and.arrow.up")
            Text("Share Your Summit")
        }
        .font(.headline)
        .foregroundColor(bgColor)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(emerald)
        .cornerRadius(14)

        if let img = badgeUIImage {
            ShareLink(
                item: shareText,
                preview: SharePreview(mountain.name, image: Image(uiImage: img))
            ) { label }
        } else {
            ShareLink(item: shareText) { label }
        }
    }
}

// MARK: - Confetti animation

private struct ConfettiView: View {
    private struct Piece: Identifiable {
        let id: Int
        let xFraction: CGFloat
        let delay: Double
        let duration: Double
        let color: Color
        let width: CGFloat
        let height: CGFloat
        let startRotation: Double
    }

    private static func makePieces() -> [Piece] {
        let colors: [Color] = [
            Color(red: 52/255, green: 211/255, blue: 153/255),
            Color(red: 56/255, green: 189/255, blue: 248/255),
            .yellow, .orange, .pink, .purple,
            Color(red: 251/255, green: 191/255, blue: 36/255)
        ]
        return (0..<80).map { i in
            Piece(
                id: i,
                xFraction: CGFloat(i % 20) / 20.0 + CGFloat.random(in: -0.03...0.03),
                delay: Double.random(in: 0...1.2),
                duration: Double.random(in: 1.8...3.2),
                color: colors[i % colors.count],
                width: CGFloat.random(in: 5...12),
                height: CGFloat.random(in: 3...7),
                startRotation: Double.random(in: 0...360)
            )
        }
    }

    @State private var pieces: [Piece] = []
    @State private var fall = false

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(pieces) { piece in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(piece.color)
                        .frame(width: piece.width, height: piece.height)
                        .rotationEffect(.degrees(piece.startRotation + (fall ? 720 : 0)))
                        .position(
                            x: piece.xFraction * geo.size.width,
                            y: fall ? geo.size.height + 40 : -20
                        )
                        .animation(
                            .easeIn(duration: piece.duration).delay(piece.delay),
                            value: fall
                        )
                }
            }
        }
        .onAppear {
            if pieces.isEmpty { pieces = Self.makePieces() }
            fall = true
        }
        .allowsHitTesting(false)
    }
}
