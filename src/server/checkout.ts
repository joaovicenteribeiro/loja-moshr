import { loadCatalog } from "./catalog";
import { limited } from "./limit";
import { novoNumero, criarPedido, falhaPedido, definirGateway } from "./orders";

const FRETE = 24.9, GRATIS_ACIMA = 250;
const priceOf = (p: { promo?: number; preco: number }) => p.promo || p.preco;
const ALL_TYPES = ["credit_card", "debit_card", "bank_transfer", "ticket"];
const ALLOW: Record<string, string[]> = { pix: ["bank_transfer"], credito: ["credit_card"], debito: ["debit_card"], mp: [] };
const DEFAULT_ALLOW = ["credit_card", "debit_card", "bank_transfer"];
const methodsFor = (pg: string) => ({
  excluded_payment_types: ALL_TYPES.filter((t) => !(ALLOW[pg] || DEFAULT_ALLOW).includes(t)).map((id) => ({ id })),
  installments: 6,
});

type Body = Record<string, string | undefined>;

export async function postCheckout(req: Request) {
  if (limited(req)) return Response.json({ erro: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  try {
    const q = await req.json().catch(() => ({})) as Body;
    const cat = loadCatalog();
    const lines = String(q.items || "").split(",").map((x) => x.split(":"))
      .map(([id, size, qty, color]) => {
        const p = cat[id];
        if (!p || !p.tamanhos.includes(size)) return null;
        return { id, p, size, color: p.cores.includes(color) ? color : p.cores[0], qty: Math.min(Math.max(parseInt(qty) || 1, 1), 10) };
      }).filter((x): x is NonNullable<typeof x> => !!x);
    if (!lines.length) return Response.json({ erro: "Carrinho vazio" }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(String(q.email || "").trim())) return Response.json({ erro: "E-mail inválido" }, { status: 400 });
    const nome = String(q.nome || "").trim().slice(0, 100);
    if (nome.length < 3) return Response.json({ erro: "Informe o nome completo" }, { status: 400 });

    const subtotal = lines.reduce((a, l) => a + priceOf(l.p) * l.qty, 0);
    const frete = subtotal >= GRATIS_ACIMA ? 0 : FRETE;
    const numero = novoNumero();
    try {
      await criarPedido({
        numero, forma: "checkout_pro", subtotal, frete, total: +(subtotal + frete).toFixed(2),
        cliente: { nome, email: String(q.email).trim().slice(0, 120), telefone: String(q.zap || "").slice(0, 30) },
        entrega: { cep: String(q.cep || "").replace(/\D/g, "").slice(0, 8), endereco: String(q.end || "").slice(0, 150),
          numero_endereco: String(q.num || "").slice(0, 20), cidade: String(q.cid || "").slice(0, 80), uf: String(q.uf || "").toUpperCase().slice(0, 2) },
        itens: lines.map((l) => ({ produto_id: Number(l.id), nome: l.p.nome, tamanho: l.size, cor: l.color, quantidade: l.qty,
          preco_unit: priceOf(l.p), custo_unit: l.p.custo || null, link_fornecedor: l.p.aliexpress || null })),
      });
    } catch (e) {
      console.error("Supabase falhou ao criar o pedido:", (e as Error).message);
      return Response.json({ erro: "Não foi possível registrar o pedido. Tente novamente." }, { status: 500 });
    }

    let site = String(process.env.SITE_URL || "").trim().replace(/\/+$/, "");
    if (site && !/^https:\/\//.test(site)) site = /^http:\/\//.test(site) ? "" : "https://" + site;

    const preference: Record<string, unknown> = {
      items: lines.map((l) => ({ id: String(l.id), title: `${l.p.nome} (${l.size} / ${l.color})`, quantity: l.qty, currency_id: "BRL", unit_price: +priceOf(l.p).toFixed(2) })),
      shipments: { cost: frete, mode: "not_specified" },
      payer: {
        name: String(q.nome || "").slice(0, 80), email: String(q.email).trim().slice(0, 120),
        phone: { number: String(q.zap || "").replace(/\D/g, "") },
        address: { zip_code: String(q.cep || "").replace(/\D/g, ""), street_name: String(q.end || "").slice(0, 120) },
      },
      payment_methods: methodsFor(String(q.pg || "todas")),
      external_reference: numero,
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
      await falhaPedido(numero, "mercado_pago_recusou").catch(() => {});
      const out: Record<string, unknown> = { erro: "Não foi possível abrir o pagamento. Tente novamente." };
      if (process.env.DEBUG_CHECKOUT === "1") out.debug = { mp_status: r.status, mp: data };
      return Response.json(out, { status: 502 });
    }
    await definirGateway(numero, data.id).catch((e) => console.error("gateway_id:", (e as Error).message));
    return Response.json({ url: data.init_point, numero });
  } catch (e) {
    console.error("checkout erro", (e as Error).message);
    return Response.json({ erro: "Erro interno" }, { status: 500 });
  }
}
