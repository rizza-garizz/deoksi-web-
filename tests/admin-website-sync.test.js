import { beforeEach, describe, expect, test } from 'vitest';

import loginHandler from '../api/auth/login.js';
import mediaHandler from '../api/media.js';
import pageContentHandler from '../api/page-content.js';
import siteContentHandler from '../api/site-content.js';
import galleryContentHandler from '../api/gallery-content.js';

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

describe('admin to website synchronization', () => {
  beforeEach(() => {
    delete globalThis.__DEOKSI_LOCAL_DB__;
  });

  const DRIVE_URLS = {
    service: 'https://drive.google.com/file/d/1ServiceQa111111111111111111111/view?usp=sharing',
    promo: 'https://drive.google.com/file/d/1PromoQa11111111111111111111111/view?usp=sharing',
    gallery: 'https://drive.google.com/file/d/1GalleryQa111111111111111111111/view?usp=sharing',
  };

  test('homepage content persists immediately after admin save', async () => {
    const token = await login();

    const updateResponse = await pageContentHandler(buildRequest('/api/page-content?page=homepage', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: {
        hero: {
          headline: 'Headline QA Final',
          description: 'Deskripsi QA Final',
        },
        promos: [
          {
            title: 'Promo QA Final',
            description: 'Promo sinkron',
            price: 'Rp 321',
            image_url: 'https://example.com/promo-final.jpg',
            cta_link: 'https://wa.me/62001',
            is_visible: true,
          },
        ],
      },
    }));

    expect(updateResponse.status).toBe(200);

    const readResponse = await pageContentHandler(buildRequest('/api/page-content?page=homepage'));
    const readPayload = await readJson(readResponse);

    expect(readPayload.data.hero.headline).toBe('Headline QA Final');
    expect(readPayload.data.hero.description).toBe('Deskripsi QA Final');
    expect(readPayload.data.promos).toHaveLength(1);
    expect(readPayload.data.promos[0].title).toBe('Promo QA Final');
  });

  test('service and promo media become available on website endpoints', async () => {
    const token = await login();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const serviceResponse = await mediaHandler(buildRequest('/api/media', {
      method: 'POST',
      headers,
      body: {
        title: 'Service QA',
        media_kind: 'website_photo',
        source_type: 'google_drive',
        page_key: 'layanan',
        section_key: 'service_cards',
        position_key: 'service_1',
        url: DRIVE_URLS.service,
        original_url: DRIVE_URLS.service,
        optimized_url: DRIVE_URLS.service,
        thumb_url: DRIVE_URLS.service,
        type: 'image',
        category: 'photo',
        alt_text: 'Service QA',
        status: 'active',
        is_slot_active: true,
      },
    }));

    const promoResponse = await mediaHandler(buildRequest('/api/media', {
      method: 'POST',
      headers,
      body: {
        title: 'Promo QA',
        media_kind: 'website_photo',
        source_type: 'google_drive',
        page_key: 'beranda',
        section_key: 'promo_cards',
        position_key: 'promo_1',
        url: DRIVE_URLS.promo,
        original_url: DRIVE_URLS.promo,
        optimized_url: DRIVE_URLS.promo,
        thumb_url: DRIVE_URLS.promo,
        type: 'image',
        category: 'photo',
        alt_text: 'Promo QA',
        status: 'active',
        is_slot_active: true,
      },
    }));

    expect(serviceResponse.status).toBe(201);
    expect(promoResponse.status).toBe(201);

    const siteResponse = await siteContentHandler(buildRequest('/api/site-content'));
    const sitePayload = await readJson(siteResponse);

    expect(siteResponse.status).toBe(200);
    expect(sitePayload.sections['layanan:service_cards'].some((item) => item.title === 'Service QA')).toBe(true);
    expect(sitePayload.sections['beranda:promo_cards'].some((item) => item.title === 'Promo QA')).toBe(true);
  });

  test('gallery additions and media status changes stay stable', async () => {
    const token = await login();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const photoResponse = await mediaHandler(buildRequest('/api/media', {
      method: 'POST',
      headers,
      body: {
        title: 'Gallery QA Photo',
        media_kind: 'website_photo',
        source_type: 'google_drive',
        page_key: 'galeri',
        section_key: 'photo_gallery',
        position_key: 'photo_1',
        url: DRIVE_URLS.gallery,
        original_url: DRIVE_URLS.gallery,
        optimized_url: DRIVE_URLS.gallery,
        thumb_url: DRIVE_URLS.gallery,
        type: 'image',
        category: 'photo',
        alt_text: 'Gallery QA Photo',
        status: 'active',
        is_slot_active: true,
      },
    }));

    const videoResponse = await mediaHandler(buildRequest('/api/media', {
      method: 'POST',
      headers,
      body: {
        title: 'Gallery QA Video',
        media_kind: 'video_cloudinary',
        source_type: 'cloudinary',
        page_key: 'galeri',
        section_key: 'video_gallery',
        position_key: 'video_1',
        url: 'https://res.cloudinary.com/demo/video/upload/v1/gallery.mp4',
        original_url: 'https://res.cloudinary.com/demo/video/upload/v1/gallery.mp4',
        optimized_url: 'https://res.cloudinary.com/demo/video/upload/v1/gallery.mp4',
        thumb_url: 'https://res.cloudinary.com/demo/video/upload/v1/gallery.mp4',
        type: 'video',
        category: 'video',
        status: 'active',
        is_slot_active: true,
      },
    }));

    const photoPayload = await readJson(photoResponse);
    const galleryResponse = await galleryContentHandler(buildRequest('/api/gallery-content'));
    const galleryPayload = await readJson(galleryResponse);

    expect(videoResponse.status).toBe(201);
    expect(galleryResponse.status).toBe(200);
    expect(galleryPayload.data.some((item) => item.title === 'Gallery QA Photo')).toBe(true);
    expect(galleryPayload.data.some((item) => item.title === 'Gallery QA Video')).toBe(true);

    const archivedResponse = await mediaHandler(buildRequest(`/api/media?id=${photoPayload.data.id}`, {
      method: 'PUT',
      headers,
      body: { status: 'archived' },
    }));
    const archivedPayload = await readJson(archivedResponse);

    expect(archivedResponse.status).toBe(200);
    expect(archivedPayload.data.page_key).toBe('galeri');
    expect(archivedPayload.data.section_key).toBe('photo_gallery');
    expect(archivedPayload.data.slot_key).toBe('photo_gallery__photo_1');
  });

  test('google drive photo URL is normalized for admin storage and website sync', async () => {
    const token = await login();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const shareUrl = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/view?usp=sharing';
    const createResponse = await mediaHandler(buildRequest('/api/media', {
      method: 'POST',
      headers,
      body: {
        title: 'Promo Drive QA',
        media_kind: 'website_photo',
        source_type: 'google_drive',
        page_key: 'beranda',
        section_key: 'promo_cards',
        position_key: 'promo_2',
        url: shareUrl,
        original_url: shareUrl,
        type: 'image',
        category: 'photo',
        alt_text: 'Promo Drive QA',
        status: 'active',
        is_slot_active: true,
      },
    }));

    const createPayload = await readJson(createResponse);
    const siteResponse = await siteContentHandler(buildRequest('/api/site-content'));
    const sitePayload = await readJson(siteResponse);

    expect(createResponse.status).toBe(201);
    expect(createPayload.data.original_url).toBe(shareUrl);
    expect(createPayload.data.url).toBe('https://drive.google.com/thumbnail?id=1AbCdEfGhIjKlMnOpQrStUvWxYz123456&sz=w2000');
    expect(sitePayload.sections['beranda:promo_cards'].some((item) => item.title === 'Promo Drive QA' && item.url.includes('drive.google.com/thumbnail?id=1AbCdEfGhIjKlMnOpQrStUvWxYz123456'))).toBe(true);
  });
});
