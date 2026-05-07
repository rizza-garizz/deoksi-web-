import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const contentPath = path.resolve(process.cwd(), 'public/data/content.json');
const rawContent = fs.readFileSync(contentPath, 'utf-8');
const content = JSON.parse(rawContent);

describe('content promo section', () => {
  test('contains exactly 3 promo flyer items', () => {
    expect(Array.isArray(content.sections.promo.items)).toBe(true);
    expect(content.sections.promo.items).toHaveLength(3);
  });
});
