import { publicCatalog } from "@/server/public";

export function GET() {
  try {
    return Response.json(publicCatalog(), { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate" } });
  } catch {
    return Response.json({ erro: "catálogo indisponível" }, { status: 500 });
  }
}
