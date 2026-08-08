import Foundation

// MARK: - Mountain

struct Mountain: Codable, Identifiable, Sendable, Hashable {
    let id: Int
    let name: String
    let elevation: Int
    let range: String
    let lat: Double?
    let lng: Double?
    let lastActivity: String?   // most recent public climb date, if any
    let listKeys: [String]      // which peak_lists this mountain belongs to, e.g. ["co-14ers"]

    enum CodingKeys: String, CodingKey {
        case id, name, elevation, range, lat, lng
        case lastActivity = "last_activity"
        case listKeys      = "list_keys"
    }
}

// A named, curated peak collection (Colorado 14ers, Colorado 13ers, ...).
// See server/src/db.js's peak_lists table -- adding a future region/list is
// just a new row there, which shows up here automatically.
struct PeakList: Codable, Identifiable, Sendable, Hashable {
    let key: String
    let name: String
    let region: String
    let description: String?
    let count: Int
    var id: String { key }
}

// MARK: - Climb

struct Climb: Codable, Identifiable, Sendable {
    let id: Int
    let mountainId: Int
    let mountainName: String
    let elevation: Int
    let range: String
    let climbDate: String
    let notes: String?
    let photoUrl: String?
    let photoUrls: [String]?
    let visibility: String
    let createdAt: String
    let userId: Int?
    let userName: String?
    let userAvatarUrl: String?
    var isOwner: Bool?
    var isLiked: Bool?
    var likeCount: Int?
    var commentCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, notes, visibility
        case mountainId   = "mountain_id"
        case mountainName = "mountain_name"
        case elevation, range
        case climbDate    = "climb_date"
        case photoUrl     = "photo_url"
        case photoUrls    = "photo_urls"
        case createdAt    = "created_at"
        case userId       = "user_id"
        case userName     = "user_name"
        case userAvatarUrl = "user_avatar_url"
        case isOwner      = "is_owner"
        case isLiked      = "is_liked"
        case likeCount    = "like_count"
        case commentCount = "comment_count"
    }
}

// MARK: - FeedItem

struct FeedItem: Codable, Identifiable, Sendable {
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
    var commentCount: Int?

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
        case commentCount = "comment_count"
    }
}

// MARK: - Mountain Detail

struct MountainDetail: Codable, Identifiable, Sendable {
    let id: Int
    let name: String
    let elevation: Int
    let range: String
    let heroPhotoUrl: String?
    let totalClimbs: Int
    let uniqueClimbers: Int
    let userAscents: Int
    let isClimbed: Bool
    let byYear: [YearCount]
    let byMonth: [MonthCount]
    let recentSummits: [RecentSummit]
    let recentPhotos: [RecentPhoto]

    enum CodingKeys: String, CodingKey {
        case id, name, elevation, range
        case heroPhotoUrl   = "hero_photo_url"
        case totalClimbs    = "total_climbs"
        case uniqueClimbers = "unique_climbers"
        case userAscents    = "user_ascents"
        case isClimbed      = "is_climbed"
        case byYear         = "by_year"
        case byMonth        = "by_month"
        case recentSummits  = "recent_summits"
        case recentPhotos   = "recent_photos"
    }
}

struct YearCount: Codable, Identifiable, Sendable {
    let year: String
    let count: Int
    var id: String { year }
}

struct MonthCount: Codable, Identifiable, Sendable {
    let month: String   // "01".."12"
    let count: Int
    var id: String { month }
}

struct RecentSummit: Codable, Identifiable, Sendable {
    let climbId: Int
    let climbDate: String
    let userId: Int
    let userName: String
    let userAvatarUrl: String?
    var id: Int { climbId }

    enum CodingKeys: String, CodingKey {
        case climbId       = "climb_id"
        case climbDate     = "climb_date"
        case userId        = "user_id"
        case userName      = "user_name"
        case userAvatarUrl = "user_avatar_url"
    }
}

