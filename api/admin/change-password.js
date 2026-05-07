import { getDB, hasDatabase } from '../_lib/db.js';
import { hashPassword, requireAuth } from '../_lib/auth.js';
import { getLocalAdmin, updateLocalAdminPassword } from '../_lib/local-db.js';
import { errorResponse, handleCors, jsonResponse } from '../_lib/utils.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method !== 'PUT') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const body = await request.json();
    const currentPassword = String(body.current_password || '');
    const nextPassword = String(body.new_password || '');
    const confirmPassword = String(body.confirm_password || '');

    if (!currentPassword || !nextPassword || !confirmPassword) {
      return errorResponse('Semua field password wajib diisi.', 400);
    }

    if (nextPassword.length < 8) {
      return errorResponse('Password baru minimal 8 karakter.', 400);
    }

    if (nextPassword !== confirmPassword) {
      return errorResponse('Konfirmasi password baru tidak cocok.', 400);
    }

    if (!hasDatabase()) {
      const localAdmin = getLocalAdmin();
      if (currentPassword !== localAdmin.password) {
        return errorResponse('Password saat ini salah.', 400);
      }

      updateLocalAdminPassword(nextPassword);
      return jsonResponse({ success: true, message: 'Password admin berhasil diperbarui.' });
    }

    const sql = getDB();
    const rows = await sql`SELECT id, password_hash FROM admin_users WHERE id = ${auth.id} LIMIT 1`;
    if (rows.length === 0) return errorResponse('Admin tidak ditemukan.', 404);

    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== rows[0].password_hash) {
      return errorResponse('Password saat ini salah.', 400);
    }

    const nextHash = await hashPassword(nextPassword);
    await sql`UPDATE admin_users SET password_hash = ${nextHash} WHERE id = ${auth.id}`;

    return jsonResponse({ success: true, message: 'Password admin berhasil diperbarui.' });
  } catch (error) {
    console.error('Admin change password API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
