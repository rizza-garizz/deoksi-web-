-- =============================================
-- Deoksi Beauty Clinic - Database Schema
-- Database: Neon.tech (PostgreSQL)
-- =============================================

-- Tabel Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100),
  role          VARCHAR(20) DEFAULT 'admin',  -- admin / editor
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pasien / Leads Konsultasi
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
);

-- Tabel Berita / Artikel
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
);

-- Tabel Aset Media
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
);

-- Tabel Content Manager Homepage
CREATE TABLE IF NOT EXISTS homepage_content (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Content Manager (Seluruh Halaman)
CREATE TABLE IF NOT EXISTS page_content (
  page_key    VARCHAR(50) PRIMARY KEY,
  content     JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  VARCHAR(100) DEFAULT 'admin'
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_kind ON media_assets(media_kind);
CREATE INDEX IF NOT EXISTS idx_media_page_section ON media_assets(page_key, section_key, position_key);