struct RecentPhoto: Codable, Identifiable, Sendable {
    let climbId: Int
    let userId: Int
    let userName: String
    let photoUrl: String
    var id: Int { climbId }

    enum CodingKeys: String, CodingKey {
        case climbId  = "climb_id"
        case userId   = "user_id"
        case userName = "user_name"
        case photoUrl = "photo_url"
    }
}

// MARK: - Stats

struct AscentCount: Codable, Sendable {
    let id: Int
    let count: Int
}

struct Stats: Codable, Sendable {
    let totalClimbs: Int
    let uniquePeaks: Int
    let totalElevation: Int
    let totalMountains: Int
    let climbedIds: [Int]
    let recentClimbs: [RecentClimb]
    let ascentCounts: [AscentCount]
    let byYear: [UserYearStat]
    let byMonth: [MonthCount]
    let followers: Int?
    let following: Int?
    let rank: ClimberRank?

    enum CodingKeys: String, CodingKey {
        case totalClimbs    = "total_climbs"
        case uniquePeaks    = "unique_peaks"
        case totalElevation = "total_elevation"
        case totalMountains = "total_mountains"
        case climbedIds     = "climbed_ids"
        case recentClimbs   = "recent_climbs"
        case ascentCounts   = "ascent_counts"
        case byYear         = "by_year"
        case byMonth        = "by_month"
        case followers, following, rank
    }
}

struct UserYearStat: Codable, Identifiable, Sendable {
    let year: String
    let count: Int
    let uniquePeaks: Int
    let elevation: Int
    var id: String { year }

    enum CodingKeys: String, CodingKey {
        case year, count, elevation
        case uniquePeaks = "unique_peaks"
    }
}

// MARK: - Climber Rank

struct ClimberRank: Codable, Sendable {
    let level: Int
    let name: String
    let minPeaks: Int
    let nextLevel: Int?
    let nextName: String?
    let nextMinPeaks: Int?
    let peaksToNext: Int

    enum CodingKeys: String, CodingKey {
        case level, name
        case minPeaks     = "min_peaks"
        case nextLevel    = "next_level"
        case nextName     = "next_name"
        case nextMinPeaks = "next_min_peaks"
        case peaksToNext  = "peaks_to_next"
    }
}

struct ClimberLevelDef: Identifiable, Sendable {
    let level: Int
    let name: String
    let minPeaks: Int
    var id: Int { level }
}

struct LeaderboardEntry: Codable, Identifiable, Sendable {
    let position: Int
    let isSelf: Bool
    let rank: ClimberRank
    let userId: Int
    let name: String
    let avatarUrl: String?
    let uniquePeaks: Int
    var id: Int { userId }

    enum CodingKeys: String, CodingKey {
        case position, rank, name
        case isSelf      = "is_self"
        case userId      = "id"
        case avatarUrl    = "avatar_url"
        case uniquePeaks  = "unique_peaks"
    }
}

// Mirrors server/src/utils/levels.js — used to render the full ladder
// (locked/unlocked tiers) in the Badges tab's Climber Rank grid. Ceiling is
// 641 (58 Colorado 14ers + 582 Colorado 13ers), not 58 — keep in sync with
// the server; a mismatch here just skews the locked/unlocked tile grid, since
// a user's live rank always comes from the server, not this array.
let climberLevels: [ClimberLevelDef] = [
    .init(level: 0,  name: "Trailhead Rookie",      minPeaks: 0),
    .init(level: 1,  name: "Switchback Scrambler",  minPeaks: 50),
    .init(level: 2,  name: "Ridge Runner",          minPeaks: 110),
    .init(level: 3,  name: "Alpine Adventurer",     minPeaks: 165),
    .init(level: 4,  name: "Summit Seeker",         minPeaks: 220),
    .init(level: 5,  name: "Peak Bagger",           minPeaks: 275),
    .init(level: 6,  name: "High Country Veteran",  minPeaks: 330),
    .init(level: 7,  name: "Thin Air Master",       minPeaks: 385),
    .init(level: 8,  name: "Summit Elite",          minPeaks: 440),
    .init(level: 9,  name: "Summit Sage",           minPeaks: 495),
    .init(level: 10, name: "Granite Guardian",      minPeaks: 550),
    .init(level: 11, name: "Continental Conqueror", minPeaks: 605),
    .init(level: 12, name: "Summit Legend",         minPeaks: 641),
]

