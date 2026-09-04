import SwiftUI

private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

/// Bookmark toggle used identically in mountain, climb, badge, and feed
/// views so "add to wishlist" works the same everywhere in the app. Owns
/// only the toggle + optimistic update; the parent view owns the actual
/// `isWishlisted` state (usually seeded from whatever detail payload it
/// already fetched) so this stays a plain, reusable control. Sizing/tint
/// are parameterized rather than fixed, so it can drop into a toolbar
/// (small, unpadded) or sit inline next to a screen's own heart/comment/
/// share row (matching their icon size and tap-target padding) without
/// looking like a bolted-on outlier in either place.
///
/// `confirmOnAdd` shows a quick "Add to Wishlist?" prompt before the first
/// save -- meant for lower-context spots like a Feed card, where the icon
/// shows up next to heart/comment/share with no other explanation of what
/// it does. Detail views leave it off since the page itself (its title,
/// its own dedicated screen) already makes that obvious.
struct WishlistButton: View {
    let mountainId: Int
    var mountainName: String? = nil
    var confirmOnAdd: Bool = false
    var iconSize: CGFloat = 17
    var padding: CGFloat = 0
    var activeColor: Color = emerald
    var inactiveColor: Color = .white
    @Binding var isWishlisted: Bool
    @State private var isToggling = false
    @State private var showConfirm = false

    var body: some View {
        Button {
            if confirmOnAdd && !isWishlisted {
                showConfirm = true
            } else {
                Task { await apply(!isWishlisted) }
            }
        } label: {
            Image(systemName: isWishlisted ? "bookmark.fill" : "bookmark")
                .font(.system(size: iconSize))
                .foregroundColor(isWishlisted ? activeColor : inactiveColor)
                .padding(padding)
        }
        .buttonStyle(.plain)
        .disabled(isToggling)
        .confirmationDialog("Add to Wishlist?", isPresented: $showConfirm, titleVisibility: .visible) {
            Button("Add to Wishlist") { Task { await apply(true) } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(mountainName.map { "Save \($0) so you can find it later, from your Profile." }
                 ?? "Save this peak so you can find it later, from your Profile.")
        }
    }

    private func apply(_ newValue: Bool) async {
        let previous = isWishlisted
        isWishlisted = newValue
        isToggling = true
        defer { isToggling = false }
        do {
            if newValue {
                try await APIClient.shared.addToWishlist(mountainId: mountainId)
            } else {
                try await APIClient.shared.removeFromWishlist(mountainId: mountainId)
            }
        } catch {
            isWishlisted = previous
        }
    }
}
