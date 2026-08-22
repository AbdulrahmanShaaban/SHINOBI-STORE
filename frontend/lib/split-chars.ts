/**
 * Splits a string into per-character spans for staggered reveals.
 * Extracted from the hero/card letter-animation pattern so every section
 * animates text the same way. Spaces are preserved as non-breaking spans
 * so line wrapping still works.
 */
export function splitChars(text: string): { char: string; key: number }[] {
  return Array.from(text).map((char, i) => ({
    char: char === ' ' ? '\u00A0' : char,
    key: i,
  }));
}
