export interface Mountain {
  id: number;
  name: string;
  elevation: number;
  range: string;
}

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
  created_at: string;
}

export interface Stats {
  total_climbs: number;
  unique_peaks: number;
  total_elevation: number;
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
}

export interface Profile {
  id: number;
  name: string;
  bio: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
}
