// POST /api/checkout — cria o pagamento no Mercado Pago (Checkout Pro) e devolve { url }.
// Corpo JSON: { items: "id:tamanho:qtd:cor,...", nome, email, zap, cep, end, num, cid, uf, pg, ref }
// Os dados do cliente viajam no corpo (POST), não na URL. Preços e variantes vêm de data/products.json.
// Env: MP_ACCESS_TOKEN, SITE_URL (opcional: DEBUG_CHECKOUT=1 mostra o erro do Mercado Pago).
import { loadCatalog } from "./_catalog.js";
import { limited } from "./_limit.js";

const FRETE = 24.9, GRATIS_ACIMA = 250; // mesmos valores exibidos no site
const priceOf = (p) => p.promo || p.preco;

// Formas de pagamento. Boleto e lotérica ficam sempre de fora.
// ATENÇÃO: "account_money" (dinheiro em conta) NÃO pode ser excluído pelo Mercado Pago.
// pg: pix | credito | debito | mp (saldo da conta Mercado Pago) | todas (padrão)
const ALL_TYPES = ["credit_card", "debit_card", "bank_transfer", "ticket"];
const ALLOW = { pix: ["bank_transfer"], credito: ["credit_card"], debito: ["debit_card"], mp: [] };
const DEFAULT_ALLOW = ["credit_card", "debit_card", "bank_transfer"];
const methodsFor = (pg) => ({
  excluded_payment_types: ALL_TYPES.filter((t) => !(ALLOW[pg] || DEFAULT_ALLOW).includes(t)).map((id) => ({ id })),
  installments: 6,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (limited(req)) return res.status(429).json({ erro: "Muitas tentativas. Aguarde alguns minutos." });
  try {
    const q = req.body || {}, cat = loadCatalog();
    const lines = String(q.items || "").split(",").map((x) => x.split(":"))
      .map(([id, size, qty, color]) => {
        const p = cat[id];
        if (!p || !p.tamanhos.includes(size)) return null;
        return { id, p, size, color: p.cores.includes(color) ? color : p.cores[0],
          qty: Math.min(Math.max(parseInt(qty) || 1, 1), 10) };
      }).filter(Boolean);
    if (!lines.length) return res.status(400).json({ erro: "Carrinho vazio" });
    if (!/^\S+@\S+\.\S+$/.test(String(q.email || "").trim())) return res.status(400).json({ erro: "E-mail inválido" });

    const subtotal = lines.reduce((a, l) => a + priceOf(l.p) * l.qty, 0);
    // Normaliza SITE_URL: o Mercado Pago rejeita back_urls inválidas (sem https:// ou com espaço).
    let site = String(process.env.SITE_URL || "").trim().replace(/\/+$/, "");
    if (site && !/^https:\/\//.test(site)) site = /^http:\/\//.test(site) ? "" : "https://" + site;

    const preference = {
      items: lines.map((l) => ({ id: String(l.id), title: `${l.p.nome} (${l.size} / ${l.color})`,
        quantity: l.qty, currency_id: "BRL", unit_price: +priceOf(l.p).toFixed(2) })),
      shipments: { cost: subtotal >= GRATIS_ACIMA ? 0 : FRETE, mode: "not_specified" },
      payer: {
        name: String(q.nome || "").slice(0, 80), email: String(q.email).trim().slice(0, 120),
        phone: { number: String(q.zap || "").replace(/\D/g, "") },
        address: { zip_code: String(q.cep || "").replace(/\D/g, ""), street_name: String(q.end || "").slice(0, 120) },
      },
      payment_methods: methodsFor(String(q.pg || "todas")),
      external_reference: String(q.ref || `moshr-${Date.now()}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64),
      // Dados para você comprar na AliExpress depois que o pagamento for aprovado:
      metadata: { cep: String(q.cep || "").replace(/\D/g, ""), numero: q.num, cidade: q.cid, uf: q.uf,
        fornecedor: lines.map((l) => `${l.qty}x ${l.p.nome} | ${l.size} | ${l.color} | ${l.p.aliexpress || "link não cadastrado"}`) },
    };
    if (site) { preference.back_urls = { success: site, pending: site, failure: site }; preference.auto_return = "approved"; }

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      body: JSON.stringify(preference),
    });
    const data = await r.json();
    if (!r.ok || !data.init_point) {
      console.error("Mercado Pago recusou a preferência:", r.status, JSON.stringify(data));
      const out = { erro: "Não foi possível abrir o pagamento. Tente novamente." };
      if (process.env.DEBUG_CHECKOUT === "1") out.debug = { mp_status: r.status, mp: data };
      return res.status(502).json(out);
    }
    res.status(200).json({ url: data.init_point });
  } catch (e) {
    console.error("checkout erro", e.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}
