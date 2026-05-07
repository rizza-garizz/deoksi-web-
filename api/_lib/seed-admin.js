/**
 * Seed Script: Buat Admin User Pertama
 * 
 * Cara pakai:
 * 1. Set DATABASE_URL di environment: 
 *    $env:DATABASE_URL = "postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require"
 * 2. Jalankan: node api/_lib/seed-admin.js
 * 
 * Default credentials:
 *   Username: admin
 *   Password: deoksi2026
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ditemukan. Set dulu environment variable-nya.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seedAdmin() {
  const username = 'admin';
  const password = 'deoksi2026';
  const fullName = 'Admin Deoksi';
  const salt = process.env.PASSWORD_SALT || 'deoksi2026';

  // Hash password dengan SHA-256 (sama seperti di login API)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  try {
    // Cek apakah admin sudah ada
    const existing = await sql`SELECT id FROM admin_users WHERE username = ${username}`;
    if (existing.length > 0) {
      console.log('⚠️  Admin user sudah ada. Skip.');
      return;
    }

    await sql`
      INSERT INTO admin_users (username, password_hash, full_name, role)
      VALUES (${username}, ${hashHex}, ${fullName}, 'admin')
    `;

    console.log('✅ Admin user berhasil dibuat!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('⚠️  SEGERA ganti password setelah login pertama!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

seedAdmin();
