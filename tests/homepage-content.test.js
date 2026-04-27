import { describe, expect, test } from 'vitest';

import { getHomepageContent, updateHomepageContent } from '../api/_lib/local-db.js';

describe('homepage content manager', () => {
  test('provides default homepage text content', () => {
    const content = getHomepageContent();

    expect(content.hero_badge).toBe('Beauty Consultation');
    expect(content.headline).toBe('Kulit Berbasis Sains');
    expect(content.highlight_text).toBe('Sains');
    expect(content.cta_text).toBe('Konsultasi dengan Dokter');
  });

  test('updates only requested homepage fields', () => {
    const updated = updateHomepageContent({
      hero_badge: 'Skin Consultation',
      cta_text: 'Chat Sekarang',
    });

    expect(updated.hero_badge).toBe('Skin Consultation');
    expect(updated.cta_text).toBe('Chat Sekarang');
    expect(updated.headline).toBe('Kulit Berbasis Sains');
  });
});
