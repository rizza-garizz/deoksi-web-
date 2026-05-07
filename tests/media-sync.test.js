import { describe, expect, test } from 'vitest';

import loginHandler from '../api/auth/login.js';
import mediaHandler from '../api/media.js';
import { groupWebsiteContentAssets } from '../api/_lib/content-sections.js';
import { createMedia, updateMedia } from '../api/_lib/local-db.js';

function buildRequest(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`http://local.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readJson(response) {
  const text = await response.text();
  return JSON.parse(text);
}

async function login() {
  const response = await loginHandler(buildRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'admin', password: 'deoksi2026' },
  }));

  const payload = await readJson(response);
  return payload.token;
}

describe('media sync integrity', () => {
  test('groups homepage promo media without crashing', () => {
    const driveUrl = 'https://drive.google.com/file/d/1PromoDriveQa111111111111111111111/view?usp=sharing';
    const promoMedia = createMedia({
      title: 'QA Promo',
      filename: 'qa-promo',
      media_kind: 'website_photo',
      source_type: 'google_drive',
      page_key: 'beranda',
      section_key: 'promo_cards',
      position_key: 'promo_1',
      url: driveUrl,
      original_url: driveUrl,
      optimized_url: driveUrl,
      thumb_url: driveUrl,
      type: 'image',
      category: 'photo',
      alt_text: 'QA Promo',
      status: 'active',
      is_slot_active: true,
    });

    const grouped = groupWebsiteContentAssets([promoMedia]);
    expect(grouped['beranda:promo_cards']).toHaveLength(1);
    expect(grouped['beranda:promo_cards'][0].slot_key).toBe('promo_cards__promo_1');
    expect(grouped['beranda:promo_cards'][0].url).toContain('drive.google.com/thumbnail?id=1PromoDriveQa111111111111111111111');
  });

  test('preserves placement metadata on partial status update', () => {
    const heroMedia = createMedia({
      title: 'QA Hero',
      filename: 'qa-hero',
      media_kind: 'video_cloudinary',
      source_type: 'cloudinary',
      page_key: 'beranda',
      section_key: 'hero_video',
      position_key: 'primary',
      url: 'https://res.cloudinary.com/demo/video/upload/v1/hero.mp4',
      original_url: 'https://res.cloudinary.com/demo/video/upload/v1/hero.mp4',
      optimized_url: 'https://res.cloudinary.com/demo/video/upload/v1/hero.mp4',
      thumb_url: 'https://res.cloudinary.com/demo/video/upload/v1/hero.mp4',
      type: 'video',
      category: 'video',
      status: 'active',
      is_slot_active: true,
    });

    const updated = updateMedia(heroMedia.id, { status: 'archived' });

    expect(updated.status).toBe('archived');
    expect(updated.page_key).toBe('beranda');
    expect(updated.section_key).toBe('hero_video');
    expect(updated.slot_key).toBe('hero_media');
  });

  test('rejects cloudinary source on photo frames and google drive source on video frames', async () => {
    delete globalThis.__DEOKSI_LOCAL_DB__;
    const token = await login();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const invalidPhotoResponse = await mediaHandler(buildRequest('/api/media', {
      method: 'POST',
      headers,
      body: {
        title: 'Invalid Photo Source',
        media_kind: 'website_photo',
        source_type: 'cloudinary',
        page_key: 'layanan',
        section_key: 'service_cards',
        position_key: 'service_1',
        url: 'https://res.cloudinary.com/demo/image/upload/v1/service.jpg',
        original_url: 'https://res.cloudinary.com/demo/image/upload/v1/service.jpg',
        type: 'image',
        category: 'photo',
        alt_text: 'Invalid Photo Source',
        status: 'active',
        is_slot_active: true,
      },
    }));

    const invalidVideoResponse = await mediaHandler(buildRequest('/api/media', {
      method: 'POST',
      headers,
      body: {
        title: 'Invalid Video Source',
        media_kind: 'video_cloudinary',
        source_type: 'google_drive',
        page_key: 'beranda',
        section_key: 'hero_video',
        position_key: 'primary',
        url: 'https://drive.google.com/file/d/1HeroVideoQa111111111111111111111/view?usp=sharing',
        original_url: 'https://drive.google.com/file/d/1HeroVideoQa111111111111111111111/view?usp=sharing',
        type: 'video',
        category: 'video',
        status: 'active',
        is_slot_active: true,
      },
    }));

    expect(invalidPhotoResponse.status).toBe(400);
    expect(await invalidPhotoResponse.text()).toContain('Google Drive');

    expect(invalidVideoResponse.status).toBe(400);
    expect(await invalidVideoResponse.text()).toContain('Cloudinary');
  });
});
