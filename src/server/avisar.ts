import { db, dbEnabled, enc } from "./db";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Item = { quantidade: number; nome: string; tamanho: string; cor: string };
type Pedido = {
  numero: string; total: number; frete: number; forma_pagamento: string;
  cliente_nome: string; cliente_email: string; cliente_telefone: string;
  endereco: string; numero_endereco: string; cidade: string; uf: string; cep: string;
  pedido_itens: Item[];
};

export async function avisarDono(numero: string) {
  const fone = String(process.env.WHATSAPP_DONO || "5549991267439").replace(/\D/g, "");
  const chave = String(process.env.WHATSAPP_APIKEY || "").trim();
  if (!fone || !chave || !dbEnabled()) return;
  const rows = await db("GET", `pedidos?numero=eq.${enc(numero)}&select=numero,total,frete,forma_pagamento,cliente_nome,cliente_email,cliente_telefone,endereco,numero_endereco,cidade,uf,cep,pedido_itens(quantidade,nome,tamanho,cor)`) as Pedido[];
  const p = rows?.[0];
  if (!p) return;
  const itens = (p.pedido_itens || []).map((i) => `${i.quantidade}x ${i.nome} (${i.tamanho} / ${i.cor})`).join("\n");
  const texto = [
    `Pedido ${p.numero} pago.`,
    `Total ${brl(p.total)} · frete ${brl(p.frete)} · ${p.forma_pagamento === "pix" ? "Pix" : "Mercado Pago"}`,
    `${p.cliente_nome}`,
    `${p.cliente_email}`,
    `Tel ${p.cliente_telefone}`,
    `${p.endereco}, ${p.numero_endereco} · ${p.cidade}/${p.uf} · CEP ${p.cep}`,
    itens,
  ].filter(Boolean).join("\n");
  const url = `https://api.callmebot.com/whatsapp.php?phone=${fone}&apikey=${encodeURIComponent(chave)}&text=${encodeURIComponent(texto)}`;
  const r = await fetch(url);
  if (!r.ok) console.error("WhatsApp do dono falhou:", r.status, (await r.text()).slice(0, 200));
}
