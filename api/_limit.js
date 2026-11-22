// Limite básico de tentativas por IP (em memória). Em serverless cada instância tem a sua contagem,
// então isto só freia abuso simples; para proteção forte, use o firewall da Vercel.
const hits = new Map();
export function limited(req, max = 12, windowMs = 10 * 60 * 1000) {
  const ip = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
