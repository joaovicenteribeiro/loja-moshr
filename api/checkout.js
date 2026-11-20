// api/checkout.js — função serverless (Vercel, Node 18+)
// Variáveis de ambiente: MP_ACCESS_TOKEN e SITE_URL (veja .env.example)
//
// O site chama: GET /api/checkout?items=1:M:2:Preto,3:P:1:Cinza&nome=...&email=...&zap=...&cep=...
// Formato de cada item: idDoProduto:tamanho:quantidade:cor
// Os preços vêm SEMPRE deste catálogo, nunca do navegador.
// Em seguida cria a preferência (Checkout Pro) e redireciona o cliente para pagar.

const RS = ["P", "M", "G", "GG"], CS = ["38", "40", "42"], AS = ["Único"];
// [nome, preço, promoção (0 = sem), tamanhos, cores]
const CATALOG = {
  1: ["Camiseta Oversized Slash", 89.9, 0, RS, ["Preto", "Cinza"]],
  2: ["Flanela Xadrez Desbotada", 169.9, 139.9, RS, ["Vermelho", "Preto"]],
  3: ["Moletom Zip Gasto", 219.9, 0, RS, ["Grafite", "Preto"]],
  4: ["Camiseta Mourning Wash", 99.9, 0, RS, ["Preto"]],
  5: ["Calça Flare Veludo", 189.9, 159.9, RS, ["Preto", "Vinho"]],
  6: ["Coturno Plataforma", 329.9, 0, CS, ["Preto"]],
  7: ["Jaqueta Bomber Patch", 279.9, 0, RS, ["Preto", "Verde"]],
  8: ["Calça Tartan Bondage", 199.9, 0, RS, ["Vermelho", "Cinza"]],
  9: ["Cinto Spike", 79.9, 0, AS, ["Preto"]],
  10: ["Camiseta Listrada Scene", 94.9, 0, RS, ["Preto", "Rosa"]],
  11: ["Calça Skinny Rasgada", 179.9, 0, RS, ["Preto", "Cinza"]],
  12: ["Pulseira Xadrez Dupla", 49.9, 0, AS, ["Preto"]],
  13: ["Top Mesh Cyber", 109.9, 0, RS, ["Prata", "Preto"]],
  14: ["Calça Cargo Chrome", 229.9, 0, RS, ["Prata", "Grafite"]],
  15: ["Moletom Heavy Boxy", 249.9, 209.9, RS, ["Preto", "Off-white"]],
};

// id do produto MOSHR -> link do produto no fornecedor (AliExpress/DSers).
// Vai nos metadados do pagamento para você saber o que comprar.
const SUPPLIER = {
  // 1: "https://www.aliexpress.com/item/ID-DO-PRODUTO.html",
};

const priceOf = (p) => p[2] || p[1];

export default async function handler(req, res) {
  try {
    const q = req.query;
    const lines = String(q.items || "")
      .split(",")
      .map((x) => x.split(":"))
      .map(([id, size, qty, color]) => {
        const p = CATALOG[id];
        if (!p || !p[3].includes(size)) return null;
        return {
          id, p, size,
          color: p[4].includes(color) ? color : p[4][0],
          qty: Math.min(Math.max(parseInt(qty) || 1, 1), 10),
        };
      })
      .filter(Boolean);
    if (!lines.length) return res.status(400).send("Carrinho vazio");

    const subtotal = lines.reduce((a, l) => a + priceOf(l.p) * l.qty, 0);
    const frete = subtotal >= 250 ? 0 : 24.9;
    const site = process.env.SITE_URL;
    const pix = q.pg === "pix"; // opcional: ?pg=pix limita a Pix com 10% off

    const preference = {
      items: lines.map((l) => ({
        id: l.id,
        title: `${l.p[0]} (${l.size} / ${l.color})`,
        quantity: l.qty,
        currency_id: "BRL",
        unit_price: +(priceOf(l.p) * (pix ? 0.9 : 1)).toFixed(2),
      })),
      shipments: { cost: frete, mode: "not_specified" },
      payer: {
        name: String(q.nome || "").slice(0, 80),
        email: String(q.email || "").slice(0, 120),
        phone: { number: String(q.zap || "").replace(/\D/g, "") },
        address: { zip_code: String(q.cep || "").replace(/\D/g, ""), street_name: String(q.end || "").slice(0, 120) },
      },
      payment_methods: pix
        ? { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }] }
        : { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 6 },
      external_reference: String(q.ref || `moshr-${Date.now()}`).slice(0, 64),
      metadata: {
        numero: q.num, cidade: q.cid, uf: q.uf,
        fornecedor: lines.map((l) => `${l.qty}x ${l.p[0]} | ${l.size} | ${l.color} | ${SUPPLIER[l.id] || "link ainda não cadastrado"}`),
      },
    };
    if (site) {
      preference.back_urls = { success: site, pending: site, failure: site };
      preference.auto_return = "approved";
    }

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      body: JSON.stringify(preference),
    });
    const data = await r.json();
    if (!r.ok || !data.init_point) return res.status(502).send("Erro ao criar o pagamento");
    res.redirect(302, data.init_point); // com credenciais TEST-, use data.sandbox_init_point se preferir
  } catch (e) {
    res.status(500).send("Erro interno");
  }
}
