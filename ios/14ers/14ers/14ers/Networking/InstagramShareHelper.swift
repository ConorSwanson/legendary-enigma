import SwiftUI

/// Native "Share to Instagram Story" via Instagram's pasteboard-based share
/// extension API (instagram-stories://share) -- distinct from the generic
/// ShareLink used elsewhere, since Instagram's system share extension can't
/// pre-fill a Story background image or a link sticker on its own.
enum InstagramShareHelper {
    private static let shareURLScheme = URL(string: "instagram-stories://share")!

    static var isInstagramInstalled: Bool {
        UIApplication.shared.canOpenURL(shareURLScheme)
    }

    static func shareStory(backgroundImage: UIImage, linkURL: URL) {
        guard let pngData = backgroundImage.pngData(),
              let openURL = URL(string: "instagram-stories://share?source_application=\(Config.facebookAppId)")
        else { return }

        let pasteboardItems: [String: Any] = [
            "com.instagram.sharedSticker.backgroundImage": pngData,
            "com.instagram.sharedSticker.contentURL": linkURL.absoluteString,
        ]
        UIPasteboard.general.setItems(
            [pasteboardItems],
            options: [.expirationDate: Date().addingTimeInterval(5 * 60)]
        )
        UIApplication.shared.open(openURL)
    }
}

/// SF Symbols has no Instagram glyph, so share buttons tint a plain camera
/// icon with Instagram's signature gradient to make the affordance readable.
let instagramGradient = LinearGradient(
    colors: [
        Color(red: 0.98, green: 0.71, blue: 0.20),
        Color(red: 0.88, green: 0.24, blue: 0.42),
        Color(red: 0.51, green: 0.19, blue: 0.72),
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
)
