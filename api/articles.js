import { getDB, hasDatabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { createArticle, deleteArticleById, listArticles, updateArticle } from './_lib/local-db.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    // GET: List artikel (PUBLIC — hanya published, atau ALL untuk admin)
    if (request.method === 'GET') {
      const slug = url.searchParams.get('slug');
      const category = url.searchParams.get('category');
      const admin = url.searchParams.get('admin');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '12');

      if (!hasDatabase()) {
        if (slug) {
          const article = listArticles({ slug });
          if (!article) return errorResponse('Artikel tidak ditemukan.', 404);
          return jsonResponse({ data: article });
        }

        if (admin === 'true') {
          const auth = await requireAuth(request);
          if (auth instanceof Response) return auth;
          return jsonResponse(listArticles({ category, admin: true, page, limit }));
        }

        return jsonResponse(listArticles({ category, admin: false, page, limit }));
      }

      const sql = getDB();
      const offset = (page - 1) * limit;

      // Single article by slug (public)
      if (slug) {
        const rows = await sql`
          SELECT * FROM articles WHERE slug = ${slug} AND is_published = true LIMIT 1
        `;
        if (rows.length === 0) return errorResponse('Artikel tidak ditemukan.', 404);
        return jsonResponse({ data: rows[0] });
      }

      // Admin mode: show all articles (requires auth)
      if (admin === 'true') {
        const auth = await requireAuth(request);
        if (auth instanceof Response) return auth;

        const rows = await sql`
          SELECT * FROM articles ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`SELECT COUNT(*) as total FROM articles`;
        return jsonResponse({
          data: rows,
          pagination: { page, limit, total: parseInt(countResult[0].total) },
        });
      }

      // Public mode: only published articles
      let rows;
      if (category) {
        rows = await sql`
          SELECT id, title, slug, excerpt, cover_image, category, author, published_at
          FROM articles WHERE is_published = true AND category = ${category}
          ORDER BY published_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        rows = await sql`
          SELECT id, title, slug, excerpt, cover_image, category, author, published_at
          FROM articles WHERE is_published = true
          ORDER BY published_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const countResult = await sql`SELECT COUNT(*) as total FROM articles WHERE is_published = true`;

      return jsonResponse({
        data: rows,
        pagination: { page, limit, total: parseInt(countResult[0].total) },
      });
    }

    // === ADMIN ONLY ROUTES ===
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    // POST: Buat artikel baru
    if (request.method === 'POST') {
      const body = await request.json();
      const { title, excerpt, content, cover_image, category, is_published } = body;

      if (!title) return errorResponse('Judul artikel wajib diisi.', 400);

      // Generate slug dari judul
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 200);

      if (!hasDatabase()) {
        const result = createArticle({ title, excerpt, content, cover_image, category, is_published });
        return jsonResponse({ success: true, data: result }, 201);
      }

      const sql = getDB();
      const result = await sql`
        INSERT INTO articles (title, slug, excerpt, content, cover_image, category, is_published, published_at)
        VALUES (${title}, ${slug}, ${excerpt || null}, ${content || null}, 
                ${cover_image || null}, ${category || 'edukasi'}, ${is_published || false},
                ${is_published ? new Date().toISOString() : null})
        RETURNING *
      `;

      return jsonResponse({ success: true, data: result[0] }, 201);
    }

    // PUT: Update artikel
    if (request.method === 'PUT') {
      if (!id) return errorResponse('ID artikel wajib disertakan.', 400);

      const body = await request.json();
      const { title, excerpt, content, cover_image, category, is_published } = body;

      if (!hasDatabase()) {
        const result = updateArticle(id, { title, excerpt, content, cover_image, category, is_published });
        if (!result) return errorResponse('Artikel tidak ditemukan.', 404);
        return jsonResponse({ success: true, data: result });
      }

      const sql = getDB();
      const result = await sql`
        UPDATE articles SET 
          title = COALESCE(${title || null}, title),
          excerpt = COALESCE(${excerpt || null}, excerpt),
          content = COALESCE(${content || null}, content),
          cover_image = COALESCE(${cover_image || null}, cover_image),
          category = COALESCE(${category || null}, category),
          is_published = COALESCE(${is_published}, is_published),
          published_at = CASE WHEN ${is_published} = true AND published_at IS NULL THEN NOW() ELSE published_at END,
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      if (result.length === 0) return errorResponse('Artikel tidak ditemukan.', 404);
      return jsonResponse({ success: true, data: result[0] });
    }

    // DELETE: Hapus artikel
    if (request.method === 'DELETE') {
      if (!id) return errorResponse('ID artikel wajib disertakan.', 400);

      if (!hasDatabase()) {
        const result = deleteArticleById(id);
        if (!result) return errorResponse('Artikel tidak ditemukan.', 404);
        return jsonResponse({ success: true, message: 'Artikel berhasil dihapus.' });
      }

      const sql = getDB();
      const result = await sql`DELETE FROM articles WHERE id = ${id} RETURNING id`;
      if (result.length === 0) return errorResponse('Artikel tidak ditemukan.', 404);

      return jsonResponse({ success: true, message: 'Artikel berhasil dihapus.' });
    }

    return errorResponse('Method not allowed.', 405);
  } catch (error) {
    console.error('Articles API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
