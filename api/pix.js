// POST /api/pix — cria o pedido no banco e um pagamento Pix (Checkout Transparente, Orders API).
// Corpo JSON: { items: "id:tamanho:qtd:cor,...", nome, email, zap, cep, end, num, cid, uf }
// Preço e frete são calculados AQUI a partir de data/products.json, nunca do navegador.
import crypto from "node:crypto";
import { loadCatalog } from "./_catalog.js";
import { limited } from "./_limit.js";
import { novoNumero, criarPedido, falhaPedido, definirGateway } from "./_orders.js";

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
    const email = String(b.email || "").trim().slice(0, 120), nome = String(b.nome || "").trim().slice(0, 100);
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ erro: "E-mail inválido" });
    if (nome.length < 3) return res.status(400).json({ erro: "Informe o nome completo" });

    const subtotal = lines.reduce((a, l) => a + cents(priceOf(l.p)) * l.qty, 0);
    const frete = subtotal >= GRATIS_ACIMA ? 0 : FRETE;
    const total = ((subtotal + frete) / 100).toFixed(2);
    const numero = novoNumero();
    const uf = String(b.uf || "").toUpperCase().slice(0, 2);

    // 1) grava o pedido ANTES de gerar o Pix: nunca existe pagamento sem registro.
    try {
      await criarPedido({
        numero, forma: "pix", subtotal: subtotal / 100, frete: frete / 100, total: Number(total),
        cliente: { nome, email, telefone: String(b.zap || "").slice(0, 30) },
        entrega: { cep: String(b.cep || "").replace(/\D/g, "").slice(0, 8), endereco: String(b.end || "").slice(0, 150),
          numero_endereco: String(b.num || "").slice(0, 20), cidade: String(b.cid || "").slice(0, 80), uf },
        itens: lines.map((l) => ({ produto_id: Number(l.id), nome: l.p.nome, tamanho: l.size, cor: l.color, quantidade: l.qty,
          preco_unit: priceOf(l.p), custo_unit: l.p.custo || null, link_fornecedor: l.p.aliexpress || null })),
      });
    } catch (e) {
      console.error("Supabase falhou ao criar o pedido:", e.message);
      return res.status(500).json({ erro: "Não foi possível registrar o pedido. Tente novamente." });
    }

    const order = {
      type: "online", total_amount: total, external_reference: numero, processing_mode: "automatic",
      transactions: { payments: [{ amount: total, payment_method: { id: "pix", type: "bank_transfer" }, expiration_time: "PT1H" }] },
      payer: { email },
    };
    if (/^[A-Z]{2}$/.test(uf)) order.config = { location: { state_id: `BR-${uf}` } };

    const r = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": crypto.createHash("sha256").update(numero).digest("hex"),
      },
      body: JSON.stringify(order),
    });
    const data = await r.json();
    const pm = data?.transactions?.payments?.[0]?.payment_method || {};
    if (!r.ok || !pm.qr_code) {
      console.error("Mercado Pago recusou a order Pix:", r.status, JSON.stringify(data));
      await falhaPedido(numero, "mercado_pago_recusou").catch(() => {});
      const out = { erro: "Não foi possível gerar o Pix. Tente novamente." };
      if (process.env.DEBUG_CHECKOUT === "1") out.debug = { mp_status: r.status, mp: data };
      return res.status(502).json(out);
    }
    await definirGateway(numero, data.id).catch((e) => console.error("gateway_id:", e.message));

    console.log("PEDIDO_PIX", JSON.stringify({
      pedido: numero, order: data.id, total, cliente: { nome, email, whatsapp: b.zap },
      comprar: lines.map((l) => `${l.qty}x ${l.p.nome} | ${l.size} | ${l.color} | ${l.p.aliexpress || "link não cadastrado"}`),
    }));
    res.status(200).json({ id: data.id, numero, qr: pm.qr_code, qrBase64: pm.qr_code_base64, ticketUrl: pm.ticket_url, total: Number(total) });
  } catch (e) {
    console.error("pix erro", e.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}
