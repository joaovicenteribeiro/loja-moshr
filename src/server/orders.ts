import crypto from "node:crypto";
import { db, dbEnabled, enc } from "./db";

export const STATUS = ["aguardando_pagamento", "pago", "em_processamento", "comprado_fornecedor", "enviado", "entregue", "cancelado", "expirado"];
export const novoNumero = () => "MSH-" + crypto.randomBytes(4).toString("hex").toUpperCase();

type Row = { id: string };

const evento = (pedido_id: string, tipo: string, detalhe: unknown) =>
  db("POST", "pedido_eventos", { pedido_id, tipo, detalhe: detalhe ?? null });

export async function criarPedido(p: {
  numero: string;
  forma: string;
  subtotal: number;
  frete: number;
  total: number;
  cliente: { nome: string; email: string; telefone: string };
  entrega: { cep: string; endereco: string; numero_endereco: string; cidade: string; uf: string };
  itens: Record<string, unknown>[];
}) {
  if (!dbEnabled()) return null;
  const rows = await db("POST", "pedidos", {
    numero: p.numero, forma_pagamento: p.forma,
    cliente_nome: p.cliente.nome, cliente_email: p.cliente.email, cliente_telefone: p.cliente.telefone,
    cep: p.entrega.cep, endereco: p.entrega.endereco, numero_endereco: p.entrega.numero_endereco,
    cidade: p.entrega.cidade, uf: p.entrega.uf,
    subtotal: p.subtotal, frete: p.frete, total: p.total,
  }, "return=representation") as Row[];
  const row = rows[0];
  await db("POST", "pedido_itens", p.itens.map((i) => ({ pedido_id: row.id, ...i })));
  await evento(row.id, "criado", { forma: p.forma });
  return row;
}

export async function definirGateway(numero: string, gatewayId: string) {
  if (!dbEnabled()) return;
  await db("PATCH", `pedidos?numero=eq.${enc(numero)}`, { gateway_id: String(gatewayId) });
}

async function sairDeAguardando(numero: string | undefined, campos: Record<string, unknown>, tipo: string, detalhe: unknown) {
  if (!dbEnabled() || !numero) return false;
  const rows = await db("PATCH", `pedidos?numero=eq.${enc(numero)}&status=eq.aguardando_pagamento`, campos, "return=representation") as Row[] | null;
  if (rows && rows.length) { await evento(rows[0].id, tipo, detalhe); return true; }
  return false;
}

export const marcarPago = (numero: string | undefined, detalhe: unknown) =>
  sairDeAguardando(numero, { status: "pago", pago_em: new Date().toISOString() }, "pago", detalhe);
export const encerrar = (numero: string | undefined, status: string, detalhe: unknown) =>
  sairDeAguardando(numero, { status }, status, detalhe);
export const falhaPedido = (numero: string, motivo: string) => encerrar(numero, "cancelado", { motivo });

export async function consultarPedido(numero: string, email: string) {
  if (!dbEnabled()) return null;
  const rows = await db("GET", `pedidos?numero=eq.${enc(numero)}&select=numero,status,total,frete,rastreio,cliente_email,pedido_itens(nome,tamanho,cor,quantidade)`) as {
    numero: string; status: string; total: number; frete: number; rastreio: string | null; cliente_email: string;
    pedido_itens: { nome: string; tamanho: string; cor: string; quantidade: number }[];
  }[];
  const row = rows?.[0];
  if (!row || row.cliente_email.toLowerCase() !== email.toLowerCase()) return null;
  return { numero: row.numero, status: row.status, total: row.total, frete: row.frete, rastreio: row.rastreio, itens: row.pedido_itens || [] };
}
