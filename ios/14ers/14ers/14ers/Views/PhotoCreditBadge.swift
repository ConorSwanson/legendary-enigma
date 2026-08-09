import SwiftUI

// A small "Photo: {author}" pill for photos that legally require a visible
// credit (CC-BY/CC-BY-SA default photos). Public Domain/CC0 photos pass a
// nil author and this renders nothing. Uses its own dark pill rather than
// relying on whatever's already behind it, since a default photo's
// brightness varies -- plain text alone wouldn't stay legible on every one.
struct PhotoCreditBadge: View {
    let author: String?

    var body: some View {
        if let author {
            Text("Photo: \(author)")
                .font(.caption2)
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.black.opacity(0.55))
                .cornerRadius(20)
        }
    }
}
