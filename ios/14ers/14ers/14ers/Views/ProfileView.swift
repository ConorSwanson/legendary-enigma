import SwiftUI
import PhotosUI
import UIKit

private let bg      = Color(red: 3/255,  green: 7/255,  blue: 18/255)
private let card    = Color(red: 17/255, green: 24/255, blue: 39/255)
private let sky     = Color(red: 56/255, green: 189/255, blue: 248/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

private let heroHeight: CGFloat = 180
private let avatarSize: CGFloat = 88

struct HomeView: View {
    @State private var profile: UserProfile?
    @State private var stats: Stats?
    @State private var avatarPickerItem: PhotosPickerItem?
    @State private var backgroundPickerItem: PhotosPickerItem?
    @State private var isUploadingAvatar = false
    @State private var isUploadingBackground = false
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    heroSection
                    VStack(spacing: 20) {
                        nameAndBio
                        if let s = stats { statsGrid(s) }
                        if let s = stats, !s.recentClimbs.isEmpty { recentBadgesSection(s) }
                        if let s = stats, !s.recentClimbs.isEmpty { recentClimbsSection(s) }
                        signOutButton
                    }
                    .padding()
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task { await load() }
        .onChange(of: avatarPickerItem) { handleAvatarPick() }
        .onChange(of: backgroundPickerItem) { handleBackgroundPick() }
    }

    // MARK: - Hero

    @ViewBuilder
    private var heroSection: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topTrailing) {
                Group {
                    if let bgStr = profile?.backgroundUrl, let bgUrl = URL(string: bgStr) {
                        AsyncImage(url: bgUrl) { phase in
                            if let img = phase.image {
                                img.resizable().aspectRatio(contentMode: .fill)
                            } else { mountainCanvas }
                        }
                    } else {
                        mountainCanvas
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: heroHeight)
                .clipped()

                PhotosPicker(selection: $backgroundPickerItem, matching: .images) {
                    Image(systemName: isUploadingBackground ? "arrow.triangle.2.circlepath" : "photo.badge.plus")
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(8)
                        .background(.ultraThinMaterial)
                        .clipShape(Circle())
                }
                .padding(12)
            }

            avatarImage
                .frame(width: avatarSize, height: avatarSize)
                .clipShape(Circle())
                .overlay(Circle().stroke(bg, lineWidth: 3))
                .overlay(alignment: .bottomTrailing) {
                    PhotosPicker(selection: $avatarPickerItem, matching: .images) {
                        Image(systemName: "camera.fill")
                            .font(.caption2)
                            .foregroundColor(.white)
                            .padding(6)
                            .background(sky)
                            .clipShape(Circle())
                    }
                    .offset(x: 4, y: 4)
                }
                .padding(.top, -(avatarSize / 2))
                .zIndex(1)
        }
    }

    @ViewBuilder
    private var mountainCanvas: some View {
        Canvas { ctx, size in
            ctx.fill(
                Path(CGRect(origin: .zero, size: size)),
                with: .linearGradient(
                    Gradient(stops: [
                        .init(color: Color(red: 8/255, green: 47/255, blue: 73/255), location: 0),
                        .init(color: Color(red: 20/255, green: 30/255, blue: 70/255), location: 1),
                    ]),
                    startPoint: .zero,
                    endPoint: CGPoint(x: 0, y: size.height)
                )
            )
            var far = Path()
            far.move(to: .init(x: 0, y: size.height))
            far.addLines([
                .init(x: 0,               y: size.height * 0.6),
                .init(x: size.width * 0.2, y: size.height * 0.35),
                .init(x: size.width * 0.4, y: size.height * 0.55),
                .init(x: size.width * 0.6, y: size.height * 0.25),
                .init(x: size.width * 0.8, y: size.height * 0.45),
                .init(x: size.width,        y: size.height * 0.3),
                .init(x: size.width,        y: size.height),
            ])
            far.closeSubpath()
            ctx.fill(far, with: .color(Color(red: 30/255, green: 60/255, blue: 100/255).opacity(0.6)))

            var near = Path()
            near.move(to: .init(x: 0, y: size.height))
            near.addLines([
                .init(x: 0,                y: size.height * 0.75),
                .init(x: size.width * 0.15, y: size.height * 0.55),
                .init(x: size.width * 0.35, y: size.height * 0.7),
                .init(x: size.width * 0.55, y: size.height * 0.45),
                .init(x: size.width * 0.7,  y: size.height * 0.62),
                .init(x: size.width * 0.85, y: size.height * 0.5),
                .init(x: size.width,         y: size.height * 0.65),
                .init(x: size.width,         y: size.height),
            ])
            near.closeSubpath()
            ctx.fill(near, with: .color(Color(red: 10/255, green: 20/255, blue: 40/255)))
        }
    }

    @ViewBuilder
    private var avatarImage: some View {
        if isUploadingAvatar {
            Circle().fill(card).overlay(ProgressView().tint(sky))
        } else if let avStr = profile?.avatarUrl, let avUrl = URL(string: avStr) {
            AsyncImage(url: avUrl) { phase in
                if let img = phase.image {
                    img.resizable().aspectRatio(contentMode: .fill)
                } else { avatarPlaceholder }
            }
        } else {
            avatarPlaceholder
        }
    }

    @ViewBuilder
    private var avatarPlaceholder: some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text((profile?.name ?? "C").prefix(1).uppercased())
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(sky)
            )
    }

    // MARK: - Name & Bio

    @ViewBuilder
    private var nameAndBio: some View {
        VStack(spacing: 4) {
            if let p = profile {
                Text(p.name)
                    .font(.title2.bold())
                    .foregroundColor(.white)
                if let bio = p.bio {
                    Text(bio)
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
            } else {
                ProgressView().tint(.white)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
    }

    // MARK: - Stats

    @ViewBuilder
    private func statsGrid(_ s: Stats) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            HomeStatCard(title: "Total Climbs", value: "\(s.totalClimbs)")
            HomeStatCard(title: "Unique Peaks", value: "\(s.uniquePeaks)")
            HomeStatCard(title: "Elevation", value: "\(s.totalElevation.formatted())ft")
            HomeStatCard(title: "Mountains", value: "\(s.totalMountains)")
        }
    }

    // MARK: - Recent Badges

    @ViewBuilder
    private func recentBadgesSection(_ s: Stats) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Recent Badges")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
                NavigationLink(destination: BadgeGridView()) {
                    Text("See All")
                        .font(.caption)
                        .foregroundColor(sky)
                }
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(s.recentClimbs) { climb in
                        BadgePatchView(mountainId: climb.mountainId, climbed: true)
                            .frame(width: 100, height: 120)
                            .cornerRadius(10)
                    }
                }
            }
        }
    }

    // MARK: - Recent Climbs

    @ViewBuilder
    private func recentClimbsSection(_ s: Stats) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent Climbs")
                .font(.headline)
                .foregroundColor(.white)
            ForEach(s.recentClimbs) { climb in
                HomeClimbRow(climb: climb)
            }
        }
    }

    // MARK: - Sign Out

    @ViewBuilder
    private var signOutButton: some View {
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
        }
        .padding(.top, 8)
    }

    // MARK: - Load

    private func load() async {
        async let p = APIClient.shared.myProfile()
        async let s = APIClient.shared.stats()
        if let (profileResult, statsResult) = try? await (p, s) {
            profile = profileResult
            stats = statsResult
        }
    }

    // MARK: - Photo handlers

    private func handleAvatarPick() {
        guard let item = avatarPickerItem else { return }
        isUploadingAvatar = true
        Task {
            defer { isUploadingAvatar = false }
            guard let raw = try? await item.loadTransferable(type: Data.self) else { return }
            let compressed = compress(raw, maxDimension: 512, quality: 0.85)
            if let updated = try? await APIClient.shared.updateProfile(avatarData: compressed) {
                profile = updated
            }
        }
    }

    private func handleBackgroundPick() {
        guard let item = backgroundPickerItem else { return }
        isUploadingBackground = true
        Task {
            defer { isUploadingBackground = false }
            guard let raw = try? await item.loadTransferable(type: Data.self) else { return }
            let compressed = compress(raw, maxDimension: 1920, quality: 0.78)
            if let updated = try? await APIClient.shared.updateProfile(backgroundData: compressed) {
                profile = updated
            }
        }
    }

    private func compress(_ data: Data, maxDimension: CGFloat, quality: CGFloat) -> Data {
        guard let uiImage = UIImage(data: data) else { return data }
        let size = uiImage.size
        let scale = min(maxDimension / max(size.width, size.height), 1.0)
        guard scale < 1.0 else { return uiImage.jpegData(compressionQuality: quality) ?? data }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in uiImage.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: quality) ?? data
    }
}

// MARK: - Supporting Views

private struct HomeStatCard: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.title2.bold())
                .foregroundColor(.white)
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(card)
        .cornerRadius(12)
    }
}

private struct HomeClimbRow: View {
    let climb: RecentClimb

    var body: some View {
        HStack {
            if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { phase in
                    if let img = phase.image {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        RoundedRectangle(cornerRadius: 8).fill(card)
                    }
                }
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(card)
                    .frame(width: 48, height: 48)
                    .overlay(
                        Image(systemName: "mountain.2")
                            .foregroundColor(.gray)
                            .font(.caption)
                    )
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(climb.mountainName)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                Text(climb.climbDate.shortClimbDate())
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            Spacer()
            Text("\(climb.elevation.formatted())ft")
                .font(.caption.bold())
                .foregroundColor(emerald)
        }
        .padding()
        .background(card)
        .cornerRadius(10)
    }
}
