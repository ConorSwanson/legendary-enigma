import SwiftUI
import PhotosUI
import Photos
import CoreLocation
import ImageIO
import UIKit

private let twoMilesMeters: Double = 3_218.69

struct LogClimbView: View {
    @State private var mountains: [Mountain] = []
    @State private var selectedMountainId: Int?
    @State private var date = Date()
    @State private var notes = ""
    @State private var visibility = "public"
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showSuccess = false
    @EnvironmentObject var userState: UserState

    // Manual photo picker
    @State private var pickerItem: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var photoImage: Image?

    // Smart suggestions
    @State private var suggestedAssets: [(asset: PHAsset, mountainId: Int)] = []
    @State private var selectedSuggestedId: String?
    @State private var isSearching = false
    @State private var didSearch = false
    @State private var photoAccessDenied = false

    // Mountain auto-detect from EXIF
    @State private var detectedMountainId: Int?
    @State private var detectedMountainName: String?

    // Full-size photo preview
    @State private var previewAsset: PHAsset?

    var body: some View {
        NavigationView {
            Form {
                peakSection
                if let detectedId = detectedMountainId,
                   let detectedName = detectedMountainName,
                   selectedMountainId == nil {
                    Section {
                        Button { selectedMountainId = detectedId } label: {
                            Label("Near \(detectedName) — tap to select", systemImage: "mappin.circle.fill")
                                .font(.subheadline)
                                .foregroundColor(.orange)
                        }
                    }
                }
                dateSection
                photoSection
                notesSection
                visibilitySection
                if let saveError {
                    Section {
                        Text(saveError).foregroundColor(.red).font(.caption)
                    }
                }
                saveSection
            }
            .navigationTitle("Log a Climb")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { HeaderAvatar() }
                ToolbarItem(placement: .navigationBarTrailing) { NotificationBellButton() }
            }
            .alert("Climb Logged!", isPresented: $showSuccess) {
                Button("Done") { resetForm() }
            } message: {
                Text("Your summit has been recorded.")
            }
        }
        .task { mountains = (try? await APIClient.shared.mountains()) ?? [] }
        .onChange(of: pickerItem) { Task { await loadPickedPhoto() } }
        .sheet(isPresented: Binding(
            get: { previewAsset != nil },
            set: { if !$0 { previewAsset = nil } }
        )) {
            if let asset = previewAsset {
                PhotoPreviewSheet(asset: asset)
            }
        }
    }

    // MARK: - Form Sections

    @ViewBuilder
    private var peakSection: some View {
        Section("Peak") {
            if mountains.isEmpty {
                ProgressView()
            } else {
                Picker("Mountain", selection: $selectedMountainId) {
                    Text("Select a peak").tag(nil as Int?)
                    ForEach(mountains) { m in
                        Text("\(m.name) — \(m.elevation.formatted()) ft").tag(m.id as Int?)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var dateSection: some View {
        Section("Date") {
            DatePicker("Climb Date", selection: $date, in: ...Date(), displayedComponents: .date)
        }
    }

    @ViewBuilder
    private var photoSection: some View {
        Section("Photo (optional)") {
            // Suggested results
            if !suggestedAssets.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Nearby climb photos (\(suggestedAssets.count) found)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(suggestedAssets, id: \.asset.localIdentifier) { item in
                                ZStack(alignment: .topTrailing) {
                                    SuggestedPhotoThumb(asset: item.asset)
                                        .frame(width: 80, height: 80)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(
                                                    selectedSuggestedId == item.asset.localIdentifier
                                                        ? Color.accentColor : Color.clear,
                                                    lineWidth: 2
                                                )
                                        )
                                        .onTapGesture { Task { await selectSuggested(item) } }
                                    Button {
                                        previewAsset = item.asset
                                    } label: {
                                        Image(systemName: "arrow.up.left.and.arrow.down.right")
                                            .font(.system(size: 8, weight: .bold))
                                            .foregroundColor(.white)
                                            .padding(4)
                                            .background(Color.black.opacity(0.55))
                                            .clipShape(RoundedRectangle(cornerRadius: 4))
                                    }
                                    .padding(4)
                                }
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            // Find button
            if !didSearch {
                Button {
                    Task { await searchNearbyPhotos() }
                } label: {
                    HStack {
                        if isSearching {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "mappin.and.ellipse")
                        }
                        Text(isSearching ? "Scanning photo library…" : "Find Nearby Climb Photos")
                    }
                }
                .disabled(isSearching)
            } else if suggestedAssets.isEmpty && !photoAccessDenied {
                Label("No climb photos found near the 58 peaks", systemImage: "xmark.circle")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if photoAccessDenied {
                Label("Allow photo access in Settings to enable this feature", systemImage: "lock.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Browse all manually
            PhotosPicker(selection: $pickerItem, matching: .images) {
                HStack {
                    if let photoImage {
                        photoImage
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 60, height: 60)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    Text(photoData == nil ? "Browse All Photos" : "Change Photo")
                        .foregroundColor(.accentColor)
                }
            }

            if photoData != nil {
                Button("Remove Photo", role: .destructive) { clearPhoto() }
            }
        }
    }

    @ViewBuilder
    private var notesSection: some View {
        Section("Notes (optional)") {
            TextEditor(text: $notes).frame(minHeight: 80)
        }
    }

    @ViewBuilder
    private var visibilitySection: some View {
        Section("Visibility") {
            Picker("Who can see this", selection: $visibility) {
                Text("Public").tag("public")
                Text("Followers").tag("followers")
                Text("Private").tag("private")
            }
            .pickerStyle(.segmented)
        }
    }

    @ViewBuilder
    private var saveSection: some View {
        Section {
            Button { Task { await save() } } label: {
                HStack {
                    Spacer()
                    Text(isSaving ? "Saving…" : "Log Climb").bold()
                    Spacer()
                }
            }
            .disabled(selectedMountainId == nil || isSaving)
        }
    }

    // MARK: - Smart photo search

    private func searchNearbyPhotos() async {
        isSearching = true

        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        guard status == .authorized || status == .limited else {
            isSearching = false
            didSearch = true
            photoAccessDenied = true
            return
        }

        let peaks = allPeakCoordinates

        // Scan on background thread — return only Sendable (String, Int) pairs
        let found: [(String, Int)] = await withCheckedContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                let opts = PHFetchOptions()
                opts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
                let result = PHAsset.fetchAssets(with: .image, options: opts)
                var nearby: [(String, Int)] = []
                result.enumerateObjects { asset, _, stop in
                    guard let loc = asset.location else { return }
                    for peak in peaks {
                        let d = CLLocation(latitude: peak.latitude, longitude: peak.longitude)
                            .distance(from: loc)
                        if d <= twoMilesMeters {
                            nearby.append((asset.localIdentifier, peak.mountainId))
                            return
                        }
                    }
                    if nearby.count >= 30 { stop.pointee = true }
                }
                cont.resume(returning: nearby)
            }
        }

        // Re-fetch PHAssets on main actor by localIdentifier
        let ids = found.map(\.0)
        let refetch = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        var pairs: [(asset: PHAsset, mountainId: Int)] = []
        refetch.enumerateObjects { asset, _, _ in
            if let match = found.first(where: { $0.0 == asset.localIdentifier }) {
                pairs.append((asset: asset, mountainId: match.1))
            }
        }

        suggestedAssets = pairs
        isSearching = false
        didSearch = true
    }

    // MARK: - Select a suggested photo

    private func selectSuggested(_ item: (asset: PHAsset, mountainId: Int)) async {
        selectedSuggestedId = item.asset.localIdentifier
        pickerItem = nil

        // Auto-suggest the mountain
        detectedMountainId = item.mountainId
        detectedMountainName = mountains.first(where: { $0.id == item.mountainId })?.name

        // Use photo's creation date as the climb date
        if let creationDate = item.asset.creationDate {
            date = creationDate
        }

        let opts = PHImageRequestOptions()
        opts.deliveryMode = .highQualityFormat
        opts.isNetworkAccessAllowed = true
        opts.version = .current

        let raw: Data? = await withCheckedContinuation { cont in
            PHImageManager.default()
                .requestImageDataAndOrientation(for: item.asset, options: opts) { data, _, _, _ in
                    cont.resume(returning: data)
                }
        }

        if let raw {
            let compressed = compressPhoto(raw)
            photoData = compressed
            if let uiImage = UIImage(data: compressed) {
                photoImage = Image(uiImage: uiImage)
            }
        }
    }

    // MARK: - Manual picker load + EXIF

    private func loadPickedPhoto() async {
        guard let item = pickerItem,
              let raw = try? await item.loadTransferable(type: Data.self) else { return }
        let compressed = compressPhoto(raw)
        photoData = compressed
        selectedSuggestedId = nil
        if let uiImage = UIImage(data: compressed) {
            photoImage = Image(uiImage: uiImage)
        }
        detectPeakFromExif(raw)
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

    private func clearPhoto() {
        pickerItem = nil
        photoData = nil
        photoImage = nil
        selectedSuggestedId = nil
        detectedMountainId = nil
        detectedMountainName = nil
    }

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

    private func save() async {
        guard let mountainId = selectedMountainId else { return }
        isSaving = true
        saveError = nil
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        do {
            _ = try await APIClient.shared.logClimb(
                mountainId: mountainId,
                date: formatter.string(from: date),
                notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes,
                visibility: visibility,
                photoData: photoData
            )
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
        clearPhoto()
        suggestedAssets = []
        didSearch = false
        photoAccessDenied = false
    }
}

// MARK: - Suggested photo thumbnail

private struct SuggestedPhotoThumb: View {
    let asset: PHAsset
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
            } else {
                Color(.systemGray5)
            }
        }
        .task { image = await loadThumb() }
    }

    private func loadThumb() async -> UIImage? {
        let opts = PHImageRequestOptions()
        opts.deliveryMode = .fastFormat
        opts.isNetworkAccessAllowed = false
        return await withCheckedContinuation { cont in
            PHImageManager.default().requestImage(
                for: asset,
                targetSize: CGSize(width: 160, height: 160),
                contentMode: .aspectFill,
                options: opts
            ) { img, _ in cont.resume(returning: img) }
        }
    }
}

// MARK: - Full-size photo preview sheet

private struct PhotoPreviewSheet: View {
    let asset: PHAsset
    @State private var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .ignoresSafeArea()
            } else {
                ProgressView().tint(.white)
            }
        }
        .overlay(alignment: .topTrailing) {
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 30))
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(Color.white, Color.black.opacity(0.5))
                    .padding()
            }
        }
        .task { image = await loadFullImage() }
    }

    private func loadFullImage() async -> UIImage? {
        let opts = PHImageRequestOptions()
        opts.deliveryMode = .highQualityFormat
        opts.isNetworkAccessAllowed = true
        opts.version = .current
        return await withCheckedContinuation { cont in
            PHImageManager.default()
                .requestImageDataAndOrientation(for: asset, options: opts) { data, _, _, _ in
                    cont.resume(returning: data.flatMap { UIImage(data: $0) })
                }
        }
    }
}
