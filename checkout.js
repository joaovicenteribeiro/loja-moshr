// GET /api/checkout?items=id:tamanho:qtd:cor,...&nome=&email=&zap=&cep=&end=&num=&cid=&uf=&ref=
// Preços e variantes vêm de data/products.json (servidor), nunca do navegador.
// Cria a preferência do Mercado Pago (Checkout Pro) e redireciona. Env: MP_ACCESS_TOKEN, SITE_URL.
import { loadCatalog } from "./_catalog.js";

const FRETE = 24.9, GRATIS_ACIMA = 250; // mesmos valores exibidos no site
const priceOf = (p) => p.promo || p.preco;

// Formas de pagamento oferecidas no Checkout Pro. Boleto e lotérica ficam sempre de fora.
// pg: pix | credito | debito | mp (saldo da conta Mercado Pago) | todas (padrão)
// ATENÇÃO: "account_money" (dinheiro em conta) NÃO pode ser excluído pelo Mercado Pago; enviar isso causa erro na criação.
const ALL_TYPES = ["credit_card", "debit_card", "bank_transfer", "prepaid_card", "ticket", "atm"];
const ALLOW = {
  pix: ["bank_transfer"], credito: ["credit_card"], debito: ["debit_card"], mp: ["account_money"],
};
const DEFAULT_ALLOW = ["credit_card", "debit_card", "bank_transfer", "prepaid_card"];
const methodsFor = (pg) => ({
  excluded_payment_types: ALL_TYPES.filter((t) => !(ALLOW[pg] || DEFAULT_ALLOW).includes(t)).map((id) => ({ id })),
  installments: 6,
});

export default async function handler(req, res) {
  try {
    const q = req.query, cat = loadCatalog();
    const lines = String(q.items || "").split(",").map((x) => x.split(":"))
      .map(([id, size, qty, color]) => {
        const p = cat[id];
        if (!p || !p.tamanhos.includes(size)) return null;
        return { id, p, size, color: p.cores.includes(color) ? color : p.cores[0],
          qty: Math.min(Math.max(parseInt(qty) || 1, 1), 10) };
      }).filter(Boolean);
    if (!lines.length) return res.status(400).send("Carrinho vazio");

    const subtotal = lines.reduce((a, l) => a + priceOf(l.p) * l.qty, 0);
    const site = process.env.SITE_URL;
    const preference = {
      items: lines.map((l) => ({ id: String(l.id), title: `${l.p.nome} (${l.size} / ${l.color})`,
        quantity: l.qty, currency_id: "BRL", unit_price: +priceOf(l.p).toFixed(2) })),
      shipments: { cost: subtotal >= GRATIS_ACIMA ? 0 : FRETE, mode: "not_specified" },
      payer: {
        name: String(q.nome || "").slice(0, 80), email: String(q.email || "").slice(0, 120),
        phone: { number: String(q.zap || "").replace(/\D/g, "") },
        address: { zip_code: String(q.cep || "").replace(/\D/g, ""), street_name: String(q.end || "").slice(0, 120) },
      },
      payment_methods: methodsFor(String(q.pg || "todas")),
      external_reference: String(q.ref || `moshr-${Date.now()}`).slice(0, 64),
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
    if (!r.ok || !data.init_point) { console.error("Mercado Pago recusou a preferência:", r.status, JSON.stringify(data)); if (process.env.DEBUG_CHECKOUT === "1") return res.status(502).json({ mp_status: r.status, mp: data }); // só para diagnóstico
      return res.status(502).send("Erro ao criar o pagamento"); }
    res.redirect(302, data.init_point);
  } catch (e) {
    res.status(500).send("Erro interno");
  }
}
