import { getDB, hasDatabase } from './_lib/db.js';
import { getActiveMediaBySlotKeys, listMedia } from './_lib/local-db.js';
import { normalizeMediaPlacement } from './_lib/media-library.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

const GALLERY_SLOT_KEYS = [
  'gallery_highlight_video',
  'gallery_zone_1_primary',
  'gallery_zone_1_secondary',
  'gallery_zone_1_tertiary',
  'gallery_zone_2_primary',
  'gallery_zone_2_secondary',
  'gallery_zone_2_tertiary',
  'gallery_zone_3_primary',
  'gallery_zone_3_secondary',
  'gallery_zone_3_tertiary',
  'gallery_journey_consult',
  'gallery_journey_treatment',
  'gallery_journey_aftercare',
];

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    if (!hasDatabase()) {
      const allMedia = listMedia({ page: 1, limit: 1000, status: 'active' }).data || [];
      const legacyData = getActiveMediaBySlotKeys(GALLERY_SLOT_KEYS);
      const merged = [...allMedia, ...legacyData].reduce((acc, item) => {
        acc.set(String(item.id), normalizeMediaPlacement(item));
        return acc;
      }, new Map());
      const data = [...merged.values()].filter((item) => (
        (item.page_key === 'galeri' && (item.section_key === 'video_gallery' || item.section_key === 'photo_gallery'))
        || GALLERY_SLOT_KEYS.includes(item.slot_key)
      ));
      return jsonResponse({
        data,
        slots: Object.fromEntries(data.map((item) => [item.slot_key, item])),
      });
    }

    const sql = getDB();
    const rows = await sql`
      SELECT * FROM media_assets
      WHERE status = 'active'
        AND (
          (page_key = 'galeri' AND section_key IN ('video_gallery', 'photo_gallery'))
          OR slot_key = ANY(${GALLERY_SLOT_KEYS})
        )
      ORDER BY display_order ASC, updated_at DESC
    `;
    const data = rows.map((item) => normalizeMediaPlacement(item));

    return jsonResponse({
      data,
      slots: Object.fromEntries(data.filter((item) => item.slot_key).map((item) => [item.slot_key, item])),
    });
  } catch (error) {
    console.error('Gallery content API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
