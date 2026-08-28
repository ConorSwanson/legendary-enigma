import SwiftUI
import UIKit
import CryptoKit

/// Shared memory + disk image cache. Decoded images are kept in memory (NSCache)
/// for instant re-display, and raw bytes are persisted to disk so they survive
/// across launches. Fetches go through a URLSession with its own URLCache too.
final class ImageCache: @unchecked Sendable {
    static let shared = ImageCache()

    private let memory = NSCache<NSURL, UIImage>()
    private let diskDir: URL
    private let session: URLSession

    private init() {
        memory.countLimit = 400

        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        diskDir = caches.appendingPathComponent("img-cache", isDirectory: true)
        try? FileManager.default.createDirectory(at: diskDir, withIntermediateDirectories: true)

        let cfg = URLSessionConfiguration.default
        cfg.urlCache = URLCache(memoryCapacity: 32 * 1024 * 1024, diskCapacity: 256 * 1024 * 1024)
        cfg.requestCachePolicy = .returnCacheDataElseLoad
        session = URLSession(configuration: cfg)
    }

    /// Synchronous memory-only lookup — used to show cached images with zero delay.
    func memoryImage(for url: URL) -> UIImage? {
        memory.object(forKey: url as NSURL)
    }

    /// Full lookup: memory → disk → network. Populates the faster tiers on the way.
    /// A disk hit still kicks off a background revalidation against the server's
    /// ETag (see `revalidate`) -- without it, a badge fixed server-side (new
    /// art, a corrected name, a rebalanced palette) would never reach a device
    /// that already cached the old bytes, since this cache has no expiry and
    /// is keyed only by URL. The revalidation is a cheap 304 the rest of the
    /// time, and updates memory+disk in place on the rare occasion it isn't.
    func image(for url: URL) async -> UIImage? {
        if let img = memory.object(forKey: url as NSURL) { return img }

        let file = diskDir.appendingPathComponent(key(for: url))
        if let data = try? Data(contentsOf: file), let img = UIImage(data: data) {
            memory.setObject(img, forKey: url as NSURL)
            Task.detached(priority: .background) { [weak self] in
                await self?.revalidate(url: url, file: file)
            }
            return img
        }

        guard let (data, response) = try? await session.data(from: url) else { return nil }
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
        guard let img = UIImage(data: data) else { return nil }
        memory.setObject(img, forKey: url as NSURL)
        try? data.write(to: file, options: .atomic)
        if let etag = http.value(forHTTPHeaderField: "ETag") {
            try? etag.write(to: etagFile(for: url), atomically: true, encoding: .utf8)
        }
        return img
    }

    /// Asks the server "did this change?" via If-None-Match. 304 means the
    /// on-disk copy is still current, so it's left alone; 200 means the
    /// content actually changed, so memory+disk get overwritten with the
    /// fresh bytes for next time. Bypasses URLSession's own HTTP cache
    /// (which would otherwise just hand back the same stale response we're
    /// trying to get past) since this cache's own ETag file is the source
    /// of truth here, not URLCache's.
    private func revalidate(url: URL, file: URL) async {
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
        if let etag = try? String(contentsOf: etagFile(for: url), encoding: .utf8) {
            request.setValue(etag, forHTTPHeaderField: "If-None-Match")
        }
        guard let (data, response) = try? await session.data(for: request),
              let http = response as? HTTPURLResponse else { return }
        if http.statusCode == 304 { return }
        guard http.statusCode == 200, let img = UIImage(data: data) else { return }
        memory.setObject(img, forKey: url as NSURL)
        try? data.write(to: file, options: .atomic)
        if let etag = http.value(forHTTPHeaderField: "ETag") {
            try? etag.write(to: etagFile(for: url), atomically: true, encoding: .utf8)
        }
    }

    private func etagFile(for url: URL) -> URL {
        diskDir.appendingPathComponent(key(for: url) + ".etag")
    }

    /// Warm the cache for a set of URLs (e.g. after loading a feed) so they're
    /// ready before the user scrolls to them.
    func prefetch(_ urls: [URL?]) {
        for case let url? in urls where memory.object(forKey: url as NSURL) == nil {
            Task.detached(priority: .utility) { _ = await ImageCache.shared.image(for: url) }
        }
    }

    private func key(for url: URL) -> String {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

/// Drop-in replacement for AsyncImage's two-closure form, backed by ImageCache.
/// A cached image renders synchronously on first frame (no spinner flash); a new
/// image fades in once fetched.
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    private let url: URL?
    private let content: (Image) -> Content
    private let placeholder: () -> Placeholder

    @State private var uiImage: UIImage?
    @State private var loadedURL: URL?

    init(url: URL?,
         @ViewBuilder content: @escaping (Image) -> Content,
         @ViewBuilder placeholder: @escaping () -> Placeholder) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
        if let url, let mem = ImageCache.shared.memoryImage(for: url) {
            _uiImage = State(initialValue: mem)
            _loadedURL = State(initialValue: url)
        }
    }

    var body: some View {
        Group {
            if let uiImage {
                content(Image(uiImage: uiImage))
            } else {
                placeholder()
            }
        }
        .task(id: url) {
            // Already showing the right image (e.g. same instance reappearing).
            if loadedURL == url, uiImage != nil { return }
            guard let url else { uiImage = nil; loadedURL = nil; return }
            if let mem = ImageCache.shared.memoryImage(for: url) {
                uiImage = mem
                loadedURL = url
                return
            }
            if let img = await ImageCache.shared.image(for: url) {
                withAnimation(.easeIn(duration: 0.15)) {
                    uiImage = img
                    loadedURL = url
                }
            }
        }
    }
}
