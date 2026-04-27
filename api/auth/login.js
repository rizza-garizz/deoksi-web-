import { getDB, hasDatabase } from '../_lib/db.js';
import { generateToken } from '../_lib/auth.js';
import { getLocalAdmin } from '../_lib/local-db.js';
import { handleCors, jsonResponse, errorResponse } from '../_lib/utils.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return errorResponse('Username dan password wajib diisi.', 400);
    }

    let user;

    if (hasDatabase()) {
      const sql = getDB();
      const users = await sql`
        SELECT * FROM admin_users WHERE username = ${username} LIMIT 1
      `;

      if (users.length === 0) {
        return errorResponse('Username atau password salah.', 401);
      }

      user = users[0];
    } else {
      const localAdmin = getLocalAdmin();
      if (username !== localAdmin.username || password !== localAdmin.password) {
        return errorResponse('Username atau password salah.', 401);
      }
      user = localAdmin;
    }

    // Verifikasi password (bcrypt hash comparison)
    // Untuk edge runtime, kita gunakan simple hash comparison
    // Password di-hash dengan format: sha256(password + salt)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + (process.env.PASSWORD_SALT || 'deoksi2026'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hasDatabase() && hashHex !== user.password_hash) {
      return errorResponse('Username atau password salah.', 401);
    }

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return jsonResponse({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Auth Login Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
