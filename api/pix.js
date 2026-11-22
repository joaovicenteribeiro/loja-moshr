// POST /api/pix — cria um pagamento Pix (Checkout Transparente, Orders API) e devolve o QR Code.
// Corpo JSON: { items: "id:tamanho:qtd:cor,...", nome, email, zap, cep, end, num, cid, uf, ref }
// Preço e frete são calculados AQUI a partir de data/products.json, nunca do navegador.
import crypto from "node:crypto";
import { loadCatalog } from "./_catalog.js";
import { limited } from "./_limit.js";

const FRETE = 2490, GRATIS_ACIMA = 25000; // em centavos (mesmas regras do site)
const cents = (n) => Math.round(n * 100);
const priceOf = (p) => p.promo || p.preco;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (limited(req)) return res.status(429).json({ erro: "Muitas tentativas. Aguarde alguns minutos." });
  try {
    const b = req.body || {}, cat = loadCatalog();
    const lines = String(b.items || "").split(",").map((x) => x.split(":"))
      .map(([id, size, qty, color]) => {
        const p = cat[id];
        if (!p || !p.tamanhos.includes(size)) return null;
        return { id, p, size, color: p.cores.includes(color) ? color : p.cores[0],
          qty: Math.min(Math.max(parseInt(qty) || 1, 1), 10) };
      }).filter(Boolean);
    if (!lines.length) return res.status(400).json({ erro: "Carrinho vazio" });
    const email = String(b.email || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ erro: "E-mail inválido" });

    const subtotal = lines.reduce((a, l) => a + cents(priceOf(l.p)) * l.qty, 0);
    const total = ((subtotal + (subtotal >= GRATIS_ACIMA ? 0 : FRETE)) / 100).toFixed(2);
    const ref = String(b.ref || `moshr-${Date.now()}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    const uf = String(b.uf || "").toUpperCase();

    const order = {
      type: "online",
      total_amount: total,
      external_reference: ref,
      processing_mode: "automatic",
      transactions: { payments: [{ amount: total, payment_method: { id: "pix", type: "bank_transfer" }, expiration_time: "PT1H" }] },
      payer: { email },
    };
    if (/^[A-Z]{2}$/.test(uf)) order.config = { location: { state_id: `BR-${uf}` } };

    const r = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": crypto.createHash("sha256").update(ref + JSON.stringify(order)).digest("hex"),
      },
      body: JSON.stringify(order),
    });
    const data = await r.json();
    const pm = data?.transactions?.payments?.[0]?.payment_method || {};
    if (!r.ok || !pm.qr_code) {
      console.error("Mercado Pago recusou a order Pix:", r.status, JSON.stringify(data));
      const out = { erro: "Não foi possível gerar o Pix. Tente novamente." };
      if (process.env.DEBUG_CHECKOUT === "1") out.debug = { mp_status: r.status, mp: data };
      return res.status(502).json(out);
    }

    // Sem banco de dados nesta versão: os dados do pedido ficam registrados nos Logs da Vercel.
    console.log("PEDIDO_PIX", JSON.stringify({
      pedido: ref, order: data.id, total,
      cliente: { nome: b.nome, email, whatsapp: b.zap },
      entrega: { cep: b.cep, endereco: b.end, numero: b.num, cidade: b.cid, uf },
      comprar: lines.map((l) => `${l.qty}x ${l.p.nome} | ${l.size} | ${l.color} | ${l.p.aliexpress || "link não cadastrado"}`),
    }));
    res.status(200).json({ id: data.id, qr: pm.qr_code, qrBase64: pm.qr_code_base64, ticketUrl: pm.ticket_url, total: Number(total) });
  } catch (e) {
    console.error("pix erro", e.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}
