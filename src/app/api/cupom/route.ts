import { aplicarFrete } from "@/server/coupons";
import { limited } from "@/server/limit";

export function GET(req: Request) {
  if (limited(req, 30)) return Response.json({ erro: "Muitas tentativas. Aguarde." }, { status: 429 });
  const codigo = new URL(req.url).searchParams.get("codigo") || "";
  const r = aplicarFrete(1, codigo);
  if ("erro" in r && r.erro) return Response.json({ erro: r.erro }, { status: 400 });
  return Response.json({ cupom: r.cupom, frete_gratis: r.frete === 0 });
}
