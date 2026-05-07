import { getDB, hasDatabase } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { getLocalAdmin, updateLocalAdminProfile } from '../_lib/local-db.js';
import { errorResponse, handleCors, jsonResponse } from '../_lib/utils.js';

export const config = { runtime: 'edge' };

function sanitizeAdmin(user = {}) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name || '',
    role: user.role || 'admin',
  };
}

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    if (request.method === 'GET') {
      if (!hasDatabase()) {
        return jsonResponse({ data: sanitizeAdmin(getLocalAdmin()) });
      }

      const sql = getDB();
      const rows = await sql`SELECT id, username, full_name, role FROM admin_users WHERE id = ${auth.id} LIMIT 1`;
      if (rows.length === 0) return errorResponse('Profil admin tidak ditemukan.', 404);
      return jsonResponse({ data: sanitizeAdmin(rows[0]) });
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      const fullName = String(body.full_name || '').trim();

      if (!fullName) {
        return errorResponse('Nama lengkap wajib diisi.', 400);
      }

      if (!hasDatabase()) {
        const updated = updateLocalAdminProfile({ full_name: fullName });
        return jsonResponse({ success: true, data: sanitizeAdmin(updated) });
      }

      const sql = getDB();
      const rows = await sql`
        UPDATE admin_users
        SET full_name = ${fullName}
        WHERE id = ${auth.id}
        RETURNING id, username, full_name, role
      `;

      if (rows.length === 0) return errorResponse('Profil admin tidak ditemukan.', 404);
      return jsonResponse({ success: true, data: sanitizeAdmin(rows[0]) });
    }

    return errorResponse('Method not allowed.', 405);
  } catch (error) {
    console.error('Admin profile API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
