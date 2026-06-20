import type { Mountain, Climb, Stats, Profile } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const api = {
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
};
