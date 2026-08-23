/**
 * Content-type trust boundary for uploads (§Phase 8): the multipart `mimetype`
 * header is client-controlled and never trusted. The first bytes of the file
 * itself decide whether an image is accepted.
 */

export interface SniffedFormat {
  mime: string;
  ext: string;
}

interface SignatureRule extends SniffedFormat {
  /** Byte-exact test over the head buffer; must read at most 12 bytes. */
  matches: (head: Buffer) => boolean;
  minLength: number;
}

const ascii = (b: Buffer, start: number, end: number): string =>
  b.subarray(start, end).toString('latin1');

const RULES: readonly SignatureRule[] = [
  {
    mime: 'image/png',
    ext: 'png',
    minLength: 8,
    matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    minLength: 3,
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/gif',
    ext: 'gif',
    minLength: 6,
    matches: (b) => ascii(b, 0, 4) === 'GIF8',
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    minLength: 12,
    matches: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  },
];

/** Sniff the first ≤12 bytes against the allowlist; null when nothing matches. */
export function sniffImageFormat(head: Buffer): SniffedFormat | null {
  const rule = RULES.find((r) => head.length >= r.minLength && r.matches(head));
  return rule ? { mime: rule.mime, ext: rule.ext } : null;
}
