// GET  /api/admin/pedidos?status=pago   -> lista pedidos (com itens)
// PATCH /api/admin/pedidos  { numero, status?, rastreio?, observacoes? }
// Protegido por senha: header x-admin-password == ADMIN_PASSWORD (mínimo 12 caracteres).
import crypto from "node:crypto";
import { db, dbEnabled, enc } from "../_db.js";
import { limited } from "../_limit.js";
import { STATUS } from "../_orders.js";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const autorizado = (req) => {
  const pw = String(process.env.ADMIN_PASSWORD || "");
  if (pw.length < 12) return false;
  return crypto.timingSafeEqual(sha(req.headers["x-admin-password"] || ""), sha(pw));
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (limited(req, 40)) return res.status(429).json({ erro: "Muitas tentativas. Aguarde." });
  if (!dbEnabled()) return res.status(503).json({ erro: "Banco não configurado (SUPABASE_URL e SUPABASE_SECRET_KEY)." });
  if (String(process.env.ADMIN_PASSWORD || "").length < 12) return res.status(503).json({ erro: "Defina ADMIN_PASSWORD com 12 ou mais caracteres." });
  if (!autorizado(req)) return res.status(401).json({ erro: "Senha incorreta" });
  try {
    if (req.method === "GET") {
      const st = String(req.query.status || "");
      const filtro = STATUS.includes(st) ? `&status=eq.${enc(st)}` : "";
      const rows = await db("GET", `pedidos?select=*,pedido_itens(*)&order=criado_em.desc&limit=100${filtro}`);
      return res.status(200).json(rows);
    }
    if (req.method === "PATCH") {
      const b = req.body || {}, numero = String(b.numero || "");
      if (!/^MSH-[A-Z0-9]{8}$/.test(numero)) return res.status(400).json({ erro: "número inválido" });
      const campos = {};
      if (b.status !== undefined) { if (!STATUS.includes(b.status)) return res.status(400).json({ erro: "status inválido" }); campos.status = b.status; }
      if (b.rastreio !== undefined) campos.rastreio = String(b.rastreio).slice(0, 80);
      if (b.observacoes !== undefined) campos.observacoes = String(b.observacoes).slice(0, 1000);
      if (!Object.keys(campos).length) return res.status(400).json({ erro: "nada para atualizar" });
      const rows = await db("PATCH", `pedidos?numero=eq.${enc(numero)}`, campos, "return=representation");
      if (!rows || !rows.length) return res.status(404).json({ erro: "pedido não encontrado" });
      await db("POST", "pedido_eventos", { pedido_id: rows[0].id, tipo: "admin", detalhe: campos });
      return res.status(200).json(rows[0]);
    }
    res.status(405).json({ erro: "Método não permitido" });
  } catch (e) {
    console.error("admin erro:", e.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}
