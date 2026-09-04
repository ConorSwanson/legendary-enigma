import Foundation

// MARK: - Mountain

struct Mountain: Codable, Identifiable, Sendable, Hashable {
    let id: Int
    let name: String
    let elevation: Int
    let range: String
    let state: String?          // nil for the original Colorado-only peaks (predate this column) -- treat as "Colorado"
    let lat: Double?
    let lng: Double?
    let lastActivity: String?   // most recent public climb date, if any
    let listKeys: [String]      // which peak_lists this mountain belongs to, e.g. ["co-14ers"]
    let defaultPhotos: [MountainPhoto]  // curated fallback photos, best pick first; [] if none exist
    var isWishlisted: Bool = false

    enum CodingKeys: String, CodingKey {
        case id, name, elevation, range, state, lat, lng
        case lastActivity = "last_activity"
        case listKeys      = "list_keys"
        case defaultPhotos = "default_photos"
        case isWishlisted   = "is_wishlisted"
    }

    // "Elk Mountains" (Colorado) and "Sierra Nevada" (California) are real
    // named sub-ranges; most peaks outside Colorado's curated set have no
    // sub-range on file and range just falls back to the state name itself
    // (e.g. "New York"). Filter/section labels want to distinguish the two:
    // a real sub-range gets its state appended for context ("Elk Mountains -
    // Colorado"), a bare state-fallback range doesn't repeat itself.
    var rangeDisplayLabel: String {
        let effectiveState = state ?? "Colorado"
        return range == effectiveState ? range : "\(range) - \(effectiveState)"
    }
}

// A curated Public Domain/CC0/CC-BY/CC-BY-SA photo standing in for a real
// climb photo. `author` is nil whenever the license doesn't require a
// credit line (Public Domain/CC0) -- non-nil is the client's cue to show one.
struct MountainPhoto: Codable, Sendable, Hashable {
    let url: String
    let license: String
    let author: String?
    let sourceUrl: String

    enum CodingKeys: String, CodingKey {
        case url, license, author
        case sourceUrl = "source_url"
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
    let photoIsDefault: Bool?
    let photoCreditAuthor: String?   // non-nil only when photoIsDefault and its license requires a credit
    let visibility: String
    let createdAt: String
    let userId: Int?
    let userName: String?
    let userAvatarUrl: String?
    var isOwner: Bool?
    var isLiked: Bool?
    var likeCount: Int?
    var commentCount: Int?
    var mountainIsWishlisted: Bool?

    enum CodingKeys: String, CodingKey {
        case id, notes, visibility
        case mountainId   = "mountain_id"
        case mountainName = "mountain_name"
        case elevation, range
        case climbDate    = "climb_date"
        case photoUrl     = "photo_url"
        case photoUrls    = "photo_urls"
        case photoIsDefault    = "photo_is_default"
        case photoCreditAuthor = "photo_credit_author"
        case createdAt    = "created_at"
        case userId       = "user_id"
        case userName     = "user_name"
        case userAvatarUrl = "user_avatar_url"
        case isOwner      = "is_owner"
        case isLiked      = "is_liked"
        case likeCount    = "like_count"
        case commentCount = "comment_count"
        case mountainIsWishlisted = "mountain_is_wishlisted"
    }
}

// MARK: - FeedItem

struct FeedItem: Codable, Identifiable, Sendable {
    let id: Int
    let climbDate: String
    let photoUrl: String?
    let photoIsDefault: Bool
    let photoCreditAuthor: String?   // non-nil only when photoIsDefault and its license requires a credit
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
    var mountainIsWishlisted: Bool?

    enum CodingKeys: String, CodingKey {
        case id, visibility, notes, elevation, range
        case climbDate        = "climb_date"
        case photoUrl         = "photo_url"
        case photoIsDefault   = "photo_is_default"
        case photoCreditAuthor = "photo_credit_author"
        case mountainName = "mountain_name"
        case mountainId   = "mountain_id"
        case userId       = "user_id"
        case userName     = "user_name"
        case userAvatarUrl = "user_avatar_url"
        case isLiked      = "is_liked"
        case likeCount    = "like_count"
        case commentCount = "comment_count"
        case mountainIsWishlisted = "mountain_is_wishlisted"
    }
}

// MARK: - Mountain Detail

struct MountainDetail: Codable, Identifiable, Sendable {
    let id: Int
    let name: String
    let elevation: Int
    let range: String
    let heroPhotoUrl: String?
    let heroPhotoCreditAuthor: String?   // non-nil only when heroPhotoUrl is a default photo whose license requires a credit
    let totalClimbs: Int
    let uniqueClimbers: Int
    let userAscents: Int
    let isClimbed: Bool
    var isWishlisted: Bool = false
    let byYear: [YearCount]
    let byMonth: [MonthCount]
    let recentSummits: [RecentSummit]
    let recentPhotos: [RecentPhoto]

