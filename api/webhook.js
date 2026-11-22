// POST /api/webhook — notificações do Mercado Pago.
// 1) valida a assinatura (x-signature) se MP_WEBHOOK_SECRET estiver definido;
// 2) NÃO confia no corpo da notificação: consulta o pagamento direto na API do Mercado Pago;
// 3) registra o resultado nos logs da Vercel (sem banco de dados nesta versão).
import crypto from "node:crypto";
import { marcarPago, encerrar } from "./_orders.js";

export default async function handler(req, res) {
  try {
    const q = req.query, body = req.body || {};
    const dataId = String(q["data.id"] || body?.data?.id || "");
    const type = q.type || q.topic || body?.type;
    const secret = process.env.MP_WEBHOOK_SECRET;

    if (secret) {
      const parts = Object.fromEntries(String(req.headers["x-signature"] || "").split(",").map((s) => s.trim().split("=")));
      const manifest = `id:${dataId.toLowerCase()};request-id:${req.headers["x-request-id"] || ""};ts:${parts.ts};`;
      const mine = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
      const ok = parts.v1 && parts.v1.length === mine.length && crypto.timingSafeEqual(Buffer.from(mine), Buffer.from(parts.v1));
      if (!ok) return res.status(401).send("assinatura inválida");
    } else {
      console.warn("MP_WEBHOOK_SECRET ausente: assinatura não validada (o pagamento ainda é consultado na API).");
    }

    // Pix pelo Checkout Transparente chega como notificação de "order".
    if (String(type).startsWith("order") && dataId) {
      const ro = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });
      if (!ro.ok) return res.status(500).send("falha ao consultar order");
      const o = await ro.json();
      console.log("PAGAMENTO_ORDER", JSON.stringify({ order: o.id, status: o.status, detalhe: o.status_detail, pedido: o.external_reference, valor: o.total_amount }));
      if (o.status === "processed" && o.status_detail === "accredited") await marcarPago(o.external_reference, { order: o.id, via: "webhook" });
      else if (o.status === "expired") await encerrar(o.external_reference, "expirado", { order: o.id });
      else if (o.status === "canceled") await encerrar(o.external_reference, "cancelado", { order: o.id });
      return res.status(200).send("ok");
    }
    if (type !== "payment" || !dataId) return res.status(200).send("ignorado");

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    if (!r.ok) return res.status(500).send("falha ao consultar pagamento"); // o Mercado Pago tenta de novo
    const p = await r.json();

    // Só "approved" liberado pela API conta como pago. Reenvios do mesmo evento só repetem este log.
    console.log("PAGAMENTO", JSON.stringify({
      id: p.id, status: p.status, detalhe: p.status_detail, pedido: p.external_reference,
      valor: p.transaction_amount, comprador: p.payer?.email, fornecedor: p.metadata?.fornecedor,
      entrega: { cep: p.metadata?.cep, numero: p.metadata?.numero, cidade: p.metadata?.cidade, uf: p.metadata?.uf },
    }));
    if (p.status === "approved") await marcarPago(p.external_reference, { payment: p.id, metodo: p.payment_method_id, via: "webhook" });
    res.status(200).send("ok");
  } catch (e) {
    console.error("webhook erro", e.message);
    res.status(500).send("erro interno");
  }
}
