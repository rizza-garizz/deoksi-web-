import { getDB, hasDatabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { getPageContent, updatePageContent } from './_lib/local-db.js';
import { errorResponse, handleCors, jsonResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

async function ensurePageContentTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS page_content (
      page_key    VARCHAR(50) PRIMARY KEY,
      content     JSONB NOT NULL DEFAULT '{}',
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_by  VARCHAR(100) DEFAULT 'admin'
    )
  `;
}

async function readPageContentFromDb(sql, pageKey) {
  await ensurePageContentTable(sql);
  const rows = await sql`SELECT content FROM page_content WHERE page_key = ${pageKey}`;
  
  if (rows.length === 0) {
    return getPageContent(pageKey); // fallback to default if not in DB yet
  }
  return rows[0].content;
}

async function writePageContentToDb(sql, pageKey, payload) {
  await ensurePageContentTable(sql);
  
  const existingContent = await readPageContentFromDb(sql, pageKey);
  const nextContent = { ...existingContent, ...payload };

  await sql`
    INSERT INTO page_content (page_key, content, updated_at)
    VALUES (${pageKey}, ${nextContent}, NOW())
    ON CONFLICT (page_key)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `;

  return nextContent;
}

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const url = new URL(request.url);
    const pageKey = url.searchParams.get('page');

    if (!pageKey) {
      return errorResponse('Parameter page tidak ditemukan.', 400);
    }

    if (request.method === 'GET') {
      const admin = url.searchParams.get('admin');
      if (admin === '1') {
        const auth = await requireAuth(request);
        if (auth instanceof Response) return auth;
      }

      if (!hasDatabase()) {
        return jsonResponse({ data: getPageContent(pageKey) });
      }

      const sql = getDB();
      const data = await readPageContentFromDb(sql, pageKey);
      return jsonResponse({ data });
    }

    if (request.method === 'PUT') {
      const auth = await requireAuth(request);
      if (auth instanceof Response) return auth;

      const body = await request.json();

      if (!hasDatabase()) {
        return jsonResponse({ success: true, data: updatePageContent(pageKey, body) });
      }

      const sql = getDB();
      const data = await writePageContentToDb(sql, pageKey, body);
      return jsonResponse({ success: true, data });
    }

    return errorResponse('Method not allowed.', 405);
  } catch (error) {
    console.error('Page content API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
