import SwiftUI

/// Shared confirmation-dialog reason picker for reporting a user, climb, or
/// comment -- one definition so Climb Detail, comments, and user profiles
/// all offer the same reasons instead of drifting out of sync.
extension View {
    func reportReasonDialog(isPresented: Binding<Bool>, onSelect: @escaping (String) -> Void) -> some View {
        confirmationDialog("Report", isPresented: isPresented, titleVisibility: .visible) {
            Button("Spam") { onSelect("Spam") }
            Button("Inappropriate content") { onSelect("Inappropriate content") }
            Button("Harassment or bullying") { onSelect("Harassment or bullying") }
            Button("Other") { onSelect("Other") }
            Button("Cancel", role: .cancel) {}
        }
    }
}
