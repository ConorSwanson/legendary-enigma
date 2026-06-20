import type { Mountain, Climb, Stats, Profile, User, FeedItem } from './types';
import { getAuthToken } from './utils/authStore';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    me: () => request<Profile>('/auth/me'),
  },
  mountains: {
    list: () => request<Mountain[]>('/mountains'),
  },
  climbs: {
    list: (params?: { year?: string; mountain_id?: number; page?: number }) => {
      const q = new URLSearchParams();
      if (params?.year) q.set('year', params.year);
      if (params?.mountain_id) q.set('mountain_id', String(params.mountain_id));
      if (params?.page) q.set('page', String(params.page));
      const qs = q.toString();
      return request<Climb[]>(`/climbs${qs ? `?${qs}` : ''}`);
    },
    get: (id: number) => request<Climb>(`/climbs/${id}`),
    create: (data: FormData) =>
      request<{ id: number }>('/climbs', { method: 'POST', body: data }),
    update: (id: number, data: FormData) =>
      request<{ success: boolean }>(`/climbs/${id}`, { method: 'PUT', body: data }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/climbs/${id}`, { method: 'DELETE' }),
  },
  stats: {
    get: () => request<Stats>('/stats'),
  },
  profile: {
    get: () => request<Profile>('/profile'),
    update: (data: FormData) =>
      request<{ success: boolean }>('/profile', { method: 'PUT', body: data }),
  },
  users: {
    get: (id: number) => request<User>(`/users/${id}`),
    search: (q: string) => request<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
    follow: (id: number) =>
      request<{ success: boolean }>(`/users/${id}/follow`, { method: 'POST' }),
    unfollow: (id: number) =>
      request<{ success: boolean }>(`/users/${id}/follow`, { method: 'DELETE' }),
    climbs: (id: number) => request<Climb[]>(`/users/${id}/climbs`),
  },
  feed: {
    following: (page = 1) => request<FeedItem[]>(`/feed?page=${page}`),
    discover: (page = 1) => request<FeedItem[]>(`/feed/discover?page=${page}`),
  },
};
