import { describe, expect, test } from 'vitest';

import { mergeHomepagePromos, shouldApplyHomepageHeroMedia } from '../src/js/homepage-sync.js';

describe('homepage promo sync', () => {
  test('overrides promo images with managed assets by position', () => {
    const merged = mergeHomepagePromos(
      [
        { title: 'Promo A', description: 'Desc A', price: 'Rp 100', image_url: '/old-a.jpg', cta_link: '#a', is_visible: true },
      ],
      [
        { title: 'Managed A', url: 'https://example.com/a.jpg', position_key: 'promo_1', status: 'active' },
      ]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Promo A');
    expect(merged[0].image_url).toBe('https://example.com/a.jpg');
  });

  test('creates displayable fallback cards when managed assets outnumber text promos', () => {
    const merged = mergeHomepagePromos(
      [],
      [
        { title: 'Managed Promo', url: 'https://example.com/promo.jpg', position_key: 'promo_1', status: 'active' },
      ]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Managed Promo');
    expect(merged[0].image_url).toBe('https://example.com/promo.jpg');
    expect(merged[0].is_visible).toBe(true);
  });

  test('homepage content hero media does not override managed hero slot', () => {
    expect(shouldApplyHomepageHeroMedia('https://example.com/content-video.mp4', {
      hero_media: { url: 'https://res.cloudinary.com/demo/video/upload/v1/hero.mp4' },
    })).toBe(false);

    expect(shouldApplyHomepageHeroMedia('https://example.com/content-video.mp4', {})).toBe(true);
  });
});
