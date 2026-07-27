import SwiftUI

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)

/// Full-screen search for other climbers by name — tap a result to view
/// their profile and follow.
struct UserSearchView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [FollowerUser] = []
    @State private var isSearching = false
    @State private var hasSearched = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundColor(.gray)
                    TextField("", text: $query,
                              prompt: Text("Search climbers by name").foregroundColor(Color(white: 0.4)))
                        .foregroundColor(.white)
                        .tint(sky)
                        .autocorrectionDisabled()
                    if !query.isEmpty {
                        Button { query = "" } label: {
                            Image(systemName: "xmark.circle.fill").foregroundColor(.gray)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .frame(height: 40)
                .background(card)
                .cornerRadius(10)
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 10)

                Group {
                    if isSearching {
                        Spacer()
                        ProgressView().tint(.white)
                        Spacer()
                    } else if query.trimmingCharacters(in: .whitespaces).isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "person.2")
                                .font(.system(size: 40))
                                .foregroundColor(.gray.opacity(0.4))
                            Text("Find other climbers by name")
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if results.isEmpty && hasSearched {
                        VStack(spacing: 10) {
                            Image(systemName: "person.fill.questionmark")
                                .font(.system(size: 40))
                                .foregroundColor(.gray.opacity(0.4))
                            Text("No climbers found")
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        List(results) { user in
                            NavigationLink(destination: UserProfileView(userId: user.id)) {
                                SearchResultRow(user: user)
                            }
                            .listRowBackground(card)
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                    }
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Find Climbers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundColor(sky)
                }
            }
        }
        .task(id: query) { await search() }
    }

    private func search() async {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else {
            results = []
            hasSearched = false
            return
        }
        try? await Task.sleep(nanoseconds: 300_000_000)
        guard !Task.isCancelled else { return }
        isSearching = true
        results = (try? await APIClient.shared.searchUsers(q)) ?? []
        hasSearched = true
        isSearching = false
    }
}

private struct SearchResultRow: View {
    let user: FollowerUser

    var body: some View {
        HStack(spacing: 12) {
            Group {
                if let urlStr = user.avatarUrl, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        placeholder
                    }
                } else {
                    placeholder
                }
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(user.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                if let bio = user.bio, !bio.isEmpty {
                    Text(bio)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption2.bold())
                .foregroundColor(.gray.opacity(0.4))
        }
        .padding(.vertical, 4)
    }

    private var placeholder: some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text(user.name.prefix(1).uppercased())
                    .font(.subheadline.bold())
                    .foregroundColor(sky)
            )
    }
}
