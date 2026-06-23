import SwiftUI

private let bg = Color(red: 3/255, green: 7/255, blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky = Color(red: 56/255, green: 189/255, blue: 248/255)

struct ProfileView: View {
    @State private var profile: UserProfile?
    @State private var error: String?
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    if let profile {
                        // Avatar
                        ZStack {
                            if let avatarUrl = profile.avatarUrl, let url = URL(string: avatarUrl) {
                                AsyncImage(url: url) { img in
                                    img.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    avatarPlaceholder(name: profile.name)
                                }
                                .frame(width: 88, height: 88)
                                .clipShape(Circle())
                            } else {
                                avatarPlaceholder(name: profile.name)
                                    .frame(width: 88, height: 88)
                            }
                        }
                        .padding(.top, 20)

                        VStack(spacing: 6) {
                            Text(profile.name)
                                .font(.title2.bold())
                                .foregroundColor(.white)
                            if let bio = profile.bio {
                                Text(bio)
                                    .font(.body)
                                    .foregroundColor(.gray)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal)
                            }
                        }

                        // Stats row
                        HStack(spacing: 0) {
                            ProfileStat(label: "Climbs", value: profile.totalClimbs ?? 0)
                            Divider().frame(height: 36).background(Color(red: 31/255, green: 41/255, blue: 55/255))
                            ProfileStat(label: "Peaks", value: profile.uniquePeaks ?? 0)
                            Divider().frame(height: 36).background(Color(red: 31/255, green: 41/255, blue: 55/255))
                            ProfileStat(label: "Followers", value: profile.followers ?? 0)
                            Divider().frame(height: 36).background(Color(red: 31/255, green: 41/255, blue: 55/255))
                            ProfileStat(label: "Following", value: profile.following ?? 0)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(card)
                        .cornerRadius(14)
                        .padding(.horizontal)

                        // Badge shortcut
                        NavigationLink(destination: BadgeGridView()) {
                            HStack {
                                Image(systemName: "mountain.2.fill")
                                    .foregroundColor(sky)
                                Text("View Badge Collection")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.gray)
                                    .font(.caption)
                            }
                            .padding()
                            .background(card)
                            .cornerRadius(12)
                            .padding(.horizontal)
                        }

                        Spacer(minLength: 20)

                        Button {
                            authManager.signOut()
                        } label: {
                            Text("Sign Out")
                                .font(.subheadline.bold())
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(12)
                                .padding(.horizontal)
                        }

                    } else if let error {
                        Text(error).foregroundColor(.red).padding()
                    } else {
                        ProgressView().tint(.white).padding(.top, 40)
                    }
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Profile")
        }
        .task {
            do {
                profile = try await APIClient.shared.myProfile()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    @ViewBuilder
    private func avatarPlaceholder(name: String) -> some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text(name.prefix(1).uppercased())
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(sky)
            )
    }
}

private struct ProfileStat: View {
    let label: String
    let value: Int

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.title3.bold())
                .foregroundColor(.white)
            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }
}
