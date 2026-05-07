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
  'hero_media',
];

const DEFAULT_HOMEPAGE_CONTENT = {
  hero_badge: 'Beauty Consultation',
  headline: 'Kulit Berbasis Sains',
  highlight_text: 'Sains',
  description:
    'Konsultasikan kebutuhan kulit Anda bersama dokter berpengalaman untuk mendapatkan rekomendasi perawatan yang aman, nyaman, dan sesuai kondisi kulit.',
  cta_text: 'Konsultasi dengan tim kami',
  cta_link: 'https://wa.me/6282333344919?text=Halo%20Deoksi%20Clinic,%20saya%20ingin%20konsultasi%20dengan%20tim%20kami.',
  bullet_benefit_1: 'Dokter berpengalaman',
  bullet_benefit_2: 'Perawatan terarah',
  bullet_benefit_3: 'Konsultasi nyaman',
  consultation_card_title: 'Konsultasi Personal',
  consultation_card_description:
    'Pendekatan dokter yang aman, nyaman, dan sesuai kondisi kulit.',
  hero_media: '',
};

function buildHomepagePageContent() {
  return {
    hero: {
      hero_media: DEFAULT_HOMEPAGE_CONTENT.hero_media,
      hero_badge: DEFAULT_HOMEPAGE_CONTENT.hero_badge,
      headline: DEFAULT_HOMEPAGE_CONTENT.headline,
      highlight_text: DEFAULT_HOMEPAGE_CONTENT.highlight_text,
      description: DEFAULT_HOMEPAGE_CONTENT.description,
      cta_text: DEFAULT_HOMEPAGE_CONTENT.cta_text,
      cta_link: DEFAULT_HOMEPAGE_CONTENT.cta_link,
    },
    hero_benefits: {
      bullet_benefit_1: DEFAULT_HOMEPAGE_CONTENT.bullet_benefit_1,
      bullet_benefit_2: DEFAULT_HOMEPAGE_CONTENT.bullet_benefit_2,
      bullet_benefit_3: DEFAULT_HOMEPAGE_CONTENT.bullet_benefit_3,
      consultation_card_title: DEFAULT_HOMEPAGE_CONTENT.consultation_card_title,
      consultation_card_description: DEFAULT_HOMEPAGE_CONTENT.consultation_card_description,
    },
    promos: [],
  };
}

function flattenHomepageContent(content = {}) {
  return {
    ...DEFAULT_HOMEPAGE_CONTENT,
    ...(content.hero || {}),
    ...(content.hero_benefits || {}),
    promos: Array.isArray(content.promos) ? content.promos : [],
  };
}

function nestHomepageContent(payload = {}, content = {}) {
  const nextContent = {
    ...buildHomepagePageContent(),
    ...content,
    hero: {
      ...buildHomepagePageContent().hero,
      ...(content.hero || {}),
    },
    hero_benefits: {
      ...buildHomepagePageContent().hero_benefits,
      ...(content.hero_benefits || {}),
    },
    promos: Array.isArray(content.promos) ? content.promos : [],
  };

  for (const field of HOMEPAGE_FIELDS) {
    if (payload[field] === undefined) continue;

    const value = String(payload[field] ?? '').trim() || DEFAULT_HOMEPAGE_CONTENT[field];
    if (['hero_media', 'hero_badge', 'headline', 'highlight_text', 'description', 'cta_text', 'cta_link'].includes(field)) {
      nextContent.hero[field] = value;
    } else {
      nextContent.hero_benefits[field] = value;
    }
  }

  if (payload.promos !== undefined) {
    nextContent.promos = Array.isArray(payload.promos) ? payload.promos : [];
  }

  return nextContent;
}

async function ensurePageContentTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS page_content (
      page_key VARCHAR(50) PRIMARY KEY,
      content JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function readHomepageContentFromDb(sql) {
  await ensurePageContentTable(sql);
  const rows = await sql`SELECT content FROM page_content WHERE page_key = 'homepage'`;
  if (rows.length === 0) {
    return buildHomepagePageContent();
  }
  const storedContent = rows[0].content || {};
  return {
    ...buildHomepagePageContent(),
    ...storedContent,
    hero: {
      ...buildHomepagePageContent().hero,
      ...(storedContent.hero || {}),
    },
    hero_benefits: {
      ...buildHomepagePageContent().hero_benefits,
      ...(storedContent.hero_benefits || {}),
    },
    promos: Array.isArray(storedContent.promos) ? storedContent.promos : [],
  };
}

async function writeHomepageContentToDb(sql, payload) {
  await ensurePageContentTable(sql);
  const existingContent = await readHomepageContentFromDb(sql);
  const nextContent = nestHomepageContent(payload, existingContent);

  await sql`
    INSERT INTO page_content (page_key, content, updated_at)
    VALUES ('homepage', ${nextContent}, NOW())
    ON CONFLICT (page_key)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `;

  return flattenHomepageContent(nextContent);
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
      return jsonResponse({ data: flattenHomepageContent(data) });
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
