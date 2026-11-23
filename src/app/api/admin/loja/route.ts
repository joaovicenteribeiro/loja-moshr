import { adminGuard } from "@/server/admin";
import { loadLoja, saveLoja, type LojaInfo } from "@/server/public";

const headers = { "Cache-Control": "no-store" };

export function GET(req: Request) {
  const negado = adminGuard(req);
  if (negado) return negado;
  return Response.json(loadLoja(), { headers });
}

export async function PUT(req: Request) {
  const negado = adminGuard(req);
  if (negado) return negado;
  const b = await req.json().catch(() => ({})) as LojaInfo;
  return Response.json(saveLoja(b), { headers });
}
