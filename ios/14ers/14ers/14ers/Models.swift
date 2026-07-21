import Foundation

// MARK: - Mountain

struct Mountain: Codable, Identifiable, Sendable, Hashable {
    let id: Int
    let name: String
    let elevation: Int
    let range: String
    let lastActivity: String?   // most recent public climb date, if any

    enum CodingKeys: String, CodingKey {
        case id, name, elevation, range
        case lastActivity = "last_activity"
    }
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
    let followers: Int?
    let following: Int?

    enum CodingKeys: String, CodingKey {
        case totalClimbs    = "total_climbs"
        case uniquePeaks    = "unique_peaks"
        case totalElevation = "total_elevation"
        case totalMountains = "total_mountains"
        case climbedIds     = "climbed_ids"
        case recentClimbs   = "recent_climbs"
        case ascentCounts   = "ascent_counts"
        case followers, following
    }
}

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

    enum CodingKeys: String, CodingKey {
        case id, name, bio
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
    let isRead: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, type
        case fromUserId        = "from_user_id"
        case fromUserName      = "from_user_name"
        case fromUserAvatarUrl = "from_user_avatar_url"
        case climbId           = "climb_id"
        case mountainName      = "mountain_name"
        case isRead            = "is_read"
        case createdAt         = "created_at"
    }
}

// MARK: - Peak GPS Coordinates

struct PeakCoordinate: Sendable {
    let mountainId: Int
    let latitude: Double
    let longitude: Double
}

