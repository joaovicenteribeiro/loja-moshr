const hits = new Map<string, number[]>();

export function limited(req: Request, max = 12, windowMs = 10 * 60 * 1000) {
  const ip = String(req.headers.get("x-forwarded-for") || "?").split(",")[0].trim();
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
