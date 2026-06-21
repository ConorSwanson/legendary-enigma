import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Mountain } from '../types';
import { extractPhotoMeta } from '../utils/exif';

async function compressImage(file: File, maxPx = 1920, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height / width) * maxPx);
          width = maxPx;
        } else {
          width = Math.round((width / height) * maxPx);
          height = maxPx;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob
          ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
          : file
        ),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

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
    visibility: 'public' as 'public' | 'followers' | 'private',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [autoFill, setAutoFill] = useState<AutoFill | null>(null);
  const [parsing, setParsing] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.mountains.list().then(setMountains).catch((e: Error) => setError(e.message));
  }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
    setAutoFill(null);

    if (!file) { setPhoto(null); return; }

    setParsing(true);
    setCompressing(true);
    const [meta, compressed] = await Promise.all([
      extractPhotoMeta(file),
      compressImage(file),
    ]);
    setParsing(false);
    setCompressing(false);
    setPhoto(compressed);

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

    if (filled.date || filled.mountain) {
      setAutoFill(filled);
    } else if (meta.date === null && meta.mountainId === null) {
      // No EXIF at all — show a soft hint rather than silent failure
      setAutoFill({ date: false, mountain: false });
    }
  }

  function clearPhoto() {
    setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setAutoFill(null);
    setCompressing(false);
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
    fd.append('visibility', form.visibility);
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
              {(parsing || compressing) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-gray-300 px-3 py-1.5 flex items-center gap-2">
                  <span className="animate-spin inline-block">⏳</span>
                  {compressing ? 'Compressing photo…' : 'Reading photo metadata…'}
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
                Date &amp; mountain auto-filled from photo GPS · Photos compressed automatically
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
        {autoFill && !autoFill.date && !autoFill.mountain ? (
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 flex items-start gap-2 text-sm">
            <span className="text-gray-500 mt-0.5 shrink-0">ℹ</span>
            <div className="text-gray-400">
              No metadata found in this photo.
              <span className="block text-xs mt-0.5 text-gray-600">
                On iPhone, location is removed from photos for privacy. Fill in the fields below manually.
              </span>
            </div>
          </div>
        ) : autoFill && (
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
              {!autoFill.mountain && (
                <span className="block text-xs mt-0.5 text-emerald-600">
                  Location not available (iPhone removes GPS from photos) — select mountain below
                </span>
              )}
              {(autoFill.mountain || autoFill.date) && (
                <span className="text-emerald-600 block text-xs mt-0.5">Review and adjust below if needed</span>
              )}
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

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Who can see this?</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'public', label: '🌐 Public', desc: 'Everyone' },
              { value: 'followers', label: '👥 Followers', desc: 'Followers only' },
              { value: 'private', label: '🔒 Private', desc: 'Just you' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, visibility: opt.value }))}
                className={`p-2.5 rounded-lg border text-center transition-colors ${
                  form.visibility === opt.value
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                <div className="text-sm">{opt.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || compressing}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-900 disabled:text-sky-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Uploading…' : compressing ? 'Compressing photo…' : 'Save Climb'}
        </button>
      </form>
    </div>
  );
}
