import { getDB, hasDatabase } from './_lib/db.js';
import { getActiveMediaBySlotKeys } from './_lib/local-db.js';
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
      const data = getActiveMediaBySlotKeys(GALLERY_SLOT_KEYS);
      return jsonResponse({
        data,
        slots: Object.fromEntries(data.map((item) => [item.slot_key, item])),
      });
    }

    const sql = getDB();
    const rows = await sql`SELECT * FROM media_assets WHERE is_slot_active = true AND status = 'active' AND slot_key = ANY(${GALLERY_SLOT_KEYS}) ORDER BY display_order ASC, updated_at DESC`;

    return jsonResponse({
      data: rows,
      slots: Object.fromEntries(rows.map((item) => [item.slot_key, item])),
    });
  } catch (error) {
    console.error('Gallery content API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
