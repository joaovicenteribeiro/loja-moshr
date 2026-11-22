// Acesso ao Supabase (PostgREST) pelo servidor, sem dependências.
// Env: SUPABASE_URL e SUPABASE_SECRET_KEY (sb_secret_...) — ou a antiga SUPABASE_SERVICE_ROLE_KEY.
// A chave NUNCA vai para o navegador.
const baseUrl = () => String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const secretKey = () => String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

export const dbEnabled = () => !!(baseUrl() && secretKey());
export const enc = encodeURIComponent;

export async function db(method, path, body, prefer) {
  const key = secretKey();
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`; // chaves novas (sb_secret_) vão só no apikey
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${baseUrl()}/rest/v1/${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* resposta sem JSON */ }
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 300)}`);
  return data;
}
