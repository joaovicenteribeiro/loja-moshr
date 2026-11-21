// GET /api/pix-status?id=ORD... — o site consulta a cada poucos segundos se o Pix foi pago.
// Só vale o que o Mercado Pago responde aqui; o navegador nunca decide que está pago.
export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "");
    if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return res.status(400).json({ erro: "id inválido" });
    const r = await fetch(`https://api.mercadopago.com/v1/orders/${id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    if (!r.ok) return res.status(502).json({ erro: "consulta falhou" });
    const o = await r.json();
    const paid = o.status === "processed" && o.status_detail === "accredited";
    const final = ["canceled", "failed", "expired", "refunded", "charged_back"].includes(o.status);
    if (paid) console.log("PIX_PAGO", JSON.stringify({ order: id, pedido: o.external_reference, valor: o.total_amount }));
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: o.status, status_detail: o.status_detail, paid, final });
  } catch (e) {
    res.status(500).json({ erro: "erro interno" });
  }
}
