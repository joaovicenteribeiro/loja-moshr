import { db, dbEnabled } from "./db";

export async function getHealth() {
  const token = process.env.MP_ACCESS_TOKEN;
  const out: Record<string, unknown> = {
    MP_ACCESS_TOKEN: !!token,
    SITE_URL: !!process.env.SITE_URL,
    MP_WEBHOOK_SECRET: !!process.env.MP_WEBHOOK_SECRET,
    mercado_pago_api: "não testado",
    versao: "next",
    SUPABASE: dbEnabled(),
    ADMIN_PASSWORD: String(process.env.ADMIN_PASSWORD || "").length >= 12,
    banco: "não testado",
  };
  if (token) {
    try {
      const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${token}` } });
      out.mercado_pago_api = r.ok ? "ok (token válido)" : `erro ${r.status} (token inválido ou sem permissão)`;
    } catch { out.mercado_pago_api = "erro de rede"; }
  }
  if (dbEnabled()) {
    try { await db("GET", "pedidos?select=id&limit=1"); out.banco = "ok (tabelas acessíveis)"; }
    catch (e) { out.banco = "erro: " + String((e as Error).message).slice(0, 160); }
  }
  return Response.json(out);
}
