/**
 * Setup Script: Inisialisasi database + seed admin
 * Jalankan: node api/_lib/setup-db.mjs
 */

import { neon } from '@neondatabase/serverless';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPageContent, listArticles, listCustomers, listMedia } from './local-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually only as fallback.
const envPath = join(__dirname, '..', '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) {
      const normalizedKey = key.trim();
      if (!(normalizedKey in process.env)) {
        process.env[normalizedKey] = vals.join('=').trim();
      }
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ditemukan di environment atau .env');
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
      preferred_date  DATE,
      concerns        TEXT[],
      message         TEXT,
      privacy_agreed  BOOLEAN DEFAULT true,
      source          VARCHAR(50) DEFAULT 'website',
      customer_type   VARCHAR(20) DEFAULT 'new',
      nik             VARCHAR(20),
      address         TEXT,
      identity_verified BOOLEAN DEFAULT false,
      identity_verified_at TIMESTAMPTZ,
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
      title           VARCHAR(200),
      media_kind      VARCHAR(50),
      source_type     VARCHAR(30) DEFAULT 'external',
      cloudinary_id   VARCHAR(300),
      page_key        VARCHAR(50),
      section_key     VARCHAR(100),
      position_key    VARCHAR(100),
      replace_policy  VARCHAR(20) DEFAULT 'multiple',
      section_name    VARCHAR(100),
      slot_key        VARCHAR(100),
      slot_name       VARCHAR(150),
      is_slot_active  BOOLEAN DEFAULT false,
      display_order   INTEGER DEFAULT 0,
      original_url    TEXT,
      optimized_url   TEXT,
      thumb_url       TEXT,
      url             TEXT NOT NULL,
      type            VARCHAR(20),
      category        VARCHAR(50),
      alt_text        VARCHAR(200),
      tags            TEXT[],
      platform        VARCHAR(50) DEFAULT 'website',
      campaign        VARCHAR(150),
      status          VARCHAR(20) DEFAULT 'draft',
      notes           TEXT,
      last_used_at    TIMESTAMPTZ,
      usage_count     INTEGER DEFAULT 0,
      size_bytes      INTEGER,
      uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ Tabel media_assets');

  await sql`
    CREATE TABLE IF NOT EXISTS homepage_content (
      key         VARCHAR(100) PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ Tabel homepage_content');

  await sql`
    CREATE TABLE IF NOT EXISTS page_content (
      page_key    VARCHAR(50) PRIMARY KEY,
      content     JSONB NOT NULL DEFAULT '{}',
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_by  VARCHAR(100) DEFAULT 'admin'
    )
  `;
  console.log('  ✅ Tabel page_content');

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_category ON media_assets(category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_kind ON media_assets(media_kind)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_page_section ON media_assets(page_key, section_key, position_key)`;
  console.log('  ✅ Indexes dibuat');
}

