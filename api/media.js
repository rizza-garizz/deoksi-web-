import { getDB, hasDatabase } from './_lib/db.js';
import { getWebsiteSectionBySlotKey } from './_lib/content-sections.js';
import {
  buildUsageLabel,
  findMediaSlotDefinition,
  getCloudinaryUrlPattern,
  getExpectedMediaSourceRule,
  isGoogleDriveFileUrl,
  isSinglePlacement,
  normalizeMediaPayload,
  normalizeMediaPlacement,
} from './_lib/media-library.js';
import { requireAuth } from './_lib/auth.js';
import { createMedia, deleteMediaById, getMediaSummary, listMedia, updateMedia } from './_lib/local-db.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;

function normalizeStoredStatus(status) {
  return status === 'inactive' ? 'archived' : (status || 'draft');
}

function validateMediaPayload(body, { partial = false } = {}) {
  const normalizedBody = normalizeMediaPayload(body);
  const type = normalizedBody.type || 'image';
  const sizeBytes = Number(body.size_bytes || 0);
  const mediaUrl = String(normalizedBody.url || '').trim();
  const cloudinaryPattern = getCloudinaryUrlPattern();
  const expectedRule = getExpectedMediaSourceRule(normalizedBody);
  const explicitSlotDefinition = findMediaSlotDefinition({
    slotKey: normalizedBody.slot_key,
    pageKey: normalizedBody.page_key,
    sectionKey: normalizedBody.section_key,
    positionKey: normalizedBody.position_key,
  });

  if (type === 'image' && sizeBytes > IMAGE_MAX_BYTES) {
    return 'Ukuran gambar maksimal 5 MB.';
  }

  if (type === 'video' && sizeBytes > VIDEO_MAX_BYTES) {
    return 'Ukuran video maksimal 20 MB.';
  }

  if (explicitSlotDefinition) {
    if (expectedRule.mediaKind && normalizedBody.media_kind && normalizedBody.media_kind !== expectedRule.mediaKind) {
      return `Slot ${explicitSlotDefinition.section_label} wajib memakai jenis media ${expectedRule.mediaKind === 'website_photo' ? 'foto website' : 'video Cloudinary'}.`;
    }
    if (expectedRule.type && normalizedBody.type && normalizedBody.type !== expectedRule.type) {
      return expectedRule.type === 'image'
        ? `Slot ${explicitSlotDefinition.section_label} hanya menerima foto.`
        : `Slot ${explicitSlotDefinition.section_label} hanya menerima video.`;
    }
    if (expectedRule.sourceType && normalizedBody.source_type && normalizedBody.source_type !== expectedRule.sourceType) {
      return expectedRule.sourceType === 'google_drive'
        ? `Frame foto ${explicitSlotDefinition.section_label} wajib memakai link Google Drive.`
        : `Frame video ${explicitSlotDefinition.section_label} wajib memakai link Cloudinary.`;
    }
  }

  if (normalizedBody.media_kind === 'video_cloudinary') {
    if (type !== 'video') return 'Video Cloudinary harus bertipe video.';
    if (!partial && !mediaUrl) return 'URL video Cloudinary wajib diisi.';
    if (normalizedBody.source_type && normalizedBody.source_type !== 'cloudinary') {
      return 'Video website wajib memakai source Cloudinary.';
    }
    if (mediaUrl && !cloudinaryPattern.test(mediaUrl)) return 'URL video harus berasal dari Cloudinary.';
    if (!partial && (!normalizedBody.page_key || !normalizedBody.section_key || !normalizedBody.position_key)) {
      return 'Halaman, section, dan posisi video wajib dipilih.';
    }
  }

  if (normalizedBody.media_kind === 'website_photo') {
    if (type !== 'image') return 'Foto Website harus bertipe image.';
    if (!partial && !mediaUrl) return 'File atau URL foto wajib diisi.';
    if (normalizedBody.source_type && normalizedBody.source_type !== 'google_drive') {
      return 'Foto website wajib memakai source Google Drive.';
    }
    if (mediaUrl && !isGoogleDriveFileUrl(normalizedBody.original_url || mediaUrl)) {
      return 'Foto Website wajib memakai link file Google Drive yang valid.';
    }
    if (!partial && (!normalizedBody.page_key || !normalizedBody.section_key || !normalizedBody.position_key)) {
      return 'Halaman, section, dan posisi foto wajib dipilih.';
    }
    if (!partial && !String(normalizedBody.alt_text || '').trim()) {
      return 'Alt text wajib diisi untuk Foto Website.';
    }
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

function buildFilename(body) {
  if (body.filename) return body.filename;
  if (body.title) {
    return String(body.title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'media-item';
  }
  return 'media-item';
}

function normalizeStatus(status) {
  return status === 'inactive' ? 'archived' : (status || 'draft');
}

function decorateRows(rows = []) {
  return rows.map((item) => {
    const normalized = normalizeMediaPlacement(item);
    return {
      ...normalized,
      usage_label: normalized.usage_label || buildUsageLabel(normalized),
    };
  });
}

function mergeMediaPayloadForPartialUpdate(existing = {}, patch = {}) {
  const merged = { ...existing, ...patch };

  for (const key of ['page_key', 'section_key', 'position_key', 'slot_key', 'slot_name', 'section_name', 'replace_policy', 'media_kind', 'type', 'source_type']) {
    if (patch[key] === undefined && existing[key] !== undefined) {
      merged[key] = existing[key];
    }
  }

  return normalizeMediaPayload(merged);
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
      const media_kind = url.searchParams.get('media_kind');
      const page_key = url.searchParams.get('page_key');
      const section_key = url.searchParams.get('section_key');
      const position_key = url.searchParams.get('position_key');
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
        return jsonResponse(listMedia({ category, type, status, platform, media_kind, page_key, section_key, position_key, slot_key, section_name, search, page, limit }));
      }

      const sql = getDB();
      if (summary === 'true') {
        const rows = decorateRows(await sql`SELECT status, type, media_kind FROM media_assets`);
        return jsonResponse({
          summary: {
            total: rows.length,
            active: rows.filter((item) => item.status === 'active').length,
            draft: rows.filter((item) => item.status === 'draft').length,
            archived: rows.filter((item) => item.status === 'archived').length,
            documents: rows.filter((item) => item.type === 'document').length,
            videos: rows.filter((item) => item.media_kind === 'video_cloudinary').length,
            photos: rows.filter((item) => item.media_kind === 'website_photo').length,
          },
        });
      }

      const offset = (page - 1) * limit;

      let rows = decorateRows(await sql`SELECT * FROM media_assets ORDER BY uploaded_at DESC`);
      if (category) rows = rows.filter((item) => item.category === category);
      if (type) rows = rows.filter((item) => item.type === type);
      if (status) rows = rows.filter((item) => item.status === status);
      if (platform) rows = rows.filter((item) => item.platform === platform);
      if (media_kind) rows = rows.filter((item) => item.media_kind === media_kind);
      if (page_key) rows = rows.filter((item) => item.page_key === page_key);
      if (section_key) rows = rows.filter((item) => item.section_key === section_key);
      if (position_key) rows = rows.filter((item) => item.position_key === position_key);
      if (slot_key) rows = rows.filter((item) => item.slot_key === slot_key);
      if (section_name) rows = rows.filter((item) => item.section_name === section_name);
      if (search) {
        const query = search.toLowerCase();
        rows = rows.filter((item) =>
          [item.filename, item.title, item.category, item.campaign, item.platform, item.alt_text, item.notes, item.slot_key, item.slot_name, item.section_name, item.page_label, item.section_label, item.position_label, item.usage_label]
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
      const body = normalizeMediaPayload(await request.json());
      const { title, source_type, cloudinary_id, page_key, section_key, position_key, replace_policy, section_name, slot_key, slot_name, is_slot_active, display_order, original_url, optimized_url, thumb_url, url: mediaUrl, type, category, alt_text, size_bytes, tags, platform, campaign, status, notes, last_used_at, usage_count, media_kind } = body;
      const filename = buildFilename(body);

      if (!mediaUrl) {
        return errorResponse('URL media wajib diisi.', 400);
      }

      const validationError = validateMediaPayload(body);
      if (validationError) {
        return errorResponse(validationError, 400);
      }

      if (!hasDatabase()) {
        const result = createMedia({
          filename,
          title,
          media_kind,
          source_type,
          cloudinary_id,
          page_key,
          section_key,
          position_key,
          replace_policy,
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
      if (is_slot_active === true && slot_key && (isSinglePlacement(body) || isSingleSlot(slot_key))) {
        await sql`UPDATE media_assets SET is_slot_active = false WHERE slot_key = ${slot_key}`;
      }
      const result = await sql`
        INSERT INTO media_assets (filename, title, media_kind, source_type, cloudinary_id, page_key, section_key, position_key, replace_policy, section_name, slot_key, slot_name, is_slot_active, display_order, original_url, optimized_url, thumb_url, url, type, category, alt_text, size_bytes, tags, platform, campaign, status, notes, last_used_at, usage_count)
        VALUES (${filename}, ${title || filename}, ${media_kind || null}, ${source_type || 'external'}, ${cloudinary_id || null}, ${page_key || null}, ${section_key || null}, ${position_key || null}, ${replace_policy || 'multiple'}, ${resolveSectionName(body)}, ${slot_key || null}, ${slot_name || null}, ${Boolean(is_slot_active)}, ${display_order || 0}, ${original_url || mediaUrl}, ${optimized_url || mediaUrl}, ${thumb_url || mediaUrl}, ${mediaUrl}, ${type || 'image'}, 
                ${category || 'gallery'}, ${alt_text || null}, ${size_bytes || null}, ${tags || []}, ${platform || 'website'}, ${campaign || null}, ${normalizeStoredStatus(status)}, ${notes || null}, ${last_used_at || null}, ${usage_count || 0})
        RETURNING *
      `;

      return jsonResponse({ success: true, data: decorateRows(result)[0] }, 201);
    }

    if (request.method === 'PUT') {
      if (!id) return errorResponse('ID media wajib disertakan.', 400);

      const rawBody = await request.json();
      const body = normalizeMediaPayload(rawBody);
      const validationError = validateMediaPayload(body, { partial: true });
      if (validationError) {
        return errorResponse(validationError, 400);
      }

      if (!hasDatabase()) {
        const result = updateMedia(id, rawBody);
        if (!result) return errorResponse('Media tidak ditemukan.', 404);
        return jsonResponse({ success: true, data: result });
      }

      const sql = getDB();
      const existingRows = await sql`SELECT * FROM media_assets WHERE id = ${id} LIMIT 1`;
      if (existingRows.length === 0) return errorResponse('Media tidak ditemukan.', 404);
      const mergedBody = mergeMediaPayloadForPartialUpdate(existingRows[0], rawBody);

      if (mergedBody.is_slot_active === true && mergedBody.slot_key && (isSinglePlacement(mergedBody) || isSingleSlot(mergedBody.slot_key))) {
        await sql`UPDATE media_assets SET is_slot_active = false WHERE slot_key = ${mergedBody.slot_key} AND id <> ${id}`;
      }
      const result = await sql`
        UPDATE media_assets SET
          filename = COALESCE(${mergedBody.filename || null}, filename),
          title = COALESCE(${mergedBody.title || null}, title),
          media_kind = COALESCE(${mergedBody.media_kind || null}, media_kind),
          source_type = COALESCE(${mergedBody.source_type || null}, source_type),
          page_key = COALESCE(${mergedBody.page_key || null}, page_key),
          section_key = COALESCE(${mergedBody.section_key || null}, section_key),
          position_key = COALESCE(${mergedBody.position_key || null}, position_key),
          replace_policy = COALESCE(${mergedBody.replace_policy || null}, replace_policy),
          section_name = COALESCE(${resolveSectionName(mergedBody)}, section_name),
          slot_key = COALESCE(${mergedBody.slot_key || null}, slot_key),
          slot_name = COALESCE(${mergedBody.slot_name || null}, slot_name),
          is_slot_active = COALESCE(${mergedBody.is_slot_active ?? null}, is_slot_active),
          display_order = COALESCE(${mergedBody.display_order ?? null}, display_order),
          original_url = COALESCE(${mergedBody.original_url || null}, original_url),
          optimized_url = COALESCE(${mergedBody.optimized_url || null}, optimized_url),
          thumb_url = COALESCE(${mergedBody.thumb_url || null}, thumb_url),
          url = COALESCE(${mergedBody.url || null}, url),
          type = COALESCE(${mergedBody.type || null}, type),
          category = COALESCE(${mergedBody.category || null}, category),
          alt_text = COALESCE(${mergedBody.alt_text || null}, alt_text),
          size_bytes = COALESCE(${mergedBody.size_bytes || null}, size_bytes),
          tags = COALESCE(${mergedBody.tags || null}, tags),
          platform = COALESCE(${mergedBody.platform || null}, platform),
          campaign = COALESCE(${mergedBody.campaign || null}, campaign),
          status = COALESCE(${normalizeStoredStatus(mergedBody.status)}, status),
          notes = COALESCE(${mergedBody.notes || null}, notes),
          last_used_at = COALESCE(${mergedBody.last_used_at || null}, last_used_at),
          usage_count = COALESCE(${mergedBody.usage_count ?? null}, usage_count),
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      if (result.length === 0) return errorResponse('Media tidak ditemukan.', 404);
      return jsonResponse({ success: true, data: decorateRows(result)[0] });
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
