import SwiftUI
import Photos
import CoreLocation
import UIKit

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

private let photoGridColumns = 3
private let photoGridSpacing: CGFloat = 6
private let photoGridHorizontalPadding: CGFloat = 16

private var photoGridCellSize: CGFloat {
    let totalSpacing = photoGridHorizontalPadding * 2 + photoGridSpacing * CGFloat(photoGridColumns - 1)
    return (UIScreen.main.bounds.width - totalSpacing) / CGFloat(photoGridColumns)
}

/// A photo selected in NearbyPeakPhotosView, with the peak/date already known
/// from the geo-match — no EXIF re-parsing needed by the caller.
struct NearbyPhotoSelection {
    let data: Data
    let mountainId: Int
    let date: Date?
}

/// Full-screen browser for geo-tagged library photos near any tracked peak —
/// scans the *entire* library (not just recent shots), grouped by year so
/// scrolling down is literally scrolling back through the camera roll.
struct NearbyPeakPhotosView: View {
    let mountains: [Mountain]
    /// Called with each selected photo (data + its matched peak/date), in the
    /// order they were tapped — the first becomes the cover if this is the
    /// user's first photo pick.
    let onAdd: ([NearbyPhotoSelection]) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var isScanning = true
    @State private var accessDenied = false
    @State private var yearGroups: [(year: Int, items: [PhotoMatch])] = []
    @State private var selectedIds: [String] = []
    @State private var isPreparingSelection = false

    struct PhotoMatch: Identifiable {
        let asset: PHAsset
        let mountainId: Int
        var id: String { asset.localIdentifier }
    }

