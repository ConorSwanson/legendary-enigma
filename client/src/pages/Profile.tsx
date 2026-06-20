import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Profile as ProfileType, Stats } from '../types';

function fmtElev(ft: number) {
  return ft >= 1000 ? `${(ft / 1000).toFixed(1)}k` : String(ft);
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '' });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api.profile.get(), api.stats.get()])
      .then(([p, s]) => {
        setProfile(p);
        setStats(s);
        setForm({ name: p.name, bio: p.bio ?? '' });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('bio', form.bio);
    if (avatar) fd.append('avatar', avatar);
    try {
      await api.profile.update(fd);
      const updated = await api.profile.get();
      setProfile(updated);
      setEditing(false);
      setAvatar(null);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !profile) {
    return (
      <div className="text-red-400 bg-red-950/50 border border-red-900/50 rounded-xl p-4">
        {error}
      </div>
    );
  }
  if (!profile || !stats) {
    return <div className="animate-pulse bg-gray-900 border border-gray-800 rounded-xl h-64" />;
  }

  const displayAvatar = avatarPreview || profile.avatar_url;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      {/* Profile card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative group shrink-0"
              >
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl ring-2 ring-gray-700">
                    👤
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
              </button>
              <div className="text-gray-500 text-sm">Click avatar to change photo</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setAvatar(f);
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                  setAvatarPreview(f ? URL.createObjectURL(f) : null);
                }}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                placeholder="Tell us about your climbing journey…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500 resize-none placeholder:text-gray-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setAvatar(null);
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                  setAvatarPreview(null);
                }}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-700 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl ring-2 ring-gray-700 shrink-0">
                👤
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">{profile.name}</h2>
              {profile.bio ? (
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-gray-600 text-sm mt-1 italic">No bio yet</p>
              )}
              <button
                onClick={() => setEditing(true)}
                className="mt-3 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Climbing Stats
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-sky-400">{stats.total_climbs}</div>
            <div className="text-gray-500 text-sm mt-1">Total Climbs</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400">{stats.unique_peaks}</div>
            <div className="text-gray-500 text-sm mt-1">Unique Peaks</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-violet-400">{fmtElev(stats.total_elevation)}</div>
            <div className="text-gray-500 text-sm mt-1">Elevation (ft)</div>
          </div>
        </div>
      </div>

      {/* Progress toward all 58 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Progress to All 58
          </h3>
          <span className="text-gray-400 text-sm font-medium">
            {stats.unique_peaks} / 58
          </span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (stats.unique_peaks / 58) * 100)}%` }}
          />
        </div>
        <p className="text-gray-600 text-xs mt-2">
          {58 - stats.unique_peaks} peaks remaining
        </p>
      </div>
    </div>
  );
}
