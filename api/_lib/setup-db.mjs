/**
 * Setup Script: Inisialisasi database + seed admin
 * Jalankan: node api/_lib/setup-db.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually
const envPath = join(__dirname, '..', '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
} catch (e) {
  console.error('❌ File .env tidak ditemukan. Buat dulu dari .env.example');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runSchema() {
  console.log('📦 Membuat tabel database...\n');

  // Admin Users
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name     VARCHAR(100),
      role          VARCHAR(20) DEFAULT 'admin',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ Tabel admin_users');

  // Customers
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id              SERIAL PRIMARY KEY,
      full_name       VARCHAR(100) NOT NULL,
      phone           VARCHAR(20) NOT NULL,
      email           VARCHAR(100),
      gender          VARCHAR(10),
      age_range       VARCHAR(20),
      concerns        TEXT[],
      message         TEXT,
      privacy_agreed  BOOLEAN DEFAULT true,
      source          VARCHAR(50) DEFAULT 'website',
      status          VARCHAR(20) DEFAULT 'new',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ Tabel customers');

  // Articles
  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id            SERIAL PRIMARY KEY,
      title         VARCHAR(200) NOT NULL,
      slug          VARCHAR(200) UNIQUE NOT NULL,
      excerpt       TEXT,
      content       TEXT,
      cover_image   VARCHAR(500),
      category      VARCHAR(50),
      is_published  BOOLEAN DEFAULT false,
      author        VARCHAR(100) DEFAULT 'Deoksi Clinic',
      published_at  TIMESTAMPTZ,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ Tabel articles');

  // Media Assets
  await sql`
    CREATE TABLE IF NOT EXISTS media_assets (
      id              SERIAL PRIMARY KEY,
      filename        VARCHAR(200) NOT NULL,
      cloudinary_id   VARCHAR(300),
      url             VARCHAR(500) NOT NULL,
      type            VARCHAR(20),
      category        VARCHAR(50),
      alt_text        VARCHAR(200),
      size_bytes      INTEGER,
      uploaded_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ Tabel media_assets');

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_category ON media_assets(category)`;
  console.log('  ✅ Indexes dibuat');
}

async function seedAdmin() {
  console.log('\n👤 Membuat admin user...\n');

  const username = 'admin';
  const password = 'deoksi2026';
  const fullName = 'Admin Deoksi';
  const salt = process.env.PASSWORD_SALT || 'deoksi2026';

  // Hash password SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Cek existing
  const existing = await sql`SELECT id FROM admin_users WHERE username = ${username}`;
  if (existing.length > 0) {
    console.log('  ⚠️  Admin user sudah ada. Skip.');
    return;
  }

  await sql`
    INSERT INTO admin_users (username, password_hash, full_name, role)
    VALUES (${username}, ${hashHex}, ${fullName}, 'admin')
  `;

  console.log('  ✅ Admin user berhasil dibuat!');
  console.log(`     Username: ${username}`);
  console.log(`     Password: ${password}`);
}

async function main() {
  console.log('====================================');
  console.log(' Deoksi Clinic - Database Setup');
  console.log('====================================\n');
  console.log(`🔗 Connecting to: ${DATABASE_URL.replace(/:[^@]+@/, ':***@')}\n`);

  try {
    await runSchema();
    await seedAdmin();

    console.log('\n====================================');
    console.log(' ✅ Setup selesai!');
    console.log('====================================');
    console.log('\n⚠️  SEGERA ganti password admin setelah login pertama!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
