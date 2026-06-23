import Foundation

// MARK: - Mountain

struct Mountain: Codable, Identifiable {
    let id: Int
    let name: String
    let elevation: Int
    let range: String
}

// MARK: - Climb

struct Climb: Codable, Identifiable {
    let id: Int
    let mountainId: Int
    let mountainName: String
    let elevation: Int
    let range: String
    let climbDate: String
    let notes: String?
    let photoUrl: String?
    let visibility: String
    let createdAt: String
    let userId: Int?
    let userName: String?
    var isOwner: Bool?
    var isLiked: Bool?
    var likeCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, notes, visibility
        case mountainId   = "mountain_id"
        case mountainName = "mountain_name"
        case elevation, range
        case climbDate    = "climb_date"
        case photoUrl     = "photo_url"
        case createdAt    = "created_at"
        case userId       = "user_id"
        case userName     = "user_name"
        case isOwner      = "is_owner"
        case isLiked      = "is_liked"
        case likeCount    = "like_count"
    }
}

// MARK: - FeedItem

struct FeedItem: Codable, Identifiable {
    let id: Int
    let climbDate: String
    let photoUrl: String?
    let visibility: String
    let notes: String?
    let mountainName: String
    let mountainId: Int
    let elevation: Int
    let range: String
    let userId: Int
    let userName: String
    let userAvatarUrl: String?
    var isLiked: Bool?
    var likeCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, visibility, notes, elevation, range
        case climbDate    = "climb_date"
        case photoUrl     = "photo_url"
        case mountainName = "mountain_name"
        case mountainId   = "mountain_id"
        case userId       = "user_id"
        case userName     = "user_name"
        case userAvatarUrl = "user_avatar_url"
        case isLiked      = "is_liked"
        case likeCount    = "like_count"
    }
}

// MARK: - Stats

struct Stats: Codable {
    let totalClimbs: Int
    let uniquePeaks: Int
    let totalElevation: Int
    let totalMountains: Int
    let climbedIds: [Int]
    let recentClimbs: [RecentClimb]

    enum CodingKeys: String, CodingKey {
        case totalClimbs    = "total_climbs"
        case uniquePeaks    = "unique_peaks"
        case totalElevation = "total_elevation"
        case totalMountains = "total_mountains"
        case climbedIds     = "climbed_ids"
        case recentClimbs   = "recent_climbs"
    }
}

struct RecentClimb: Codable, Identifiable {
    let id: Int
    let mountainName: String
    let elevation: Int
    let climbDate: String
    let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, elevation
        case mountainName = "mountain_name"
        case climbDate    = "climb_date"
        case photoUrl     = "photo_url"
    }
}

// MARK: - User / Profile

struct UserProfile: Codable, Identifiable {
    let id: Int
    let name: String
    let bio: String?
    let avatarUrl: String?
    let totalClimbs: Int?
    let uniquePeaks: Int?
    let followers: Int?
    let following: Int?
    let isFollowing: Bool?

    enum CodingKeys: String, CodingKey {
        case id, name, bio
        case avatarUrl    = "avatar_url"
        case totalClimbs  = "total_climbs"
        case uniquePeaks  = "unique_peaks"
        case followers, following
        case isFollowing  = "is_following"
    }
}

// MARK: - Like response

struct LikeResponse: Codable {
    let liked: Bool
    let count: Int
}

// MARK: - Helpers

extension String {
    func formattedClimbDate() -> String {
        let isoFormatter = DateFormatter()
        isoFormatter.dateFormat = "yyyy-MM-dd"
        guard let date = isoFormatter.date(from: self) else { return self }
        let display = DateFormatter()
        display.dateStyle = .long
        return display.string(from: date)
    }

    func shortClimbDate() -> String {
        let isoFormatter = DateFormatter()
        isoFormatter.dateFormat = "yyyy-MM-dd"
        guard let date = isoFormatter.date(from: self) else { return self }
        let display = DateFormatter()
        display.dateFormat = "MMM d, yyyy"
        return display.string(from: date)
    }
}
