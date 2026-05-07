import { getDB, hasDatabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import {
  WEBSITE_CONTENT_SECTIONS,
  buildWebsiteSlotMap,
  groupWebsiteContentAssets,
  normalizeWebsiteSection,
} from './_lib/content-sections.js';
import { listActiveWebsiteContent, listActiveWebsiteSlots, listMedia } from './_lib/local-db.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

function buildPreviewRows(rows = [], previewMediaId) {
  if (!previewMediaId) {
    return rows.filter((item) => item.status === 'active');
  }

  const previewItem = rows.find((item) => String(item.id) === String(previewMediaId));
  if (!previewItem) {
    return null;
  }

  const slotKey = previewItem.slot_key;
  const activeRows = rows.filter((item) => item.status === 'active' && item.id !== previewItem.id);

  if (!slotKey) {
    return [
      ...activeRows,
      {
        ...previewItem,
        status: 'active',
        is_slot_active: true,
      },
    ];
  }

  const rowsWithoutSlot = activeRows.filter((item) => item.slot_key !== slotKey);

  return [
    ...rowsWithoutSlot,
    {
      ...previewItem,
      status: 'active',
      is_slot_active: true,
    },
  ];
}

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const url = new URL(request.url);
    const section = normalizeWebsiteSection(url.searchParams.get('section'));
    const previewMediaId = url.searchParams.get('preview_media_id');

    if (previewMediaId) {
      const auth = await requireAuth(request);
      if (auth instanceof Response) return auth;
    }

    if (!hasDatabase()) {
      if (previewMediaId) {
        const rows = listMedia({ page: 1, limit: 1000 }).data || [];
        const previewRows = buildPreviewRows(rows, previewMediaId);
        if (!previewRows) {
          return errorResponse('Media preview tidak ditemukan.', 404);
        }

        const grouped = groupWebsiteContentAssets(previewRows);
        const slots = buildWebsiteSlotMap(previewRows);
        const sections = section ? { [section]: grouped[section] || [] } : grouped;

        return jsonResponse({
          data: section ? (sections[section] || []) : Object.values(sections).flat(),
          sections,
          slots,
          supported_sections: WEBSITE_CONTENT_SECTIONS,
          preview: {
            media_id: String(previewMediaId),
          },
        });
      }

      const sections = listActiveWebsiteContent(section || '');
      const slots = listActiveWebsiteSlots();
      return jsonResponse({
        data: section ? (sections[section] || []) : Object.values(sections).flat(),
        sections,
        slots,
        supported_sections: WEBSITE_CONTENT_SECTIONS,
      });
    }

    const sql = getDB();
    const rows = await sql`
      SELECT * FROM media_assets
      ORDER BY display_order ASC, updated_at DESC, uploaded_at DESC
    `;

    const previewRows = buildPreviewRows(rows, previewMediaId);
    if (previewMediaId && !previewRows) {
      return errorResponse('Media preview tidak ditemukan.', 404);
    }

    const rowsForResponse = previewRows || rows.filter((item) => item.status === 'active');
    const grouped = groupWebsiteContentAssets(rowsForResponse);
    const slots = buildWebsiteSlotMap(rowsForResponse);
    const sections = section ? { [section]: grouped[section] || [] } : grouped;

    return jsonResponse({
      data: section ? (sections[section] || []) : Object.values(sections).flat(),
      sections,
      slots,
      supported_sections: WEBSITE_CONTENT_SECTIONS,
      preview: previewMediaId ? { media_id: String(previewMediaId) } : null,
    });
  } catch (error) {
    console.error('Site content API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