    enum CodingKeys: String, CodingKey {
        case id, name, elevation, range
        case heroPhotoUrl   = "hero_photo_url"
        case heroPhotoCreditAuthor = "hero_photo_credit_author"
        case totalClimbs    = "total_climbs"
        case uniqueClimbers = "unique_climbers"
        case userAscents    = "user_ascents"
        case isClimbed      = "is_climbed"
        case isWishlisted   = "is_wishlisted"
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

// This user's own most recent climb date on a given mountain — distinct
// from Mountain.lastActivity, which is the most recent *public* climb by
// anyone. Used to sort/personalize the Summits tab by the viewer's own
// activity instead of app-wide activity.
struct LastClimbed: Codable, Sendable {
    let id: Int
    let date: String
}

struct Stats: Codable, Sendable {
    let totalClimbs: Int
    let uniquePeaks: Int
    let totalElevation: Int
    let totalMountains: Int
    let climbedIds: [Int]
    let recentClimbs: [RecentClimb]
    let ascentCounts: [AscentCount]
    let lastClimbed: [LastClimbed]
    let byYear: [UserYearStat]
    let byMonth: [MonthCount]
    let followers: Int?
    let following: Int?
    let wishlistCount: Int?
    let rank: ClimberRank?

    enum CodingKeys: String, CodingKey {
        case totalClimbs    = "total_climbs"
        case uniquePeaks    = "unique_peaks"
        case totalElevation = "total_elevation"
        case totalMountains = "total_mountains"
        case climbedIds     = "climbed_ids"
        case recentClimbs   = "recent_climbs"
        case ascentCounts   = "ascent_counts"
        case lastClimbed    = "last_climbed"
        case byYear         = "by_year"
        case byMonth        = "by_month"
        case wishlistCount  = "wishlist_count"
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
// (locked/unlocked tiers) in the Badges tab's Climber Level grid. One
// named level every 5 unique peaks climbed, no fixed ceiling — keep in sync
// with the server; a mismatch here just skews the locked/unlocked tile grid,
// since a user's live rank always comes from the server, not this array.
let climberLevels: [ClimberLevelDef] = [
    .init(level:   0, name: "Trailhead Arrival", minPeaks: 0),
    .init(level:   1, name: "First Light Riser", minPeaks: 5),
    .init(level:   2, name: "Trail Dust Collector", minPeaks: 10),
    .init(level:   3, name: "False Summit Survivor", minPeaks: 15),
    .init(level:   4, name: "4AM Parking Lot Regular", minPeaks: 20),
    .init(level:   5, name: "Switchback Counter", minPeaks: 25),
    .init(level:   6, name: "Trail Mix Connoisseur", minPeaks: 30),
    .init(level:   7, name: "Elevation Gain Junkie", minPeaks: 35),
    .init(level:   8, name: "High Camp Regular", minPeaks: 40),
    .init(level:   9, name: "Switchback Veteran", minPeaks: 45),
    .init(level:  10, name: "Switchback Scrambler", minPeaks: 50),
    .init(level:  11, name: "Scree Field Veteran", minPeaks: 55),
    .init(level:  12, name: "Talus Hopper", minPeaks: 60),
    .init(level:  13, name: "Windbreak Wanderer", minPeaks: 65),
    .init(level:  14, name: "Krummholz Crosser", minPeaks: 70),
    .init(level:  15, name: "Cairnstacker", minPeaks: 75),
    .init(level:  16, name: "Boulder Field Navigator", minPeaks: 80),
    .init(level:  17, name: "Snowfield Stepper", minPeaks: 85),
    .init(level:  18, name: "Class 2 Climber", minPeaks: 90),
    .init(level:  19, name: "Basin Explorer", minPeaks: 95),
    .init(level:  20, name: "Ridge Runner", minPeaks: 100),
    .init(level:  21, name: "Knife-Edge Novice", minPeaks: 105),
    .init(level:  22, name: "Saddle Crosser", minPeaks: 110),
    .init(level:  23, name: "Exposure Handler", minPeaks: 115),
    .init(level:  24, name: "Couloir Scout", minPeaks: 120),
    .init(level:  25, name: "Arête Aspirant", minPeaks: 125),
    .init(level:  26, name: "Cornice Watcher", minPeaks: 130),
    .init(level:  27, name: "Traverse Tactician", minPeaks: 135),
    .init(level:  28, name: "Class 3 Climber", minPeaks: 140),
    .init(level:  29, name: "Sawtooth Seeker", minPeaks: 145),
    .init(level:  30, name: "Alpine Adventurer", minPeaks: 150),
    .init(level:  31, name: "Glacier Gazer", minPeaks: 155),
    .init(level:  32, name: "Headwall Hiker", minPeaks: 160),
    .init(level:  33, name: "Basin Bagger", minPeaks: 165),
    .init(level:  34, name: "Moraine Wanderer", minPeaks: 170),
    .init(level:  35, name: "Tarn Chaser", minPeaks: 175),
    .init(level:  36, name: "Cirque Circler", minPeaks: 180),
    .init(level:  37, name: "Class 4 Climber", minPeaks: 185),
    .init(level:  38, name: "Snowpack Reader", minPeaks: 190),
    .init(level:  39, name: "Route-Finder", minPeaks: 195),
    .init(level:  40, name: "Summit Seeker", minPeaks: 200),
    .init(level:  41, name: "Elevation Chaser", minPeaks: 205),
    .init(level:  42, name: "Wind-Scoured Wanderer", minPeaks: 210),
    .init(level:  43, name: "Headlamp Starter", minPeaks: 215),
    .init(level:  44, name: "Pre-Dawn Departer", minPeaks: 220),
    .init(level:  45, name: "Rock Glacier Rambler", minPeaks: 225),
    .init(level:  46, name: "Boulder Problem Solver", minPeaks: 230),
    .init(level:  47, name: "Talus Traverser", minPeaks: 235),
    .init(level:  48, name: "Class 5 Contemplator", minPeaks: 240),
    .init(level:  49, name: "Peakbagging Prodigy", minPeaks: 245),
    .init(level:  50, name: "Peak Bagger", minPeaks: 250),
    .init(level:  51, name: "List Checker", minPeaks: 255),
    .init(level:  52, name: "Logbook Loyalist", minPeaks: 260),
    .init(level:  53, name: "Range Roamer", minPeaks: 265),
    .init(level:  54, name: "Standard Route Master", minPeaks: 270),
    .init(level:  55, name: "Weather Window Watcher", minPeaks: 275),
    .init(level:  56, name: "Approach Trail Expert", minPeaks: 280),
    .init(level:  57, name: "Bushwhack Survivor", minPeaks: 285),
    .init(level:  58, name: "Scramble Specialist", minPeaks: 290),
    .init(level:  59, name: "Summit Selfie Veteran", minPeaks: 295),
    .init(level:  60, name: "High Country Veteran", minPeaks: 300),
    .init(level:  61, name: "Timberline Trekker", minPeaks: 305),
    .init(level:  62, name: "Alpine Lake Collector", minPeaks: 310),
    .init(level:  63, name: "Basin-to-Basin Traveler", minPeaks: 315),
    .init(level:  64, name: "Sub-Range Specialist", minPeaks: 320),
    .init(level:  65, name: "Watershed Wanderer", minPeaks: 325),
    .init(level:  66, name: "Continental Divide Devotee", minPeaks: 330),
    .init(level:  67, name: "Storm Cell Dodger", minPeaks: 335),
    .init(level:  68, name: "Second Sunrise Seeker", minPeaks: 340),
    .init(level:  69, name: "Distant Range Dreamer", minPeaks: 345),
    .init(level:  70, name: "Thin Air Master", minPeaks: 350),
    .init(level:  71, name: "Altitude Acclimated", minPeaks: 355),
    .init(level:  72, name: "Oxygen Optimizer", minPeaks: 360),
    .init(level:  73, name: "Headache-Proof Hiker", minPeaks: 365),
    .init(level:  74, name: "High-Elevation Regular", minPeaks: 370),
    .init(level:  75, name: "Above-Treeline Traveler", minPeaks: 375),
    .init(level:  76, name: "Rarefied Air Regular", minPeaks: 380),
    .init(level:  77, name: "Wind Chill Warrior", minPeaks: 385),
    .init(level:  78, name: "Lightning Retreat Expert", minPeaks: 390),
    .init(level:  79, name: "Class 5 Certified", minPeaks: 395),
    .init(level:  80, name: "Summit Elite", minPeaks: 400),
    .init(level:  81, name: "Vertical Mile Veteran", minPeaks: 405),
    .init(level:  82, name: "Century Peak Club", minPeaks: 410),
    .init(level:  83, name: "Range-Spanning Rambler", minPeaks: 415),
    .init(level:  84, name: "All-Weather Ascender", minPeaks: 420),
    .init(level:  85, name: "Solo Summit Specialist", minPeaks: 425),
    .init(level:  86, name: "Peakbagging Purist", minPeaks: 430),
    .init(level:  87, name: "Ultra-Prominence Pursuer", minPeaks: 435),
    .init(level:  88, name: "Centennial Chaser", minPeaks: 440),
    .init(level:  89, name: "Multi-Range Master", minPeaks: 445),
    .init(level:  90, name: "Summit Sage", minPeaks: 450),
    .init(level:  91, name: "Trail Wisdom Keeper", minPeaks: 455),
    .init(level:  92, name: "Route Encyclopedia", minPeaks: 460),
    .init(level:  93, name: "Weather Pattern Prophet", minPeaks: 465),
    .init(level:  94, name: "Gear Optimization Guru", minPeaks: 470),
    .init(level:  95, name: "Beta Sharer", minPeaks: 475),
    .init(level:  96, name: "Mountain Mentor", minPeaks: 480),
    .init(level:  97, name: "Peakbagging Historian", minPeaks: 485),
    .init(level:  98, name: "Range Cartographer", minPeaks: 490),
    .init(level:  99, name: "Summit Sherpa", minPeaks: 495),
    .init(level: 100, name: "Granite Guardian", minPeaks: 500),
    .init(level: 101, name: "Bedrock Believer", minPeaks: 505),
    .init(level: 102, name: "Igneous Icon", minPeaks: 510),
    .init(level: 103, name: "Talus Titan", minPeaks: 515),
    .init(level: 104, name: "Cirque Custodian", minPeaks: 520),
    .init(level: 105, name: "Ridgeline Fixture", minPeaks: 525),
    .init(level: 106, name: "Summit Register Fixture", minPeaks: 530),
    .init(level: 107, name: "Peakbagging Powerhouse", minPeaks: 535),
    .init(level: 108, name: "Alpine Authority", minPeaks: 540),
    .init(level: 109, name: "Range Royalty", minPeaks: 545),
    .init(level: 110, name: "Continental Conqueror", minPeaks: 550),
    .init(level: 111, name: "Divide Dominator", minPeaks: 555),
    .init(level: 112, name: "Watershed Warlord", minPeaks: 560),
    .init(level: 113, name: "Range-Clearing Ronin", minPeaks: 565),
    .init(level: 114, name: "Peak Count Colossus", minPeaks: 570),
    .init(level: 115, name: "Summit Streak Sovereign", minPeaks: 575),
    .init(level: 116, name: "Elevation Emperor", minPeaks: 580),
    .init(level: 117, name: "Basin-to-Summit Baron", minPeaks: 585),
    .init(level: 118, name: "Alpine Archon", minPeaks: 590),
    .init(level: 119, name: "Threshold of Legend", minPeaks: 595),
    .init(level: 120, name: "Skyline Sovereign", minPeaks: 600),
    .init(level: 121, name: "Apex Ascender", minPeaks: 605),
    .init(level: 122, name: "Summit Sovereign", minPeaks: 610),
    .init(level: 123, name: "Peakbagging Paragon", minPeaks: 615),
    .init(level: 124, name: "Range-Conquering Colossus", minPeaks: 620),
    .init(level: 125, name: "Alpine Immortal", minPeaks: 625),
    .init(level: 126, name: "Mountain Monarch", minPeaks: 630),
    .init(level: 127, name: "Legend of the High Country", minPeaks: 635),
    .init(level: 128, name: "Summit Legend", minPeaks: 640),
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
    let isBlocked: Bool?
    let rank: ClimberRank?

    enum CodingKeys: String, CodingKey {
        case id, name, bio, rank
        case avatarUrl     = "avatar_url"
        case backgroundUrl = "background_url"
        case totalClimbs   = "total_climbs"
        case uniquePeaks   = "unique_peaks"
        case followers, following
        case isFollowing   = "is_following"
        case isBlocked     = "is_blocked"
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
    let parentCommentId: Int?
    var isOwner: Bool?
    var likeCount: Int = 0
    var isLiked: Bool = false

    enum CodingKeys: String, CodingKey {
        case id, body
        case userId          = "user_id"
        case userName        = "user_name"
        case userAvatarUrl   = "user_avatar_url"
        case createdAt       = "created_at"
        case parentCommentId = "parent_comment_id"
        case isOwner         = "is_owner"
        case likeCount       = "like_count"
        case isLiked         = "is_liked"
    }
}

// MARK: - Like response

struct LikeResponse: Codable, Sendable {
    let liked: Bool
    let count: Int
}

// MARK: - Climb Invite

struct ClimbInvite: Codable, Identifiable, Sendable {
    let id: Int
    let mountainId: Int
    let mountainName: String?
    let mountainElevation: Int?
    let mountainRange: String?
    let mountainState: String?
    let inviterId: Int
    let inviterName: String?
    let inviterAvatarUrl: String?
    let climbDate: String?
    let note: String?
    let shareToken: String?
    let createdAt: String
    let isInviter: Bool
    let myStatus: String?
    let recipients: [InviteRecipient]

    enum CodingKeys: String, CodingKey {
        case id, note, recipients
        case mountainId         = "mountain_id"
        case mountainName       = "mountain_name"
        case mountainElevation  = "mountain_elevation"
        case mountainRange      = "mountain_range"
        case mountainState      = "mountain_state"
        case inviterId          = "inviter_id"
        case inviterName        = "inviter_name"
        case inviterAvatarUrl   = "inviter_avatar_url"
        case climbDate          = "climb_date"
        case shareToken         = "share_token"
        case createdAt          = "created_at"
        case isInviter          = "is_inviter"
        case myStatus           = "my_status"
    }
}

struct InviteRecipient: Codable, Identifiable, Sendable {
    let id: Int
    let status: String
    let viaLink: Bool
    let isGuest: Bool
    let respondedAt: String?
    let userId: Int?
    let userName: String
    let userAvatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, status
        case viaLink     = "via_link"
        case isGuest     = "is_guest"
        case respondedAt = "responded_at"
        case userId      = "user_id"
        case userName    = "user_name"
        case userAvatarUrl = "user_avatar_url"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        status = try c.decode(String.self, forKey: .status)
        viaLink = try c.decode(Bool.self, forKey: .viaLink)
        isGuest = try c.decodeIfPresent(Bool.self, forKey: .isGuest) ?? false
        respondedAt = try c.decodeIfPresent(String.self, forKey: .respondedAt)
        userId = try c.decodeIfPresent(Int.self, forKey: .userId)
        userName = try c.decode(String.self, forKey: .userName)
        userAvatarUrl = try c.decodeIfPresent(String.self, forKey: .userAvatarUrl)
    }
}

struct MyInvites: Codable, Sendable {
    let sent: [ClimbInvite]
    let received: [ClimbInvite]
}

struct WishlistPeak: Codable, Identifiable, Sendable {
    let id: Int
    let name: String
    let elevation: Int
    let range: String
    let state: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, name, elevation, range, state
        case createdAt = "created_at"
    }
}

// MARK: - NotificationItem

struct NotificationItem: Codable, Identifiable, Sendable {
    let id: Int
    let type: String
    let fromUserId: Int
    let fromUserName: String
    let fromUserAvatarUrl: String?
    let climbId: Int?
    let commentId: Int?
    let inviteId: Int?
    let guestName: String?
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
        case commentId         = "comment_id"
        case inviteId          = "invite_id"
        case guestName         = "guest_name"
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
    static let navigateToInvite = Notification.Name("navigateToInvite")
    static let climbLikeChanged = Notification.Name("climbLikeChanged")
}

// MARK: - Helpers

extension Int {
    /// Share-caption hashtags for a climb's elevation -- Colorado's 13ers
    /// get their own tags rather than inheriting the 14ers-only ones this
    /// app started with before it added 13er support.
    var summitHashtags: String {
        self >= 14_000 ? "#Colorado14ers #14ers" : "#Colorado13ers #13ers"
    }
}

// .navigationDestination(item:) only needs Hashable, which Int already
// gets for free, but .sheet(item:) requires Identifiable -- this lets a
// raw id (climbId, inviteId, etc.) drive a sheet the same way it already
// drives navigation, instead of needing a wrapper type at every call site.
extension Int: Identifiable {
    public var id: Int { self }
}

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
        // Unlike climb dates (date-only, no time-of-day), created_at is a
        // full UTC timestamp -- truncating to its first 10 characters grabs
        // the UTC calendar day, which rolls to "tomorrow" for anything
        // posted in the evening in US time zones. Parse the full instant
        // and let the display formatter convert to the device's local day.
        let isoFormatter = DateFormatter()
        isoFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        isoFormatter.timeZone = TimeZone(identifier: "UTC")
        guard let date = isoFormatter.date(from: self) else { return self }
        let display = DateFormatter()
        display.dateFormat = "MMM d, yyyy"
        return display.string(from: date)
    }
}
