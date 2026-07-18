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
    @State private var showEditProfile = false
    @State private var showDeleteConfirm = false
    @State private var isDeletingAccount = false
    @State private var showDeletedToast = false
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var userState: UserState

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
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NotificationBellButton()
                }
            }
            .overlay(alignment: .bottom) {
                if showDeletedToast {
                    DeletedToast()
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .padding(.bottom, 16)
                }
            }
        }
        .task { await load() }
        .onChange(of: userState.climbWasDeleted) { newValue in
            guard newValue else { return }
            userState.climbWasDeleted = false
            Task { await load() }
            withAnimation(.spring(response: 0.3)) { showDeletedToast = true }
            Task {
                try? await Task.sleep(nanoseconds: 2_500_000_000)
                withAnimation(.easeOut(duration: 0.3)) { showDeletedToast = false }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .climbLogged)) { _ in
            Task { await load() }
        }
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
                Button { showEditProfile = true } label: {
                    HStack(spacing: 6) {
                        Text(p.name)
                            .font(.title2.bold())
                            .foregroundColor(.white)
                        Image(systemName: "pencil")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                .buttonStyle(.plain)
                if let bio = p.bio, !bio.isEmpty {
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
        .sheet(isPresented: $showEditProfile) {
            EditProfileSheet(profile: $profile)
        }
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
                        NavigationLink(destination: ClimbDetailView(climbId: climb.id)) {
                            NativeBadgeThumb(climb: climb)
                                .frame(width: 100, height: 120)
                                .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
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
                NavigationLink(destination: ClimbDetailView(climbId: climb.id)) {
                    HomeClimbRow(climb: climb)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Sign Out / Delete Account

    @ViewBuilder
    private var signOutButton: some View {
        VStack(spacing: 10) {
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

            Button {
                showDeleteConfirm = true
            } label: {
                Text("Delete Account")
                    .font(.caption)
                    .foregroundColor(Color(white: 0.4))
            }
        }
        .padding(.top, 8)
        .confirmationDialog(
            "Delete Account",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete Account", role: .destructive) {
                Task { await deleteAccount() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete your account and all your climb data. This cannot be undone.")
        }
    }

    private func deleteAccount() async {
        isDeletingAccount = true
        do {
            try await APIClient.shared.deleteAccount()
        } catch {}
        authManager.signOut()
    }

    // MARK: - Load

    private func load() async {
        async let p = APIClient.shared.myProfile()
        async let s = APIClient.shared.stats()
        if let (profileResult, statsResult) = try? await (p, s) {
            profile = profileResult
            stats = statsResult
            userState.avatarUrl = profileResult.avatarUrl
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

// MARK: - Badge Thumbnail (uses real badge PNG)

private struct NativeBadgeThumb: View {
    let climb: RecentClimb

    private var badgeURL: URL? {
        URL(string: "\(Config.apiBaseURL)/api/badges/\(climb.mountainId)/png?climbed=1")
    }

    var body: some View {
        AsyncImage(url: badgeURL) { phase in
            switch phase {
            case .success(let img):
                img.resizable().aspectRatio(contentMode: .fit)
            default:
                ZStack {
                    LinearGradient(
                        colors: [
                            Color(red: 8/255,  green: 47/255, blue: 73/255),
                            Color(red: 20/255, green: 30/255, blue: 70/255),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                    VStack(spacing: 4) {
                        Image(systemName: "mountain.2.fill")
                            .font(.system(size: 24))
                            .foregroundColor(sky)
                        ProgressView().tint(sky).scaleEffect(0.7)
                    }
                }
            }
        }
    }
}

// MARK: - Shared Header Components

struct HeaderAvatar: View {
    @EnvironmentObject var userState: UserState

    var body: some View {
        Button { userState.selectedTab = 0 } label: {
            Group {
                if let urlStr = userState.avatarUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        if let img = phase.image {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            avatarPlaceholder
                        }
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 30, height: 30)
            .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Color(red: 56/255, green: 189/255, blue: 248/255).opacity(0.25))
            .overlay(
                Image(systemName: "person.fill")
                    .font(.system(size: 13))
                    .foregroundColor(Color(red: 56/255, green: 189/255, blue: 248/255))
            )
    }
}

struct NotificationBellButton: View {
    @EnvironmentObject var userState: UserState
    @State private var showNotifications = false

    var body: some View {
        Button { showNotifications = true } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell")
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                if userState.unreadCount > 0 {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 8, height: 8)
                        .offset(x: 5, y: -4)
                }
            }
            .frame(width: 28, height: 28)
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showNotifications, onDismiss: {
            Task { await userState.refresh() }
        }) {
            NotificationsView()
                .environmentObject(userState)
        }
    }
}

// MARK: - Notifications View

struct NotificationsView: View {
    @EnvironmentObject var userState: UserState
    @State private var notifications: [NotificationItem] = []
    @State private var isLoading = true
    @Environment(\.dismiss) private var dismiss

    private let notifBg = Color(red: 3/255, green: 7/255, blue: 18/255)
    private let notifCard = Color(red: 17/255, green: 24/255, blue: 39/255)

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView().tint(.white)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(notifBg.ignoresSafeArea())
                } else if notifications.isEmpty {
                    VStack(spacing: 14) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 44))
                            .foregroundColor(.gray.opacity(0.45))
                        Text("No notifications yet")
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(notifBg.ignoresSafeArea())
                } else {
                    List(notifications) { item in
                        NotificationRow(item: item) {
                            guard let climbId = item.climbId else { return }
                            userState.selectedTab = 3
                            dismiss()
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                                userState.pendingClimbId = climbId
                            }
                        }
                        .listRowBackground(notifCard)
                        .listRowSeparatorTint(Color(red: 31/255, green: 41/255, blue: 55/255))
                    }
                    .listStyle(.plain)
                    .background(notifBg)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .task {
            notifications = (try? await APIClient.shared.notifications()) ?? []
            isLoading = false
            try? await APIClient.shared.markNotificationsRead()
            userState.unreadCount = 0
        }
    }
}

private struct NotificationRow: View {
    let item: NotificationItem
    var onTap: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            Group {
                if let urlStr = item.fromUserAvatarUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        if let img = phase.image {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else { avatarPlaceholder }
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 3) {
                Text(notifText)
                    .font(.subheadline)
                    .foregroundColor(.white)
                Text(item.createdAt.shortNotifDate())
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            if !item.isRead {
                Circle()
                    .fill(Color(red: 56/255, green: 189/255, blue: 248/255))
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture { onTap?() }
    }

    private var notifText: String {
        switch item.type {
        case "like":    return "\(item.fromUserName) liked your climb on \(item.mountainName ?? "a peak")"
        case "follow":  return "\(item.fromUserName) started following you"
        case "comment": return "\(item.fromUserName) commented on your climb of \(item.mountainName ?? "a peak")"
        default:        return "\(item.fromUserName) interacted with your content"
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Color(red: 31/255, green: 41/255, blue: 55/255))
            .overlay(
                Text(item.fromUserName.prefix(1).uppercased())
                    .font(.caption.bold())
                    .foregroundColor(.white)
            )
    }
}

// MARK: - Edit Profile Sheet

private struct EditProfileSheet: View {
    @Binding var profile: UserProfile?
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var bio = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let bg   = Color(red: 3/255,  green: 7/255,  blue: 18/255)
    private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
    private let sky  = Color(red: 56/255, green: 189/255, blue: 248/255)

    var body: some View {
        NavigationView {
            ZStack {
                bg.ignoresSafeArea()
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Display Name")
                            .font(.caption)
                            .foregroundColor(.gray)
                        TextField("", text: $name,
                                  prompt: Text("Your name").foregroundColor(Color(white: 0.35)))
                            .padding(.horizontal, 16)
                            .frame(height: 48)
                            .background(Color.white.opacity(0.07))
                            .foregroundColor(.white)
                            .tint(sky)
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.12), lineWidth: 1))
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Bio (optional)")
                            .font(.caption)
                            .foregroundColor(.gray)
                        TextField("", text: $bio,
                                  prompt: Text("Tell climbers about yourself").foregroundColor(Color(white: 0.35)))
                            .padding(.horizontal, 16)
                            .frame(height: 48)
                            .background(Color.white.opacity(0.07))
                            .foregroundColor(.white)
                            .tint(sky)
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.12), lineWidth: 1))
                    }

                    if let msg = errorMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Spacer()
                }
                .padding(24)
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(bg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.gray)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView().tint(sky)
                        } else {
                            Text("Save")
                                .fontWeight(.semibold)
                                .foregroundColor(sky)
                        }
                    }
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .onAppear {
            name = profile?.name ?? ""
            bio  = profile?.bio  ?? ""
        }
    }

    private func save() async {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        let trimmedBio  = bio.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            let updated = try await APIClient.shared.updateProfile(
                name: trimmedName,
                bio: trimmedBio.isEmpty ? nil : trimmedBio
            )
            profile = updated
            dismiss()
        } catch let e as APIError {
            errorMessage = e.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - User Profile View (other users)

struct UserProfileView: View {
    let userId: Int

    @State private var profile: UserProfile?
    @State private var climbs: [Climb] = []
    @State private var isFollowing = false
    @State private var followerCount = 0
    @State private var isTogglingFollow = false
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                userHeroSection
                VStack(spacing: 20) {
                    userNameBio
                    if let p = profile { userStatsRow(p) }
                    followButton
                    if !climbs.isEmpty { userClimbsSection }
                }
                .padding()
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationTitle(profile?.name ?? "Profile")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    @ViewBuilder
    private var userHeroSection: some View {
        ZStack(alignment: .bottom) {
            Group {
                if let bgStr = profile?.backgroundUrl, let bgUrl = URL(string: bgStr) {
                    AsyncImage(url: bgUrl) { phase in
                        if let img = phase.image { img.resizable().aspectRatio(contentMode: .fill) }
                        else { userMountainCanvas }
                    }
                } else {
                    userMountainCanvas
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 160)
            .clipped()

            userAvatarImage
                .frame(width: 80, height: 80)
                .clipShape(Circle())
                .overlay(Circle().stroke(bg, lineWidth: 3))
                .offset(y: 40)
        }
        .padding(.bottom, 40)
    }

    @ViewBuilder
    private var userAvatarImage: some View {
        if let avStr = profile?.avatarUrl, let avUrl = URL(string: avStr) {
            AsyncImage(url: avUrl) { phase in
                if let img = phase.image { img.resizable().aspectRatio(contentMode: .fill) }
                else { userAvatarPlaceholder }
            }
        } else {
            userAvatarPlaceholder
        }
    }

    private var userAvatarPlaceholder: some View {
        Circle()
            .fill(sky.opacity(0.2))
            .overlay(
                Text((profile?.name ?? "?").prefix(1).uppercased())
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(sky)
            )
    }

    @ViewBuilder
    private var userMountainCanvas: some View {
        LinearGradient(
            colors: [
                Color(red: 8/255,  green: 47/255, blue: 73/255),
                Color(red: 20/255, green: 30/255, blue: 70/255),
            ],
            startPoint: .top, endPoint: .bottom
        )
    }

    @ViewBuilder
    private var userNameBio: some View {
        VStack(spacing: 4) {
            if let p = profile {
                Text(p.name)
                    .font(.title2.bold())
                    .foregroundColor(.white)
                if let bio = p.bio, !bio.isEmpty {
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
    }

    @ViewBuilder
    private func userStatsRow(_ p: UserProfile) -> some View {
        HStack(spacing: 0) {
            userStatCell(value: "\(p.totalClimbs ?? 0)", label: "Climbs")
            Divider().frame(height: 32).background(Color.white.opacity(0.1))
            userStatCell(value: "\(p.uniquePeaks ?? 0)", label: "Peaks")
            Divider().frame(height: 32).background(Color.white.opacity(0.1))
            userStatCell(value: "\(followerCount)", label: "Followers")
            Divider().frame(height: 32).background(Color.white.opacity(0.1))
            userStatCell(value: "\(p.following ?? 0)", label: "Following")
        }
        .padding(.vertical, 12)
        .background(card)
        .cornerRadius(12)
    }

    private func userStatCell(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.headline.bold()).foregroundColor(.white)
            Text(label).font(.caption2).foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var followButton: some View {
        Button {
            Task { await toggleFollow() }
        } label: {
            Text(isFollowing ? "Following" : "Follow")
                .font(.subheadline.bold())
                .foregroundColor(isFollowing ? .white : Color(red: 3/255, green: 7/255, blue: 18/255))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isFollowing ? Color.white.opacity(0.15) : emerald)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isFollowing ? Color.white.opacity(0.2) : Color.clear, lineWidth: 1)
                )
        }
        .disabled(isTogglingFollow)
    }

    @ViewBuilder
    private var userClimbsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Climbs")
                .font(.headline)
                .foregroundColor(.white)
            ForEach(climbs) { climb in
                NavigationLink(destination: ClimbDetailView(climbId: climb.id)) {
                    userClimbRow(climb)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func userClimbRow(_ climb: Climb) -> some View {
        HStack {
            if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { phase in
                    if let img = phase.image { img.resizable().aspectRatio(contentMode: .fill) }
                    else { RoundedRectangle(cornerRadius: 8).fill(card) }
                }
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(card)
                    .frame(width: 48, height: 48)
                    .overlay(Image(systemName: "mountain.2").foregroundColor(.gray).font(.caption))
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

    private func load() async {
        do {
            async let p = APIClient.shared.userProfile(userId)
            async let cs = APIClient.shared.userClimbs(userId)
            let (fetchedProfile, fetchedClimbs) = try await (p, cs)
            profile = fetchedProfile
            climbs = fetchedClimbs
            isFollowing = fetchedProfile.isFollowing ?? false
            followerCount = fetchedProfile.followers ?? 0
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func toggleFollow() async {
        isTogglingFollow = true
        defer { isTogglingFollow = false }
        let prev = isFollowing
        isFollowing = !prev
        followerCount += prev ? -1 : 1
        do {
            if prev {
                try await APIClient.shared.unfollow(userId)
            } else {
                try await APIClient.shared.follow(userId)
            }
        } catch {
            isFollowing = prev
            followerCount += prev ? 1 : -1
        }
    }
}
