export interface Mountain {
  id: number;
  name: string;
  elevation: number;
  range: string;
}

export type Visibility = 'public' | 'followers' | 'private';

export interface Climb {
  id: number;
  mountain_id: number;
  mountain_name: string;
  elevation: number;
  range: string;
  climb_date: string;
  notes: string | null;
  photo_path: string | null;
  photo_url: string | null;
  visibility: Visibility;
  created_at: string;
  user_id?: number;
  user_name?: string;
}

export interface Stats {
  total_climbs: number;
  unique_peaks: number;
  total_elevation: number;
  total_mountains: number;
  by_month: { month: string; count: number }[];
  by_year: { year: string; count: number }[];
  top_mountains: { name: string; elevation: number; climb_count: number }[];
  recent_climbs: {
    id: number;
    mountain_name: string;
    elevation: number;
    climb_date: string;
    photo_url: string | null;
  }[];
  climbed_ids: number[];
}

export interface User {
  id: number;
  name: string;
  bio: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  total_climbs?: number;
  unique_peaks?: number;
  followers?: number;
  following?: number;
  is_following?: boolean;
}

export interface Profile extends User {}

export interface FeedItem {
  id: number;
  climb_date: string;
  photo_url: string | null;
  visibility: Visibility;
  notes: string | null;
  mountain_name: string;
  mountain_id: number;
  elevation: number;
  range: string;
  user_id: number;
  user_name: string;
  user_avatar_url: string | null;
}
