import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { adminGuard } from "@/server/admin";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request) {
  const negado = adminGuard(req);
  if (negado) return negado;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ erro: "Envie uma imagem." }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return Response.json({ erro: "Use JPG, PNG ou WEBP." }, { status: 400 });
  if (file.size > 4_000_000) return Response.json({ erro: "Imagem maior que 4 MB." }, { status: 400 });
  const name = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "images");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ imagem: `/images/${name}` }, { headers: { "Cache-Control": "no-store" } });
}
