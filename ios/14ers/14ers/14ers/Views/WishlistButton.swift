import SwiftUI

private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

/// Bookmark toggle used identically in mountain, climb, and badge detail
/// views so "add to wishlist" works the same everywhere in the app. Owns
/// only the toggle + optimistic update; the parent view owns the actual
/// `isWishlisted` state (usually seeded from whatever detail payload it
/// already fetched) so this stays a plain, reusable control.
struct WishlistButton: View {
    let mountainId: Int
    @Binding var isWishlisted: Bool
    @State private var isToggling = false

    var body: some View {
        Button {
            Task { await toggle() }
        } label: {
            Image(systemName: isWishlisted ? "bookmark.fill" : "bookmark")
                .font(.system(size: 17))
                .foregroundColor(isWishlisted ? emerald : .white)
        }
        .buttonStyle(.plain)
        .disabled(isToggling)
    }

    private func toggle() async {
        let previous = isWishlisted
        isWishlisted.toggle()
        isToggling = true
        defer { isToggling = false }
        do {
            if isWishlisted {
                try await APIClient.shared.addToWishlist(mountainId: mountainId)
            } else {
                try await APIClient.shared.removeFromWishlist(mountainId: mountainId)
            }
        } catch {
            isWishlisted = previous
        }
    }
}