async function seedAdmin() {
  console.log('\n👤 Membuat admin user...\n');

  const username = 'admin';
  const password = 'deoksi2026';
  const fullName = 'Admin Deoksi';
  const salt = process.env.PASSWORD_SALT;

  if (!salt) {
    throw new Error('PASSWORD_SALT wajib diisi sebelum menjalankan bootstrap database.');
  }

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

const PAGE_KEYS_TO_SEED = [
  'homepage',
  'layanan',
  'produk',
  'berita',
  'galeri',
  'tentang',
  'lokasi',
  'konsultasi',
  'testimoni',
  'global',
  'seo',
];

async function seedPageContent(sql) {
  const existing = await sql`SELECT COUNT(*)::int as total FROM page_content`;
  if ((existing[0]?.total || 0) > 0) {
    console.log('  ⚠️  Page content sudah ada. Skip seed.');
    return;
  }

  for (const pageKey of PAGE_KEYS_TO_SEED) {
    const content = getPageContent(pageKey);
    await sql`
      INSERT INTO page_content (page_key, content, updated_at, updated_by)
      VALUES (${pageKey}, ${content}, NOW(), 'docker-seed')
    `;
  }

  console.log(`  ✅ Seed page_content (${PAGE_KEYS_TO_SEED.length} halaman)`);
}

async function seedArticles(sql) {
  const existing = await sql`SELECT COUNT(*)::int as total FROM articles`;
  if ((existing[0]?.total || 0) > 0) {
    console.log('  ⚠️  Articles sudah ada. Skip seed.');
    return;
  }

  const articles = listArticles({ admin: true, page: 1, limit: 1000 }).data || [];
  for (const article of articles) {
    await sql`
      INSERT INTO articles (
        title, slug, excerpt, content, cover_image, category, is_published, author,
        published_at, created_at, updated_at
      )
      VALUES (
        ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content}, ${article.cover_image},
        ${article.category}, ${article.is_published}, ${article.author},
        ${article.published_at}, ${article.created_at}, ${article.updated_at}
      )
    `;
  }

  console.log(`  ✅ Seed articles (${articles.length} item)`);
}

async function seedCustomers(sql) {
  const existing = await sql`SELECT COUNT(*)::int as total FROM customers`;
  if ((existing[0]?.total || 0) > 0) {
    console.log('  ⚠️  Customers sudah ada. Skip seed.');
    return;
  }

  const customers = listCustomers({ page: 1, limit: 1000 }).data || [];
  for (const customer of customers) {
    await sql`
      INSERT INTO customers (
        full_name, phone, email, gender, age_range, preferred_date, concerns, message,
        privacy_agreed, source, customer_type, nik, address, identity_verified,
        identity_verified_at, status, created_at, updated_at
      )
      VALUES (
        ${customer.full_name}, ${customer.phone}, ${customer.email}, ${customer.gender},
        ${customer.age_range}, ${customer.preferred_date || null}, ${customer.concerns || []}, ${customer.message},
        true, 'website', ${customer.customer_type || 'new'}, ${customer.nik}, ${customer.address},
        ${Boolean(customer.identity_verified)}, ${customer.identity_verified_at},
        ${customer.status}, ${customer.created_at}, ${customer.updated_at}
      )
    `;
  }

  console.log(`  ✅ Seed customers (${customers.length} item)`);
}

async function seedMedia(sql) {
  const existing = await sql`SELECT COUNT(*)::int as total FROM media_assets`;
  if ((existing[0]?.total || 0) > 0) {
    console.log('  ⚠️  Media assets sudah ada. Skip seed.');
    return;
  }

  const mediaItems = listMedia({ page: 1, limit: 1000 }).data || [];
  for (const item of mediaItems) {
    await sql`
      INSERT INTO media_assets (
        filename, title, media_kind, source_type, cloudinary_id, page_key, section_key,
        position_key, replace_policy, section_name, slot_key, slot_name, is_slot_active,
        display_order, original_url, optimized_url, thumb_url, url, type, category,
        alt_text, tags, platform, campaign, status, notes, last_used_at, usage_count,
        size_bytes, uploaded_at, updated_at
      )
      VALUES (
        ${item.filename}, ${item.title}, ${item.media_kind}, ${item.source_type}, ${item.cloudinary_id},
        ${item.page_key}, ${item.section_key}, ${item.position_key}, ${item.replace_policy},
        ${item.section_name}, ${item.slot_key}, ${item.slot_name}, ${Boolean(item.is_slot_active)},
        ${item.display_order || 0}, ${item.original_url}, ${item.optimized_url}, ${item.thumb_url},
        ${item.url}, ${item.type}, ${item.category}, ${item.alt_text}, ${item.tags || []},
        ${item.platform}, ${item.campaign}, ${item.status}, ${item.notes},
        ${item.last_used_at}, ${item.usage_count || 0}, ${item.size_bytes},
        ${item.uploaded_at}, ${item.updated_at}
      )
    `;
  }

  console.log(`  ✅ Seed media_assets (${mediaItems.length} item)`);
}

async function seedOfficialData(sql) {
  console.log('\n🌱 Menanam data minimum resmi...\n');
  await seedPageContent(sql);
  await seedArticles(sql);
  await seedCustomers(sql);
  await seedMedia(sql);
}

async function main() {
  console.log('====================================');
  console.log(' Deoksi Clinic - Database Setup');
  console.log('====================================\n');
  console.log(`🔗 Connecting to: ${DATABASE_URL.replace(/:[^@]+@/, ':***@')}\n`);

  try {
    await runSchema();
    await seedAdmin();
    await seedOfficialData(sql);

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
