/**
 * Append Prisma-supported pool parameters without duplicating existing keys.
 * Supabase pooler (6543 / *.pooler.supabase.com): add `pgbouncer=true` when missing.
 */
export function withPrismaPoolParams(
  raw: string,
  opts: { connectionLimit: number; poolTimeoutSec?: number; suggestPgBouncer?: boolean },
): string {
  const url = raw.trim();
  if (!url) return raw;

  const lower = url.toLowerCase();
  const parts: string[] = [];

  const has = (key: string) => new RegExp(`[?&]${key}=`, 'i').test(url);

  if (!has('connection_limit')) parts.push(`connection_limit=${opts.connectionLimit}`);
  if (opts.poolTimeoutSec != null && !has('pool_timeout')) parts.push(`pool_timeout=${opts.poolTimeoutSec}`);

  const looksLikeSupabasePool =
    opts.suggestPgBouncer !== false &&
    (lower.includes('pooler.supabase.com') || lower.includes(':6543'));

  if (looksLikeSupabasePool && !has('pgbouncer')) parts.push('pgbouncer=true');

  if (parts.length === 0) return url;
  return url + (url.includes('?') ? '&' : '?') + parts.join('&');
}
