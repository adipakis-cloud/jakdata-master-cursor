/** Shared ?page=&limit= parsing for list endpoints (default page=1, limit=20, max 100). */
export function getPagination(query: Record<string, unknown> | undefined) {
  const rawPage = query?.page != null ? parseInt(String(query.page), 10) : 1;
  const rawLimit = query?.limit != null ? parseInt(String(query.limit), 10) : 20;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