struct FollowerUser: Codable, Identifiable, Sendable {
    let id: Int
    let name: String
    let bio: String?
    let avatarUrl: String?
    enum CodingKeys: String, CodingKey {
        case id, name, bio
        case avatarUrl = "avatar_url"
    }
}

struct RecentClimb: Codable, Identifiable, Sendable {
    let id: Int
    let mountainId: Int
    let mountainName: String
    let elevation: Int
    let climbDate: String
    let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, elevation
        case mountainId   = "mountain_id"
        case mountainName = "mountain_name"
        case climbDate    = "climb_date"
        case photoUrl     = "photo_url"
    }
}

// MARK: - User / Profile

struct UserProfile: Codable, Identifiable, Sendable {
    let id: Int
    let name: String
    let bio: String?
    let avatarUrl: String?
    let backgroundUrl: String?
    let totalClimbs: Int?
    let uniquePeaks: Int?
    let followers: Int?
    let following: Int?
    let isFollowing: Bool?
    let rank: ClimberRank?

    enum CodingKeys: String, CodingKey {
        case id, name, bio, rank
        case avatarUrl     = "avatar_url"
        case backgroundUrl = "background_url"
        case totalClimbs   = "total_climbs"
        case uniquePeaks   = "unique_peaks"
        case followers, following
        case isFollowing   = "is_following"
    }
}

// MARK: - Comment

struct Comment: Codable, Identifiable, Sendable {
    let id: Int
    let body: String
    let userId: Int
    let userName: String
    let userAvatarUrl: String?
    let createdAt: String
    var isOwner: Bool?

    enum CodingKeys: String, CodingKey {
        case id, body
        case userId        = "user_id"
        case userName      = "user_name"
        case userAvatarUrl = "user_avatar_url"
        case createdAt     = "created_at"
        case isOwner       = "is_owner"
    }
}

// MARK: - Like response

struct LikeResponse: Codable, Sendable {
    let liked: Bool
    let count: Int
}

// MARK: - NotificationItem

struct NotificationItem: Codable, Identifiable, Sendable {
    let id: Int
    let type: String
    let fromUserId: Int
    let fromUserName: String
    let fromUserAvatarUrl: String?
    let climbId: Int?
    let mountainName: String?
    let level: Int?
    let levelName: String?
    let isRead: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, type, level
        case fromUserId        = "from_user_id"
        case fromUserName      = "from_user_name"
        case fromUserAvatarUrl = "from_user_avatar_url"
        case climbId           = "climb_id"
        case mountainName      = "mountain_name"
        case levelName         = "level_name"
        case isRead            = "is_read"
        case createdAt         = "created_at"
    }
}

// MARK: - Peak GPS Coordinates

/// Shared by LogClimbView (EXIF peak-detection) and NearbyPeakPhotosView
/// (library scan) — both match a photo's location against Mountain.lat/lng
/// on the already-fetched mountains list, not a separate static file.
let twoMilesMeters: Double = 3_218.69

// MARK: - App-wide notifications

extension Notification.Name {
    static let climbDeleted    = Notification.Name("climbDeleted")
    static let climbLogged     = Notification.Name("climbLogged")
    static let navigateToClimb = Notification.Name("navigateToClimb")
    static let climbLikeChanged = Notification.Name("climbLikeChanged")
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

    func shortNotifDate() -> String {
        String(prefix(10)).shortClimbDate()
    }
}
