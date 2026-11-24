import { marcarPago } from "@/server/orders";
import { limited } from "@/server/limit";

export async function GET(req: Request) {
  if (limited(req, 30)) return Response.json({ erro: "Muitas tentativas. Aguarde." }, { status: 429 });
  const id = new URL(req.url).searchParams.get("payment_id") || "";
  if (!/^\d{5,20}$/.test(id)) return Response.json({ paid: false }, { headers: { "Cache-Control": "no-store" } });
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) return Response.json({ paid: false }, { status: 502, headers: { "Cache-Control": "no-store" } });
  const p = await r.json();
  const numero = String(p.external_reference || "");
  const paid = p.status === "approved";
  if (paid) await marcarPago(numero, { payment: p.id, metodo: p.payment_method_id, via: "retorno" }).catch(() => {});
  return Response.json({ paid, status: p.status, numero }, { headers: { "Cache-Control": "no-store" } });
}
