import SwiftUI

private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

/// Bookmark toggle used identically in mountain, climb, badge, and feed
/// views so "add to wishlist" works the same everywhere in the app. Owns
/// only the toggle + optimistic update; the parent view owns the actual
/// `isWishlisted` state (usually seeded from whatever detail payload it
/// already fetched) so this stays a plain, reusable control.
///
/// Two visual styles share that same logic: `.icon` is a bare bookmark
/// glyph (toolbar-small in mountain/badge detail, row-sized inline next to
/// like/comment/share on climb detail and Feed); `.labeledButton` is a
/// full outlined/filled button with text, meant to sit next to "Invite to
/// Climb" as its own row action rather than tucked in a corner.
///
/// `confirmOnAdd` shows a quick "Add to Wishlist?" prompt before the first
/// save -- meant for lower-context spots like a Feed card, where the icon
/// shows up next to heart/comment/share with no other explanation of what
/// it does. Detail views leave it off since the page itself (its title,
/// its own dedicated screen) already makes that obvious.
struct WishlistButton: View {
    enum Style {
        case icon
        case labeledButton
    }

    let mountainId: Int
    var mountainName: String? = nil
    var confirmOnAdd: Bool = false
    var style: Style = .icon
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
            switch style {
            case .icon: iconLabel
            case .labeledButton: buttonLabel
            }
        }
        .buttonStyle(.plain)
        .disabled(isToggling)
        .confirmationDialog("Add to Wishlist?", isPresented: $showConfirm, titleVisibility: .visible) {
            Button("Add to Wishlist") { Task { await apply(true) } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(mountainName.map { "Save \($0) for future adventures, accessible from your Profile." }
                 ?? "Save this peak for future adventures, accessible from your Profile.")
        }
    }

    private var iconLabel: some View {
        Image(systemName: isWishlisted ? "bookmark.fill" : "bookmark")
            .font(.system(size: iconSize))
            .foregroundColor(isWishlisted ? activeColor : inactiveColor)
            .padding(padding)
    }

    private var buttonLabel: some View {
        HStack(spacing: 7) {
            Image(systemName: isWishlisted ? "bookmark.fill" : "bookmark")
            Text(isWishlisted ? "Wishlisted" : "Add to Wishlist").bold()
        }
        .font(.subheadline)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .foregroundColor(isWishlisted ? emerald : sky)
        .background(isWishlisted ? emerald.opacity(0.14) : Color.clear)
        .overlay(
            RoundedRectangle(cornerRadius: 13)
                .stroke((isWishlisted ? emerald : sky).opacity(isWishlisted ? 0.5 : 0.35), lineWidth: 1.2)
        )
        .cornerRadius(13)
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
