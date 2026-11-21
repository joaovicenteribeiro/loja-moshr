// GET /api/health — diagnóstico. Mostra só ok/erro, nunca valores secretos.
export default async function handler(req, res) {
  const token = process.env.MP_ACCESS_TOKEN;
  const out = {
    MP_ACCESS_TOKEN: !!token,
    SITE_URL: !!process.env.SITE_URL,
    MP_WEBHOOK_SECRET: !!process.env.MP_WEBHOOK_SECRET,
    mercado_pago_api: "não testado",
    versao: "checkout-3",
  };
  if (token) {
    try {
      const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${token}` } });
      out.mercado_pago_api = r.ok ? "ok (token válido)" : `erro ${r.status} (token inválido ou sem permissão)`;
    } catch (e) { out.mercado_pago_api = "erro de rede"; }
  }
  res.status(200).json(out);
}
