import crypto from "node:crypto";
import { db, dbEnabled, enc } from "./db";
import { limited } from "./limit";
import { STATUS } from "./orders";

const sha = (s: string) => crypto.createHash("sha256").update(String(s)).digest();
const autorizado = (req: Request) => {
  const pw = String(process.env.ADMIN_PASSWORD || "");
  if (pw.length < 12) return false;
  return crypto.timingSafeEqual(sha(req.headers.get("x-admin-password") || ""), sha(pw));
};

export async function adminPedidos(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (limited(req, 40)) return Response.json({ erro: "Muitas tentativas. Aguarde." }, { status: 429, headers });
  if (!dbEnabled()) return Response.json({ erro: "Banco não configurado (SUPABASE_URL e SUPABASE_SECRET_KEY)." }, { status: 503, headers });
  if (String(process.env.ADMIN_PASSWORD || "").length < 12) return Response.json({ erro: "Defina ADMIN_PASSWORD com 12 ou mais caracteres." }, { status: 503, headers });
  if (!autorizado(req)) return Response.json({ erro: "Senha incorreta" }, { status: 401, headers });
  try {
    if (req.method === "GET") {
      const st = new URL(req.url).searchParams.get("status") || "";
      const filtro = STATUS.includes(st) ? `&status=eq.${enc(st)}` : "";
      const rows = await db("GET", `pedidos?select=*,pedido_itens(*)&order=criado_em.desc&limit=100${filtro}`);
      return Response.json(rows, { headers });
    }
    if (req.method === "PATCH") {
      const b = await req.json().catch(() => ({})) as Record<string, string | undefined>;
      const numero = String(b.numero || "");
      if (!/^MSH-[A-Z0-9]{8}$/.test(numero)) return Response.json({ erro: "número inválido" }, { status: 400, headers });
      const campos: Record<string, string> = {};
      if (b.status !== undefined) { if (!STATUS.includes(b.status)) return Response.json({ erro: "status inválido" }, { status: 400, headers }); campos.status = b.status; }
      if (b.rastreio !== undefined) campos.rastreio = String(b.rastreio).slice(0, 80);
      if (b.observacoes !== undefined) campos.observacoes = String(b.observacoes).slice(0, 1000);
      if (!Object.keys(campos).length) return Response.json({ erro: "nada para atualizar" }, { status: 400, headers });
      const rows = await db("PATCH", `pedidos?numero=eq.${enc(numero)}`, campos, "return=representation") as { id: string }[];
      if (!rows || !rows.length) return Response.json({ erro: "pedido não encontrado" }, { status: 404, headers });
      await db("POST", "pedido_eventos", { pedido_id: rows[0].id, tipo: "admin", detalhe: campos });
      return Response.json(rows[0], { headers });
    }
    return Response.json({ erro: "Método não permitido" }, { status: 405, headers });
  } catch (e) {
    console.error("admin erro:", (e as Error).message);
    return Response.json({ erro: "Erro interno" }, { status: 500, headers });
  }
}
