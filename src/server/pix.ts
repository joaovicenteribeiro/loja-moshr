import crypto from "node:crypto";
import { loadCatalog } from "./catalog";
import { limited } from "./limit";
import { novoNumero, criarPedido, falhaPedido, definirGateway, marcarPago, encerrar } from "./orders";

const FRETE = 2490, GRATIS_ACIMA = 25000;
const cents = (n: number) => Math.round(n * 100);
const priceOf = (p: { promo?: number; preco: number }) => p.promo || p.preco;

type Body = Record<string, string | undefined>;

export async function postPix(req: Request) {
  if (limited(req)) return Response.json({ erro: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  try {
    const b = await req.json().catch(() => ({})) as Body;
    const cat = loadCatalog();
    const lines = String(b.items || "").split(",").map((x) => x.split(":"))
      .map(([id, size, qty, color]) => {
        const p = cat[id];
        if (!p || !p.tamanhos.includes(size)) return null;
        return { id, p, size, color: p.cores.includes(color) ? color : p.cores[0], qty: Math.min(Math.max(parseInt(qty) || 1, 1), 10) };
      }).filter((x): x is NonNullable<typeof x> => !!x);
    if (!lines.length) return Response.json({ erro: "Carrinho vazio" }, { status: 400 });
    const email = String(b.email || "").trim().slice(0, 120), nome = String(b.nome || "").trim().slice(0, 100);
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ erro: "E-mail inválido" }, { status: 400 });
    if (nome.length < 3) return Response.json({ erro: "Informe o nome completo" }, { status: 400 });

    const subtotal = lines.reduce((a, l) => a + cents(priceOf(l.p)) * l.qty, 0);
    const frete = subtotal >= GRATIS_ACIMA ? 0 : FRETE;
    const total = ((subtotal + frete) / 100).toFixed(2);
    const numero = novoNumero();
    const uf = String(b.uf || "").toUpperCase().slice(0, 2);

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
      console.error("Supabase falhou ao criar o pedido:", (e as Error).message);
      return Response.json({ erro: "Não foi possível registrar o pedido. Tente novamente." }, { status: 500 });
    }

    const order: Record<string, unknown> = {
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
      const out: Record<string, unknown> = { erro: "Não foi possível gerar o Pix. Tente novamente." };
      if (process.env.DEBUG_CHECKOUT === "1") out.debug = { mp_status: r.status, mp: data };
      return Response.json(out, { status: 502 });
    }
    await definirGateway(numero, data.id).catch((e) => console.error("gateway_id:", (e as Error).message));
    return Response.json({ id: data.id, numero, qr: pm.qr_code, qrBase64: pm.qr_code_base64, ticketUrl: pm.ticket_url, total: Number(total) });
  } catch (e) {
    console.error("pix erro", (e as Error).message);
    return Response.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function getPixStatus(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return Response.json({ erro: "id inválido" }, { status: 400 });
    const r = await fetch(`https://api.mercadopago.com/v1/orders/${id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    if (!r.ok) return Response.json({ erro: "consulta falhou" }, { status: 502 });
    const o = await r.json();
    const paid = o.status === "processed" && o.status_detail === "accredited";
    const final = ["canceled", "failed", "expired", "refunded", "charged_back"].includes(o.status);
    try {
      if (paid) { console.log("PIX_PAGO", JSON.stringify({ order: id, pedido: o.external_reference, valor: o.total_amount })); await marcarPago(o.external_reference, { order: id, via: "consulta" }); }
      else if (final && (o.status === "expired" || o.status === "canceled")) await encerrar(o.external_reference, o.status === "expired" ? "expirado" : "cancelado", { order: id });
    } catch (e) { console.error("banco:", (e as Error).message); }
    return Response.json({ status: o.status, status_detail: o.status_detail, paid, final }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ erro: "erro interno" }, { status: 500 });
  }
}
