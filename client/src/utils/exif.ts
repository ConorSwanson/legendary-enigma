import { parse } from 'exifr';
import { MOUNTAIN_COORDS } from '../data/mountain-coords';

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

export async function extractPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const exif = await parse(file, {
      gps: true,
      exif: true,
      tiff: true,
    });

    if (!exif) return { date: null, mountainId: null, distanceKm: null };

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

      for (const [id, coords] of Object.entries(MOUNTAIN_COORDS)) {
        const d = haversineKm(exif.latitude, exif.longitude, coords.lat, coords.lng);
        if (d < minDist) {
          minDist = d;
          closestId = Number(id);
        }
      }

      // Only suggest within 20km — covers trailhead-to-summit range
      if (minDist <= 20) {
        mountainId = closestId;
        distanceKm = Math.round(minDist * 10) / 10;
      }
    }

    return { date, mountainId, distanceKm };
  } catch {
    return { date: null, mountainId: null, distanceKm: null };
  }
}
