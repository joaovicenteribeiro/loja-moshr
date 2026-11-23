import crypto from "node:crypto";
import { marcarPago, encerrar } from "./orders";

const mpGet = (path: string) => fetch(`https://api.mercadopago.com${path}`, {
  headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
});

export function assinaturaConfere(secret: string, headers: Headers, idQuery: string) {
  const parts: Record<string, string> = {};
  for (const s of String(headers.get("x-signature") || "").split(",")) {
    const i = s.indexOf("=");
    if (i > 0) parts[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  const reqId = headers.get("x-request-id");
  let manifest = "";
  if (idQuery) manifest += `id:${/^[A-Za-z0-9]+$/.test(idQuery) ? idQuery.toLowerCase() : idQuery};`;
  if (reqId) manifest += `request-id:${reqId};`;
  if (parts.ts) manifest += `ts:${parts.ts};`;
  const mine = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const ok = !!parts.v1 && parts.v1.length === mine.length && crypto.timingSafeEqual(Buffer.from(mine), Buffer.from(parts.v1));
  return { ok, info: { id_na_url: !!idQuery, request_id: !!reqId, ts: !!parts.ts, v1: !!parts.v1, tamanho_secret: secret.length } };
}

const text = (status: number, body: string) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function postWebhook(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({})) as { data?: { id?: string }; type?: string };
    const idQuery = url.searchParams.get("data.id") || "";
    const dataId = idQuery || String(body?.data?.id || "");
    const type = url.searchParams.get("type") || url.searchParams.get("topic") || body?.type;
    const secret = String(process.env.MP_WEBHOOK_SECRET || "").trim();

    if (secret) {
      const { ok, info } = assinaturaConfere(secret, req.headers, idQuery);
      if (!ok) {
        console.warn("Assinatura do webhook não confere:", JSON.stringify(info));
        return text(401, "assinatura inválida");
      }
    } else {
      console.warn("MP_WEBHOOK_SECRET ausente: assinatura não validada (o pagamento ainda é consultado na API).");
    }

    if (String(type).startsWith("order") && dataId) {
      const ro = await mpGet(`/v1/orders/${encodeURIComponent(dataId)}`);
      if ([400, 403, 404].includes(ro.status)) return text(200, "não encontrado");
      if (!ro.ok) return text(500, "falha ao consultar order");
      const o = await ro.json();
      console.log("PAGAMENTO_ORDER", JSON.stringify({ order: o.id, status: o.status, detalhe: o.status_detail, pedido: o.external_reference, valor: o.total_amount }));
      if (o.status === "processed" && o.status_detail === "accredited") await marcarPago(o.external_reference, { order: o.id, via: "webhook" });
      else if (o.status === "expired") await encerrar(o.external_reference, "expirado", { order: o.id });
      else if (o.status === "canceled") await encerrar(o.external_reference, "cancelado", { order: o.id });
      return text(200, "ok");
    }
    if (type !== "payment" || !dataId) return text(200, "ignorado");

    const r = await mpGet(`/v1/payments/${encodeURIComponent(dataId)}`);
    if ([400, 403, 404].includes(r.status)) return text(200, "não encontrado");
    if (!r.ok) return text(500, "falha ao consultar pagamento");
    const p = await r.json();
    console.log("PAGAMENTO", JSON.stringify({
      id: p.id, status: p.status, detalhe: p.status_detail, pedido: p.external_reference,
      valor: p.transaction_amount, comprador: p.payer?.email, fornecedor: p.metadata?.fornecedor,
    }));
    if (p.status === "approved") await marcarPago(p.external_reference, { payment: p.id, metodo: p.payment_method_id, via: "webhook" });
    return text(200, "ok");
  } catch (e) {
    console.error("webhook erro", (e as Error).message);
    return text(500, "erro interno");
  }
}
