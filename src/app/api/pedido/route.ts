import { consultarPedido } from "@/server/orders";
import { limited } from "@/server/limit";

export async function GET(req: Request) {
  if (limited(req, 30)) return Response.json({ erro: "Muitas tentativas. Aguarde." }, { status: 429 });
  const u = new URL(req.url);
  const numero = u.searchParams.get("numero") || "";
  const email = (u.searchParams.get("email") || "").trim();
  if (!/^MSH-[A-Z0-9]{8}$/.test(numero) || !/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ erro: "Informe o número do pedido e o e-mail usado na compra." }, { status: 400 });
  }
  const row = await consultarPedido(numero, email);
  if (!row) return Response.json({ erro: "Pedido não encontrado." }, { status: 404 });
  return Response.json(row, { headers: { "Cache-Control": "no-store" } });
}
