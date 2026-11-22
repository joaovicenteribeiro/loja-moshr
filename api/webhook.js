// POST /api/webhook — notificações do Mercado Pago (Pagamentos e Orders).
// 1) valida a assinatura (x-signature) se MP_WEBHOOK_SECRET estiver definido;
// 2) NÃO confia no corpo da notificação: consulta o pagamento/order direto na API do Mercado Pago;
// 3) marca o pedido como pago no banco (uma única vez) e registra nos logs da Vercel.
import crypto from "node:crypto";
import { marcarPago, encerrar } from "./_orders.js";

const mpGet = (path) => fetch(`https://api.mercadopago.com${path}`, {
  headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
});

// Template oficial: id:[data.id da URL];request-id:[x-request-id];ts:[ts do x-signature];
// Partes ausentes na notificação são omitidas do template. Se o data.id for alfanumérico, vai em minúsculas.
export function assinaturaConfere(secret, headers, idQuery) {
  const parts = {};
  for (const s of String(headers["x-signature"] || "").split(",")) {
    const i = s.indexOf("=");
    if (i > 0) parts[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  const reqId = headers["x-request-id"];
  let manifest = "";
  if (idQuery) manifest += `id:${/^[A-Za-z0-9]+$/.test(idQuery) ? idQuery.toLowerCase() : idQuery};`;
  if (reqId) manifest += `request-id:${reqId};`;
  if (parts.ts) manifest += `ts:${parts.ts};`;
  const mine = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const ok = !!parts.v1 && parts.v1.length === mine.length && crypto.timingSafeEqual(Buffer.from(mine), Buffer.from(parts.v1));
  return { ok, info: { id_na_url: !!idQuery, request_id: !!reqId, ts: !!parts.ts, v1: !!parts.v1, tamanho_secret: secret.length } };
}

export default async function handler(req, res) {
  try {
    const q = req.query || {}, body = req.body || {};
    const idQuery = q["data.id"] ? String(q["data.id"]) : "";
    const dataId = idQuery || String(body?.data?.id || "");
    const type = q.type || q.topic || body?.type;
    const secret = String(process.env.MP_WEBHOOK_SECRET || "").trim(); // espaço/quebra de linha ao colar quebraria a conferência

    if (secret) {
      const { ok, info } = assinaturaConfere(secret, req.headers || {}, idQuery);
      if (!ok) {
        console.warn("Assinatura do webhook não confere:", JSON.stringify(info));
        return res.status(401).send("assinatura inválida");
      }
    } else {
      console.warn("MP_WEBHOOK_SECRET ausente: assinatura não validada (o pagamento ainda é consultado na API).");
    }

    // Pix pelo Checkout Transparente chega como notificação de "order".
    if (String(type).startsWith("order") && dataId) {
      const ro = await mpGet(`/v1/orders/${encodeURIComponent(dataId)}`);
      if (!ro.ok) return res.status(500).send("falha ao consultar order");
      const o = await ro.json();
      console.log("PAGAMENTO_ORDER", JSON.stringify({ order: o.id, status: o.status, detalhe: o.status_detail, pedido: o.external_reference, valor: o.total_amount }));
      if (o.status === "processed" && o.status_detail === "accredited") await marcarPago(o.external_reference, { order: o.id, via: "webhook" });
      else if (o.status === "expired") await encerrar(o.external_reference, "expirado", { order: o.id });
      else if (o.status === "canceled") await encerrar(o.external_reference, "cancelado", { order: o.id });
      return res.status(200).send("ok");
    }
    if (type !== "payment" || !dataId) return res.status(200).send("ignorado");

    const r = await mpGet(`/v1/payments/${encodeURIComponent(dataId)}`);
    if (!r.ok) return res.status(500).send("falha ao consultar pagamento"); // o Mercado Pago tenta de novo
    const p = await r.json();
    // Só "approved" liberado pela API conta como pago. Reenvios do mesmo evento não repetem a mudança.
    console.log("PAGAMENTO", JSON.stringify({
      id: p.id, status: p.status, detalhe: p.status_detail, pedido: p.external_reference,
      valor: p.transaction_amount, comprador: p.payer?.email, fornecedor: p.metadata?.fornecedor,
    }));
    if (p.status === "approved") await marcarPago(p.external_reference, { payment: p.id, metodo: p.payment_method_id, via: "webhook" });
    res.status(200).send("ok");
  } catch (e) {
    console.error("webhook erro", e.message);
    res.status(500).send("erro interno");
  }
}