nonisolated(unsafe) let allPeakCoordinates: [PeakCoordinate] = [
    PeakCoordinate(mountainId: 1,  latitude: 39.1178, longitude: -106.4454), // Mount Elbert
    PeakCoordinate(mountainId: 2,  latitude: 39.1875, longitude: -106.4756), // Mount Massive
    PeakCoordinate(mountainId: 3,  latitude: 38.9244, longitude: -106.3208), // Mount Harvard
    PeakCoordinate(mountainId: 4,  latitude: 39.3511, longitude: -106.1114), // Mount Lincoln
    PeakCoordinate(mountainId: 5,  latitude: 39.6339, longitude: -105.8172), // Grays Peak
    PeakCoordinate(mountainId: 6,  latitude: 38.6745, longitude: -106.2468), // Mount Antero
    PeakCoordinate(mountainId: 7,  latitude: 39.6428, longitude: -105.8212), // Torreys Peak
    PeakCoordinate(mountainId: 8,  latitude: 39.0097, longitude: -106.8614), // Castle Peak
    PeakCoordinate(mountainId: 9,  latitude: 39.3972, longitude: -106.1064), // Quandary Peak
    PeakCoordinate(mountainId: 10, latitude: 39.5883, longitude: -105.6438), // Mount Evans
    PeakCoordinate(mountainId: 11, latitude: 40.2549, longitude: -105.6152), // Longs Peak
    PeakCoordinate(mountainId: 12, latitude: 37.8392, longitude: -107.9917), // Mount Wilson
    PeakCoordinate(mountainId: 13, latitude: 38.6194, longitude: -106.2397), // Mount Shavano
    PeakCoordinate(mountainId: 14, latitude: 38.9608, longitude: -106.3603), // Mount Belford
    PeakCoordinate(mountainId: 15, latitude: 37.9667, longitude: -105.5853), // Crestone Peak
    PeakCoordinate(mountainId: 16, latitude: 37.9647, longitude: -105.5767), // Crestone Needle
    PeakCoordinate(mountainId: 17, latitude: 38.7492, longitude: -106.2425), // Mount Princeton
    PeakCoordinate(mountainId: 18, latitude: 38.8436, longitude: -106.3142), // Mount Yale
    PeakCoordinate(mountainId: 19, latitude: 39.0706, longitude: -106.9890), // Maroon Peak
    PeakCoordinate(mountainId: 20, latitude: 38.6253, longitude: -106.2508), // Tabeguache Peak
    PeakCoordinate(mountainId: 21, latitude: 38.9647, longitude: -106.3383), // Mount Oxford
    PeakCoordinate(mountainId: 22, latitude: 38.0033, longitude: -107.7922), // Mount Sneffels
    PeakCoordinate(mountainId: 23, latitude: 39.3394, longitude: -106.1392), // Mount Democrat
    PeakCoordinate(mountainId: 24, latitude: 39.1503, longitude: -107.0833), // Capitol Peak
    PeakCoordinate(mountainId: 25, latitude: 38.8405, longitude: -105.0442), // Pikes Peak
    PeakCoordinate(mountainId: 26, latitude: 39.1189, longitude: -107.0669), // Snowmass Mountain
    PeakCoordinate(mountainId: 27, latitude: 37.6214, longitude: -107.5928), // Windom Peak
    PeakCoordinate(mountainId: 28, latitude: 37.6272, longitude: -107.5956), // Sunlight Peak
    PeakCoordinate(mountainId: 29, latitude: 37.9128, longitude: -107.5042), // Handies Peak
    PeakCoordinate(mountainId: 30, latitude: 38.0606, longitude: -107.5100), // Wetterhorn Peak
    PeakCoordinate(mountainId: 31, latitude: 39.0783, longitude: -106.9872), // North Maroon Peak
    PeakCoordinate(mountainId: 32, latitude: 38.0597, longitude: -106.9317), // San Luis Peak
    PeakCoordinate(mountainId: 33, latitude: 39.4669, longitude: -106.4818), // Mount of the Holy Cross
    PeakCoordinate(mountainId: 34, latitude: 38.9453, longitude: -106.4386), // Huron Peak
    PeakCoordinate(mountainId: 35, latitude: 38.0717, longitude: -107.4622), // Uncompahgre Peak
    PeakCoordinate(mountainId: 36, latitude: 37.9178, longitude: -107.4250), // Sunshine Peak
    PeakCoordinate(mountainId: 37, latitude: 39.2250, longitude: -106.1697), // Mount Sherman
    PeakCoordinate(mountainId: 38, latitude: 37.9408, longitude: -107.4219), // Redcloud Peak
    PeakCoordinate(mountainId: 39, latitude: 39.0714, longitude: -106.9503), // Pyramid Peak
    PeakCoordinate(mountainId: 40, latitude: 37.8600, longitude: -107.9844), // Wilson Peak
    PeakCoordinate(mountainId: 41, latitude: 37.5778, longitude: -105.4853), // Blanca Peak
    PeakCoordinate(mountainId: 42, latitude: 39.0294, longitude: -106.4729), // La Plata Peak
    PeakCoordinate(mountainId: 43, latitude: 39.3469, longitude: -106.1181), // Mount Cameron
    PeakCoordinate(mountainId: 44, latitude: 39.3347, longitude: -106.1083), // Mount Bross
    PeakCoordinate(mountainId: 45, latitude: 37.9797, longitude: -105.6022), // Kit Carson Peak
    PeakCoordinate(mountainId: 46, latitude: 37.8378, longitude: -108.0061), // El Diente Peak
    PeakCoordinate(mountainId: 47, latitude: 37.6217, longitude: -107.6222), // Mount Eolus
    PeakCoordinate(mountainId: 48, latitude: 37.9808, longitude: -105.6067), // Challenger Point
    PeakCoordinate(mountainId: 49, latitude: 38.9036, longitude: -106.2997), // Mount Columbia
    PeakCoordinate(mountainId: 50, latitude: 38.9478, longitude: -106.3786), // Missouri Mountain
    PeakCoordinate(mountainId: 51, latitude: 37.9761, longitude: -105.5553), // Humboldt Peak
    PeakCoordinate(mountainId: 52, latitude: 39.5828, longitude: -105.7086), // Mount Bierstadt
    PeakCoordinate(mountainId: 53, latitude: 37.1219, longitude: -105.1864), // Culebra Peak
    PeakCoordinate(mountainId: 54, latitude: 37.5828, longitude: -105.4928), // Ellingwood Point
    PeakCoordinate(mountainId: 55, latitude: 37.5839, longitude: -105.4450), // Mount Lindsey
    PeakCoordinate(mountainId: 56, latitude: 37.5667, longitude: -105.4978), // Little Bear Peak
    PeakCoordinate(mountainId: 57, latitude: 37.6228, longitude: -107.6261), // North Eolus
    PeakCoordinate(mountainId: 58, latitude: 39.0103, longitude: -106.8561), // Conundrum Peak
]

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