    var body: some View {
        NavigationView {
            Group {
                if isScanning {
                    VStack(spacing: 14) {
                        ProgressView().tint(.white)
                        Text("Scanning your library for peak photos…")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if accessDenied {
                    VStack(spacing: 10) {
                        Image(systemName: "lock.fill").font(.system(size: 36)).foregroundColor(.gray.opacity(0.5))
                        Text("Photo access needed").font(.subheadline.bold()).foregroundColor(.white)
                        Text("Allow photo access in Settings to find nearby climb photos.")
                            .font(.caption).foregroundColor(.gray).multilineTextAlignment(.center).padding(.horizontal, 40)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if yearGroups.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "photo.on.rectangle.angled").font(.system(size: 36)).foregroundColor(.gray.opacity(0.4))
                        Text("No climb photos found").font(.subheadline.bold()).foregroundColor(.white)
                        Text("Nothing in your library is geo-tagged within 2 miles of a peak.")
                            .font(.caption).foregroundColor(.gray).multilineTextAlignment(.center).padding(.horizontal, 40)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    VStack(spacing: 0) {
                        Text("Within 2 miles of a peak · your whole library, newest first")
                            .font(.caption2)
                            .foregroundColor(.gray)
                            .padding(.top, 8)
                            .padding(.bottom, 4)

                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 4) {
                                ForEach(yearGroups, id: \.year) { group in
                                    Text(String(group.year))
                                        .font(.subheadline.bold())
                                        .foregroundColor(.gray)
                                        .padding(.top, 10)
                                        .padding(.bottom, 6)

                                    VStack(spacing: photoGridSpacing) {
                                        ForEach(Array(rows(for: group.items).enumerated()), id: \.offset) { _, row in
                                            HStack(spacing: photoGridSpacing) {
                                                ForEach(row) { match in
                                                    PhotoMatchCell(
                                                        match: match,
                                                        mountainName: mountains.first(where: { $0.id == match.mountainId })?.name ?? "Peak",
                                                        isSelected: selectedIds.contains(match.id),
                                                        cellSize: photoGridCellSize
                                                    )
                                                    .onTapGesture { toggle(match.id) }
                                                }
                                                if row.count < photoGridColumns {
                                                    ForEach(0..<(photoGridColumns - row.count), id: \.self) { _ in
                                                        Color.clear
                                                            .frame(width: photoGridCellSize, height: photoGridCellSize)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, photoGridHorizontalPadding)
                            .padding(.bottom, 90)
                        }
                    }
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Nearby Peak Photos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundColor(sky)
                }
            }
            .safeAreaInset(edge: .bottom) {
                if !selectedIds.isEmpty {
                    Button {
                        Task { await confirmSelection() }
                    } label: {
                        HStack {
                            if isPreparingSelection {
                                ProgressView().tint(Color(red: 3/255, green: 7/255, blue: 18/255))
                            } else {
                                Text("Add \(selectedIds.count) Photo\(selectedIds.count == 1 ? "" : "s")").bold()
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(emerald)
                        .foregroundColor(Color(red: 3/255, green: 7/255, blue: 18/255))
                        .cornerRadius(16)
                    }
                    .disabled(isPreparingSelection)
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial)
                }
            }
        }
        .task { await scan() }
    }

    private func toggle(_ id: String) {
        if let idx = selectedIds.firstIndex(of: id) {
            selectedIds.remove(at: idx)
        } else {
            selectedIds.append(id)
        }
    }

    /// Chunks matches into fixed-width rows manually rather than relying on
    /// LazyVGrid, which — nested inside a LazyVStack/ScrollView — is prone to
    /// giving each cell its own ungoverned size instead of a uniform grid.
    private func rows(for items: [PhotoMatch]) -> [[PhotoMatch]] {
        stride(from: 0, to: items.count, by: photoGridColumns).map {
            Array(items[$0..<min($0 + photoGridColumns, items.count)])
        }
    }

    // MARK: - Scan

    private func scan() async {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        guard status == .authorized || status == .limited else {
            isScanning = false
            accessDenied = true
            return
        }

        let peaks = mountains.compactMap { m -> (id: Int, location: CLLocation)? in
            guard let lat = m.lat, let lng = m.lng else { return nil }
            return (m.id, CLLocation(latitude: lat, longitude: lng))
        }
        let found: [(String, Int, Date?)] = await withCheckedContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                let opts = PHFetchOptions()
                opts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
                let result = PHAsset.fetchAssets(with: .image, options: opts)
                var nearby: [(String, Int, Date?)] = []
                result.enumerateObjects { asset, _, stop in
                    guard let loc = asset.location else { return }
                    for peak in peaks {
                        let d = peak.location.distance(from: loc)
                        if d <= twoMilesMeters {
                            nearby.append((asset.localIdentifier, peak.id, asset.creationDate))
                            return
                        }
                    }
                    if nearby.count >= 500 { stop.pointee = true }
                }
                cont.resume(returning: nearby)
            }
        }

        let ids = found.map(\.0)
        let refetch = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        var matches: [PhotoMatch] = []
        refetch.enumerateObjects { asset, _, _ in
            if let match = found.first(where: { $0.0 == asset.localIdentifier }) {
                matches.append(PhotoMatch(asset: asset, mountainId: match.1))
            }
        }
        // Re-sort by creationDate desc since PHFetchAssets(withLocalIdentifiers:) doesn't preserve order.
        matches.sort { ($0.asset.creationDate ?? .distantPast) > ($1.asset.creationDate ?? .distantPast) }

        let calendar = Calendar.current
        let grouped = Dictionary(grouping: matches) { match in
            calendar.component(.year, from: match.asset.creationDate ?? Date())
        }
        yearGroups = grouped.keys.sorted(by: >).map { year in
            (year: year, items: grouped[year] ?? [])
        }
        isScanning = false
    }

    // MARK: - Confirm

    private func confirmSelection() async {
        isPreparingSelection = true
        defer { isPreparingSelection = false }

        let allMatches = yearGroups.flatMap(\.items)
        var selections: [NearbyPhotoSelection] = []
        for id in selectedIds {
            guard let match = allMatches.first(where: { $0.id == id }) else { continue }
            let opts = PHImageRequestOptions()
            opts.deliveryMode = .highQualityFormat
            opts.isNetworkAccessAllowed = true
            opts.version = .current
            let raw: Data? = await withCheckedContinuation { cont in
                PHImageManager.default().requestImageDataAndOrientation(for: match.asset, options: opts) { data, _, _, _ in
                    cont.resume(returning: data)
                }
            }
            if let raw, let compressed = compress(raw) {
                selections.append(NearbyPhotoSelection(data: compressed, mountainId: match.mountainId, date: match.asset.creationDate))
            }
        }
        onAdd(selections)
        dismiss()
    }

    private func compress(_ data: Data) -> Data? {
        guard let uiImage = UIImage(data: data) else { return data }
        let maxDim: CGFloat = 1200
        let size = uiImage.size
        let scale = min(maxDim / max(size.width, size.height), 1.0)
        guard scale < 1.0 else { return uiImage.jpegData(compressionQuality: 0.8) }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in uiImage.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: 0.8)
    }
}

// MARK: - Photo cell

private struct PhotoMatchCell: View {
    let match: NearbyPeakPhotosView.PhotoMatch
    let mountainName: String
    let isSelected: Bool
    let cellSize: CGFloat

    @State private var thumb: UIImage?

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Group {
                if let thumb {
                    Image(uiImage: thumb).resizable().scaledToFill()
                } else {
                    card
                }
            }
            .frame(width: cellSize, height: cellSize)
            .clipped()

            Text(mountainName)
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.horizontal, 5)
                .padding(.vertical, 2)
                .background(Color.black.opacity(0.6))
                .cornerRadius(5)
                .padding(4)

            VStack {
                HStack {
                    Spacer()
                    ZStack {
                        Circle()
                            .fill(isSelected ? emerald : Color.black.opacity(0.45))
                            .frame(width: 20, height: 20)
                        Circle()
                            .stroke(Color.white.opacity(0.8), lineWidth: 1.3)
                            .frame(width: 20, height: 20)
                        if isSelected {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .black))
                                .foregroundColor(Color(red: 3/255, green: 7/255, blue: 18/255))
                        }
                    }
                    .padding(5)
                }
                Spacer()
            }
        }
        .frame(width: cellSize, height: cellSize)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isSelected ? emerald : Color.white.opacity(0.06), lineWidth: isSelected ? 2 : 1)
        )
        .task(id: match.id) { thumb = await loadThumb() }
    }

    private func loadThumb() async -> UIImage? {
        let opts = PHImageRequestOptions()
        opts.deliveryMode = .highQualityFormat
        opts.resizeMode = .exact
        opts.isNetworkAccessAllowed = false
        let pixelSize = cellSize * UIScreen.main.scale
        return await withCheckedContinuation { cont in
            PHImageManager.default().requestImage(
                for: match.asset,
                targetSize: CGSize(width: pixelSize, height: pixelSize),
                contentMode: .aspectFill,
                options: opts
            ) { img, _ in cont.resume(returning: img) }
        }
    }
}
