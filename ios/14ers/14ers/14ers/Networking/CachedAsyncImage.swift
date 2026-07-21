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
    func image(for url: URL) async -> UIImage? {
        if let img = memory.object(forKey: url as NSURL) { return img }

        let file = diskDir.appendingPathComponent(key(for: url))
        if let data = try? Data(contentsOf: file), let img = UIImage(data: data) {
            memory.setObject(img, forKey: url as NSURL)
            return img
        }

        guard let (data, response) = try? await session.data(from: url) else { return nil }
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 { return nil }
        guard let img = UIImage(data: data) else { return nil }
        memory.setObject(img, forKey: url as NSURL)
        try? data.write(to: file, options: .atomic)
        return img
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
