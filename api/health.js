// GET /api/health — diagnóstico. Mostra só ok/erro, nunca valores secretos.
import { db, dbEnabled } from "./_db.js";

export default async function handler(req, res) {
  const token = process.env.MP_ACCESS_TOKEN;
  const out = {
    MP_ACCESS_TOKEN: !!token,
    SITE_URL: !!process.env.SITE_URL,
    MP_WEBHOOK_SECRET: !!process.env.MP_WEBHOOK_SECRET,
    mercado_pago_api: "não testado",
    versao: "db-1",
    SUPABASE: dbEnabled(),
    ADMIN_PASSWORD: String(process.env.ADMIN_PASSWORD || "").length >= 12,
    banco: "não testado",
  };
  if (token) {
    try {
      const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${token}` } });
      out.mercado_pago_api = r.ok ? "ok (token válido)" : `erro ${r.status} (token inválido ou sem permissão)`;
    } catch (e) { out.mercado_pago_api = "erro de rede"; }
  }
  if (dbEnabled()) {
    try { await db("GET", "pedidos?select=id&limit=1"); out.banco = "ok (tabelas acessíveis)"; }
    catch (e) { out.banco = "erro: " + String(e.message).slice(0, 160); }
  }
  res.status(200).json(out);
}
