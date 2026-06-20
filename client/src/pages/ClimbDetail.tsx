import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Climb, Mountain } from '../types';

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClimbDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [climb, setClimb] = useState<Climb | null>(null);
  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ mountain_id: '', climb_date: '', notes: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.climbs.get(Number(id)), api.mountains.list()])
      .then(([c, ms]) => {
        setClimb(c);
        setMountains(ms);
        setForm({
          mountain_id: String(c.mountain_id),
          climb_date: c.climb_date,
          notes: c.notes ?? '',
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('mountain_id', form.mountain_id);
    fd.append('climb_date', form.climb_date);
    fd.append('notes', form.notes);
    if (photo) fd.append('photo', photo);
    try {
      await api.climbs.update(Number(id), fd);
      const updated = await api.climbs.get(Number(id));
      setClimb(updated);
      setEditing(false);
      setPhoto(null);
      setPreview(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.climbs.delete(Number(id));
      navigate('/history');
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  if (error && !climb) {
    return (
      <div className="text-red-400 bg-red-950/50 border border-red-900/50 rounded-xl p-4">
        {error}
      </div>
    );
  }
  if (!climb) {
    return <div className="animate-pulse bg-gray-900 border border-gray-800 rounded-xl h-64" />;
  }

  const displayPhoto = preview || climb.photo_url;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/history" className="text-gray-500 hover:text-gray-300 text-sm transition-colors mb-6 inline-block">
        ← Back to My Climbs
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {displayPhoto && (
          <img
            src={displayPhoto}
            alt={climb.mountain_name}
            className="w-full h-72 object-cover"
          />
        )}

        <div className="p-6">
          {error && (
            <div className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-900/50 rounded-lg p-3">
              {error}
            </div>
          )}

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Mountain</label>
                <select
                  value={form.mountain_id}
                  onChange={e => setForm(f => ({ ...f, mountain_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  {mountains.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.elevation.toLocaleString()} ft
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={form.climb_date}
                  onChange={e => setForm(f => ({ ...f, climb_date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">
                  {climb.photo_url ? 'Replace Photo' : 'Add Photo'}
                </label>
                {preview ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={preview} alt="" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-900/80 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-700 hover:border-sky-600 rounded-lg p-5 text-center transition-colors"
                  >
                    <span className="text-gray-500 text-sm">Click to upload a photo</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null;
                    setPhoto(f);
                    if (preview) URL.revokeObjectURL(preview);
                    setPreview(f ? URL.createObjectURL(f) : null);
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setPhoto(null); setPreview(null); }}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{climb.mountain_name}</h1>
                  <div className="text-emerald-400 font-semibold text-lg mt-0.5">
                    {climb.elevation.toLocaleString()} ft
                  </div>
                  <div className="text-gray-500 text-sm mt-0.5">{climb.range}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{fmtDate(climb.climb_date)}</div>
                </div>
              </div>

              {climb.notes && (
                <p className="text-gray-300 text-sm leading-relaxed bg-gray-800 rounded-lg p-4 mb-4">
                  {climb.notes}
                </p>
              )}

              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={() => setEditing(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Edit
                </button>

                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Are you sure?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-500 hover:text-red-400 hover:bg-red-950/30 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
