import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Mountain } from '../types';
import { extractPhotoMeta } from '../utils/exif';

interface AutoFill {
  date: boolean;
  mountain: boolean;
  mountainName?: string;
  distanceKm?: number;
}

export default function LogClimb() {
  const navigate = useNavigate();
  const [mountains, setMountains] = useState<Mountain[]>([]);
  const [form, setForm] = useState({
    mountain_id: '',
    climb_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [autoFill, setAutoFill] = useState<AutoFill | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.mountains.list().then(setMountains).catch((e: Error) => setError(e.message));
  }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
    setAutoFill(null);

    if (!file) return;

    setParsing(true);
    const meta = await extractPhotoMeta(file);
    setParsing(false);

    const filled: AutoFill = { date: false, mountain: false };

    if (meta.date) {
      setForm(f => ({ ...f, climb_date: meta.date! }));
      filled.date = true;
    }
    if (meta.mountainId) {
      setForm(f => ({ ...f, mountain_id: String(meta.mountainId) }));
      filled.mountain = true;
      const m = mountains.find(m => m.id === meta.mountainId);
      filled.mountainName = m?.name;
      filled.distanceKm = meta.distanceKm ?? undefined;
    }

    if (filled.date || filled.mountain) setAutoFill(filled);
  }

  function clearPhoto() {
    setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setAutoFill(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mountain_id) { setError('Please select a mountain'); return; }
    setSubmitting(true);
    setError('');

    const fd = new FormData();
    fd.append('mountain_id', form.mountain_id);
    fd.append('climb_date', form.climb_date);
    fd.append('notes', form.notes);
    if (photo) fd.append('photo', photo);

    try {
      await api.climbs.create(fd);
      navigate('/history');
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const selectedMountain = mountains.find(m => String(m.id) === form.mountain_id);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Log a Climb</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="text-red-400 text-sm bg-red-950/50 border border-red-900/50 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Photo first — drives auto-fill */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Photo</label>
          {preview ? (
            <div className="relative rounded-lg overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-52 object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 bg-black/60 hover:bg-red-900/80 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors text-lg leading-none"
              >
                ×
              </button>
              {parsing && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-gray-300 px-3 py-1.5 flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Reading photo metadata…
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700 hover:border-sky-600 rounded-lg p-8 text-center transition-colors group"
            >
              <div className="text-2xl mb-2">📷</div>
              <div className="text-gray-400 group-hover:text-gray-300 text-sm transition-colors">
                Click to attach a photo
              </div>
              <div className="text-gray-600 text-xs mt-1">
                Date &amp; mountain auto-filled from photo GPS · JPEG, PNG, WEBP · max 10 MB
              </div>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
          />
        </div>

        {/* Auto-fill banner */}
        {autoFill && (
          <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-lg px-3 py-2.5 flex items-start gap-2 text-sm">
            <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
            <div className="text-emerald-300">
              Auto-filled from photo
              {autoFill.mountain && autoFill.mountainName && (
                <span>
                  {' '}— <strong>{autoFill.mountainName}</strong>
                  {autoFill.distanceKm !== undefined && (
                    <span className="text-emerald-500 text-xs ml-1">({autoFill.distanceKm} km from summit)</span>
                  )}
                </span>
              )}
              {autoFill.date && <span> · date set</span>}
              <span className="text-emerald-600 block text-xs mt-0.5">Review and adjust below if needed</span>
            </div>
          </div>
        )}

        {/* Mountain select */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Mountain <span className="text-red-400">*</span>
          </label>
          <select
            value={form.mountain_id}
            onChange={e => setForm(f => ({ ...f, mountain_id: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
            required
          >
            <option value="">Select a 14er…</option>
            {mountains.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.elevation.toLocaleString()} ft ({m.range})
              </option>
            ))}
          </select>
          {selectedMountain && (
            <p className="text-emerald-400 text-xs mt-1.5 font-medium">
              {selectedMountain.elevation.toLocaleString()} ft · {selectedMountain.range}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={form.climb_date}
            onChange={e => setForm(f => ({ ...f, climb_date: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={4}
            placeholder="Conditions, route taken, how it went…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 resize-none placeholder:text-gray-600 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-900 disabled:text-sky-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Saving…' : 'Save Climb'}
        </button>
      </form>
    </div>
  );
}
