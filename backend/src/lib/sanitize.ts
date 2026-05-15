/** Basic string hardening for free-text fields (HTML / script-ish payloads). */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .slice(0, 5000);
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field as string] = sanitizeString(result[field] as string);
    }
  }
  return result;
}
