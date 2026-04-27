import { getDB, hasDatabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { getHomepageContent, updateHomepageContent } from './_lib/local-db.js';
import { errorResponse, handleCors, jsonResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

const HOMEPAGE_FIELDS = [
  'hero_badge',
  'headline',
  'highlight_text',
  'description',
  'cta_text',
  'cta_link',
  'bullet_benefit_1',
  'bullet_benefit_2',
  'bullet_benefit_3',
  'consultation_card_title',
  'consultation_card_description',
];

const DEFAULT_HOMEPAGE_CONTENT = {
  hero_badge: 'Beauty Consultation',
  headline: 'Kulit Berbasis Sains',
  highlight_text: 'Sains',
  description:
    'Konsultasikan kebutuhan kulit Anda bersama dokter berpengalaman untuk mendapatkan rekomendasi perawatan yang aman, nyaman, dan sesuai kondisi kulit.',
  cta_text: 'Konsultasi dengan Dokter',
  cta_link: 'https://wa.me/6282333344919?text=Halo%20Deoksi%20Clinic,%20saya%20ingin%20konsultasi%20dengan%20dokter.',
  bullet_benefit_1: 'Dokter berpengalaman',
  bullet_benefit_2: 'Perawatan terarah',
  bullet_benefit_3: 'Konsultasi nyaman',
  consultation_card_title: 'Konsultasi Personal',
  consultation_card_description:
    'Pendekatan dokter yang aman, nyaman, dan sesuai kondisi kulit.',
};

async function ensureHomepageContentTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS homepage_content (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

function sanitizeHomepageContent(payload = {}) {
  const nextContent = {};

  for (const field of HOMEPAGE_FIELDS) {
    const rawValue = payload[field];
    if (rawValue === undefined) continue;

    const value = String(rawValue ?? '').trim();
    nextContent[field] = value || DEFAULT_HOMEPAGE_CONTENT[field];
  }

  return nextContent;
}

async function readHomepageContentFromDb(sql) {
  await ensureHomepageContentTable(sql);
  const rows = await sql`SELECT key, value FROM homepage_content`;

  const content = { ...DEFAULT_HOMEPAGE_CONTENT };
  rows.forEach((row) => {
    if (HOMEPAGE_FIELDS.includes(row.key)) {
      content[row.key] = row.value || DEFAULT_HOMEPAGE_CONTENT[row.key];
    }
  });

  return content;
}

async function writeHomepageContentToDb(sql, payload) {
  await ensureHomepageContentTable(sql);
  const sanitized = sanitizeHomepageContent(payload);

  for (const [key, value] of Object.entries(sanitized)) {
    await sql`
      INSERT INTO homepage_content (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }

  return readHomepageContentFromDb(sql);
}

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    if (request.method === 'GET') {
      if (!hasDatabase()) {
        return jsonResponse({ data: getHomepageContent() });
      }

      const sql = getDB();
      const data = await readHomepageContentFromDb(sql);
      return jsonResponse({ data });
    }

    if (request.method === 'PUT') {
      const auth = await requireAuth(request);
      if (auth instanceof Response) return auth;

      const body = await request.json();

      if (!hasDatabase()) {
        return jsonResponse({ success: true, data: updateHomepageContent(body) });
      }

      const sql = getDB();
      const data = await writeHomepageContentToDb(sql, body);
      return jsonResponse({ success: true, data });
    }

    return errorResponse('Method not allowed.', 405);
  } catch (error) {
    console.error('Homepage content API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
