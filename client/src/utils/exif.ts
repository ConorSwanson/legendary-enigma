import { parse } from 'exifr';
import type { Mountain } from '../types';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export interface PhotoMeta {
  date: string | null;       // ISO date string "YYYY-MM-DD"
  mountainId: number | null;
  distanceKm: number | null; // distance to matched mountain
}

export async function extractPhotoMeta(file: File, mountains: Mountain[]): Promise<PhotoMeta> {
  try {
    console.debug('[exif] file type:', file.type, 'size:', file.size);
    const exif = await parse(file, {
      gps: true,
      exif: true,
      tiff: true,
    });

    if (!exif) {
      console.debug('[exif] parse returned null');
      return { date: null, mountainId: null, distanceKm: null };
    }
    console.debug('[exif] raw result:', exif);

    // Date
    const rawDate = exif.DateTimeOriginal ?? exif.CreateDate;
    const date =
      rawDate instanceof Date
        ? rawDate.toISOString().split('T')[0]
        : null;

    // GPS → nearest mountain
    let mountainId: number | null = null;
    let distanceKm: number | null = null;

    if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
      let minDist = Infinity;
      let closestId = -1;

      for (const m of mountains) {
        if (m.lat == null || m.lng == null) continue;
        const d = haversineKm(exif.latitude, exif.longitude, m.lat, m.lng);
        if (d < minDist) {
          minDist = d;
          closestId = m.id;
        }
      }

      // Only suggest within 20km — covers trailhead-to-summit range
      if (minDist <= 20) {
        mountainId = closestId;
        distanceKm = Math.round(minDist * 10) / 10;
      }
    }

    return { date, mountainId, distanceKm };
  } catch (err) {
    console.debug('[exif] parse error:', err);
    return { date: null, mountainId: null, distanceKm: null };
  }
}
