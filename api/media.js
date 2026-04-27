import { getDB, hasDatabase } from './_lib/db.js';
import { getWebsiteSectionBySlotKey } from './_lib/content-sections.js';
import { requireAuth } from './_lib/auth.js';
import { createMedia, deleteMediaById, getMediaSummary, listMedia, updateMedia } from './_lib/local-db.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;

function normalizeStoredStatus(status) {
  return status === 'inactive' ? 'archived' : (status || 'draft');
}

function validateMediaPayload(body) {
  const type = body.type || 'image';
  const sizeBytes = Number(body.size_bytes || 0);

  if (type === 'image' && sizeBytes > IMAGE_MAX_BYTES) {
    return 'Ukuran gambar maksimal 5 MB.';
  }

  if (type === 'video' && sizeBytes > VIDEO_MAX_BYTES) {
    return 'Ukuran video maksimal 20 MB.';
  }

  return null;
}

function isSingleSlot(slotKey) {
  return ['hero_media', 'promo_featured', 'featured_media', 'banner_media', 'background_media', 'logo_brand', 'floating_whatsapp'].includes(slotKey)
    || String(slotKey || '').startsWith('gallery_');
}

function resolveSectionName(body) {
  return body.section_name || getWebsiteSectionBySlotKey(body.slot_key) || null;
}

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Semua method butuh auth
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    // GET: List semua media
    if (request.method === 'GET') {
      const category = url.searchParams.get('category');
      const type = url.searchParams.get('type');
      const status = url.searchParams.get('status');
      const platform = url.searchParams.get('platform');
      const slot_key = url.searchParams.get('slot_key');
      const section_name = url.searchParams.get('section_name');
      const search = url.searchParams.get('search');
      const summary = url.searchParams.get('summary');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      if (!hasDatabase()) {
        if (summary === 'true') {
          return jsonResponse({ summary: getMediaSummary() });
        }
        return jsonResponse(listMedia({ category, type, status, platform, slot_key, section_name, search, page, limit }));
      }

      const sql = getDB();
      if (summary === 'true') {
        const rows = await sql`SELECT status, type FROM media_assets`;
        return jsonResponse({
          summary: {
            total: rows.length,
            active: rows.filter((item) => item.status === 'active').length,
            draft: rows.filter((item) => item.status === 'draft').length,
            archived: rows.filter((item) => item.status === 'archived').length,
            documents: rows.filter((item) => item.type === 'document').length,
          },
        });
      }

      const offset = (page - 1) * limit;

      let rows = await sql`SELECT * FROM media_assets ORDER BY uploaded_at DESC`;
      if (category) rows = rows.filter((item) => item.category === category);
      if (type) rows = rows.filter((item) => item.type === type);
      if (status) rows = rows.filter((item) => item.status === status);
      if (platform) rows = rows.filter((item) => item.platform === platform);
      if (slot_key) rows = rows.filter((item) => item.slot_key === slot_key);
      if (section_name) rows = rows.filter((item) => item.section_name === section_name);
      if (search) {
        const query = search.toLowerCase();
        rows = rows.filter((item) =>
          [item.filename, item.title, item.category, item.campaign, item.platform, item.alt_text, item.notes, item.slot_key, item.slot_name, item.section_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)) ||
          String(item.tags || '').toLowerCase().includes(query)
        );
      }

      const total = rows.length;
      rows = rows.slice(offset, offset + limit);

      return jsonResponse({
        data: rows,
        pagination: { page, limit, total },
      });
    }

    // POST: Simpan metadata media (setelah upload ke Cloudinary)
    if (request.method === 'POST') {
      const body = await request.json();
      const { filename, title, source_type, cloudinary_id, section_name, slot_key, slot_name, is_slot_active, display_order, original_url, optimized_url, thumb_url, url: mediaUrl, type, category, alt_text, size_bytes, tags, platform, campaign, status, notes, last_used_at, usage_count } = body;

      if (!filename || !mediaUrl) {
        return errorResponse('Filename dan URL wajib diisi.', 400);
      }

      const validationError = validateMediaPayload(body);
      if (validationError) {
        return errorResponse(validationError, 400);
      }

      if (!hasDatabase()) {
        const result = createMedia({
          filename,
          title,
          source_type,
          cloudinary_id,
          section_name: resolveSectionName(body),
          slot_key,
          slot_name,
          is_slot_active,
          display_order,
          original_url,
          optimized_url,
          thumb_url,
          url: mediaUrl,
          type,
          category,
          alt_text,
          size_bytes,
          tags,
          platform,
          campaign,
          status: normalizeStoredStatus(status),
          notes,
          last_used_at,
          usage_count,
        });

        return jsonResponse({ success: true, data: result }, 201);
      }

      const sql = getDB();
      if (is_slot_active === true && slot_key && isSingleSlot(slot_key)) {
        await sql`UPDATE media_assets SET is_slot_active = false WHERE slot_key = ${slot_key}`;
      }
      const result = await sql`
        INSERT INTO media_assets (filename, title, source_type, cloudinary_id, section_name, slot_key, slot_name, is_slot_active, display_order, original_url, optimized_url, thumb_url, url, type, category, alt_text, size_bytes, tags, platform, campaign, status, notes, last_used_at, usage_count)
        VALUES (${filename}, ${title || filename}, ${source_type || 'external'}, ${cloudinary_id || null}, ${resolveSectionName(body)}, ${slot_key || null}, ${slot_name || null}, ${Boolean(is_slot_active)}, ${display_order || 0}, ${original_url || mediaUrl}, ${optimized_url || mediaUrl}, ${thumb_url || mediaUrl}, ${mediaUrl}, ${type || 'image'}, 
                ${category || 'gallery'}, ${alt_text || null}, ${size_bytes || null}, ${tags || []}, ${platform || 'website'}, ${campaign || null}, ${normalizeStoredStatus(status)}, ${notes || null}, ${last_used_at || null}, ${usage_count || 0})
        RETURNING *
      `;

      return jsonResponse({ success: true, data: result[0] }, 201);
    }

    if (request.method === 'PUT') {
      if (!id) return errorResponse('ID media wajib disertakan.', 400);

      const body = await request.json();
      const validationError = validateMediaPayload(body);
      if (validationError) {
        return errorResponse(validationError, 400);
      }

      if (!hasDatabase()) {
        const result = updateMedia(id, body);
        if (!result) return errorResponse('Media tidak ditemukan.', 404);
        return jsonResponse({ success: true, data: result });
      }

      const sql = getDB();
      if (body.is_slot_active === true && body.slot_key && isSingleSlot(body.slot_key)) {
        await sql`UPDATE media_assets SET is_slot_active = false WHERE slot_key = ${body.slot_key} AND id <> ${id}`;
      }
      const result = await sql`
        UPDATE media_assets SET
          filename = COALESCE(${body.filename || null}, filename),
          title = COALESCE(${body.title || null}, title),
          source_type = COALESCE(${body.source_type || null}, source_type),
          section_name = COALESCE(${resolveSectionName(body)}, section_name),
          slot_key = COALESCE(${body.slot_key || null}, slot_key),
          slot_name = COALESCE(${body.slot_name || null}, slot_name),
          is_slot_active = COALESCE(${body.is_slot_active ?? null}, is_slot_active),
          display_order = COALESCE(${body.display_order ?? null}, display_order),
          original_url = COALESCE(${body.original_url || null}, original_url),
          optimized_url = COALESCE(${body.optimized_url || null}, optimized_url),
          thumb_url = COALESCE(${body.thumb_url || null}, thumb_url),
          url = COALESCE(${body.url || null}, url),
          type = COALESCE(${body.type || null}, type),
          category = COALESCE(${body.category || null}, category),
          alt_text = COALESCE(${body.alt_text || null}, alt_text),
          size_bytes = COALESCE(${body.size_bytes || null}, size_bytes),
          tags = COALESCE(${body.tags || null}, tags),
          platform = COALESCE(${body.platform || null}, platform),
          campaign = COALESCE(${body.campaign || null}, campaign),
          status = COALESCE(${normalizeStoredStatus(body.status)}, status),
          notes = COALESCE(${body.notes || null}, notes),
          last_used_at = COALESCE(${body.last_used_at || null}, last_used_at),
          usage_count = COALESCE(${body.usage_count ?? null}, usage_count),
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      if (result.length === 0) return errorResponse('Media tidak ditemukan.', 404);
      return jsonResponse({ success: true, data: result[0] });
    }

    // DELETE: Hapus metadata media
    if (request.method === 'DELETE') {
      if (!id) return errorResponse('ID media wajib disertakan.', 400);

      if (!hasDatabase()) {
        const result = deleteMediaById(id);
        if (!result) return errorResponse('Media tidak ditemukan.', 404);
        return jsonResponse({
          success: true,
          message: 'Media berhasil dihapus.',
          data: result,
        });
      }

      const sql = getDB();
      const result = await sql`DELETE FROM media_assets WHERE id = ${id} RETURNING *`;
      if (result.length === 0) return errorResponse('Media tidak ditemukan.', 404);

      return jsonResponse({
        success: true,
        message: 'Media berhasil dihapus.',
        data: result[0],
      });
    }

    return errorResponse('Method not allowed.', 405);
  } catch (error) {
    console.error('Media API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
