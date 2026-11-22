// Regras de pedidos no banco. Tudo é no-op se o Supabase não estiver configurado.
import crypto from "node:crypto";
import { db, dbEnabled, enc } from "./_db.js";

export const STATUS = ["aguardando_pagamento", "pago", "em_processamento", "comprado_fornecedor", "enviado", "entregue", "cancelado", "expirado"];
export const novoNumero = () => "MSH-" + crypto.randomBytes(4).toString("hex").toUpperCase();

const evento = (pedido_id, tipo, detalhe) => db("POST", "pedido_eventos", { pedido_id, tipo, detalhe: detalhe ?? null });

export async function criarPedido(p) {
  if (!dbEnabled()) return null;
  const [row] = await db("POST", "pedidos", {
    numero: p.numero, forma_pagamento: p.forma,
    cliente_nome: p.cliente.nome, cliente_email: p.cliente.email, cliente_telefone: p.cliente.telefone,
    cep: p.entrega.cep, endereco: p.entrega.endereco, numero_endereco: p.entrega.numero_endereco,
    cidade: p.entrega.cidade, uf: p.entrega.uf,
    subtotal: p.subtotal, frete: p.frete, total: p.total,
  }, "return=representation");
  await db("POST", "pedido_itens", p.itens.map((i) => ({ pedido_id: row.id, ...i })));
  await evento(row.id, "criado", { forma: p.forma });
  return row;
}

export async function definirGateway(numero, gatewayId) {
  if (!dbEnabled()) return;
  await db("PATCH", `pedidos?numero=eq.${enc(numero)}`, { gateway_id: String(gatewayId) });
}

// Só sai de "aguardando_pagamento": repetir a chamada (webhook duplicado, polling) não faz nada.
async function sairDeAguardando(numero, campos, tipo, detalhe) {
  if (!dbEnabled() || !numero) return false;
  const rows = await db("PATCH", `pedidos?numero=eq.${enc(numero)}&status=eq.aguardando_pagamento`, campos, "return=representation");
  if (rows && rows.length) { await evento(rows[0].id, tipo, detalhe); return true; }
  return false;
}
export const marcarPago = (numero, detalhe) =>
  sairDeAguardando(numero, { status: "pago", pago_em: new Date().toISOString() }, "pago", detalhe);
export const encerrar = (numero, status, detalhe) =>
  sairDeAguardando(numero, { status }, status, detalhe);
export const falhaPedido = (numero, motivo) => encerrar(numero, "cancelado", { motivo });
