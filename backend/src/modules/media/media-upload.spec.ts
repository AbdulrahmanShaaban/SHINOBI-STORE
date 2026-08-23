import { sniffImageFormat } from './magic-bytes';
import { SECTION_KEYS, validateConfig } from '../content/section-schemas';

describe('magic-byte allowlist', () => {
  it.each([
    ['png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
    ['jpeg', [0xff, 0xd8, 0xff, 0xe0], 'image/jpeg'],
    ['gif', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 'image/gif'],
    [
      'webp',
      [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
      'image/webp',
    ],
  ])('accepts %s signatures', (_name, bytes, mime) => {
    expect(sniffImageFormat(Buffer.from(bytes))?.mime).toBe(mime);
  });

  it.each([
    ['html', '<!DOCTYPE html><html></html>'],
    ['zip', 'PK\x03\x04binary-ish'],
    ['empty', ''],
    ['webp missing RIFF', '\x00\x00\x00\x00WEBP'],
  ])('rejects %s payloads regardless of declared mimetype', (_name, text) => {
    expect(sniffImageFormat(Buffer.from(text, 'latin1'))).toBeNull();
  });

  it('requires the WEBP marker at bytes 8-11, not just RIFF', () => {
    const riffOnly = Buffer.from('RIFF????WAVE', 'latin1');
    expect(sniffImageFormat(riffOnly)).toBeNull();
  });
});

describe('section config schemas (single source of truth)', () => {
  it('covers exactly the seven seeded keys', () => {
    expect(SECTION_KEYS).toEqual([
      'hero',
      'featured_products',
      'featured_characters',
      'trending_anime',
      'collections',
      'banner',
      'testimonials',
    ]);
  });

  it('accepts a fully populated hero config', () => {
    const result = validateConfig('hero', {
      title: 'Own the legend',
      subtitle: 'Official-grade merch',
      imageUrl: '/naruto.png',
      ctaLabel: 'Shop now',
      ctaHref: '/products?sort=newest',
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    ['hero missing required title', 'hero', { subtitle: 'no title' }],
    ['hero title over 80 chars', 'hero', { title: 'x'.repeat(81) }],
    ['unknown property smuggled in', 'banner', { title: 'ok', admin: true }],
    ['non-object config', 'hero', ['nope']],
    ['unknown section key', 'splash', { anything: true }],
    [
      'featured_characters item over array cap',
      'featured_characters',
      {
        items: Array.from({ length: 7 }, (_, i) => ({ name: `N${i}`, slug: `n-${i}` })),
      },
    ],
    [
      'character slug with wrong casing',
      'featured_characters',
      { items: [{ name: 'Naruto', slug: 'Naruto' }] },
    ],
  ])('rejects %s', (_label, key, config) => {
    expect(validateConfig(key, config).ok).toBe(false);
  });

  it('caps arrays at their documented sizes on the happy path', () => {
    expect(
      validateConfig('featured_products', {
        productSlugs: Array.from({ length: 8 }, (_, i) => `p-${i}`),
      }).ok,
    ).toBe(true);
    expect(
      validateConfig('testimonials', {
        items: Array.from({ length: 6 }, () => ({ quote: 'q'.repeat(240), author: 'A' })),
      }).ok,
    ).toBe(true);
  });
});
