/**
 * Shared pseudonymization and masking utilities for PII protection.
 * FNV-1a 32-bit hash for correlation pseudonymity (not cryptographically secure).
 */

export function pseudonymize(s: string | undefined): string | undefined {
  if (!s) return undefined;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function pseudonymizeOrFallback(s: string | undefined, fallback = 'unknown'): string {
  return pseudonymize(s) ?? fallback;
}

export function maskUuidsInText(text: string): string {
  if (!text) return text;
  return text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[uuid]');
}
