import { requireAuth } from './_lib/auth.js';
import { getMediaSlotDefinitions } from './_lib/media-library.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405);
  }

  const url = new URL(request.url);
  const mediaKind = url.searchParams.get('media_kind') || '';
  const pageKey = url.searchParams.get('page_key') || '';
  const sectionKey = url.searchParams.get('section_key') || '';
  const data = getMediaSlotDefinitions({ mediaKind, pageKey, sectionKey });

  const grouped = data.reduce((acc, item) => {
    const key = `${item.page_key}:${item.section_key}`;
    if (!acc[key]) {
      acc[key] = {
        page_key: item.page_key,
        page_label: item.page_label,
        section_key: item.section_key,
        section_label: item.section_label,
        media_kind: item.media_kind,
        type: item.type,
        source_type: item.source_type,
        replace_policy: item.replace_policy,
        positions: [],
      };
    }
    acc[key].positions.push({
      position_key: item.position_key,
      position_label: item.position_label,
      slot_key: item.slot_key,
      slot_name: item.slot_name,
    });
    return acc;
  }, {});

  return jsonResponse({
    data,
    groups: Object.values(grouped),
  });
}
