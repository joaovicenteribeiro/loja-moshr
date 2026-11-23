"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const ST: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento", pago: "Pago", em_processamento: "Em processamento",
  comprado_fornecedor: "Em separação", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado", expirado: "Expirado",
};

type Pedido = { numero: string; status: string; total: number; rastreio?: string | null; itens: { quantidade: number; nome: string; tamanho: string; cor: string }[] };

export default function Page() {
  const [msg, setMsg] = useState("");
  const [row, setRow] = useState<Pedido | null>(null);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMsg("Buscando…");
    setRow(null);
    const q = new URLSearchParams({ numero: String(f.get("numero") || "").trim().toUpperCase(), email: String(f.get("email") || "").trim() });
    const r = await fetch("/api/pedido?" + q);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.erro || "Não encontrado."); return; }
    setMsg("");
    setRow(j);
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-12">
      <Link href="/" className="text-2xl font-black tracking-[0.12em] no-underline">MOSHR</Link>
      <h1 className="mt-6 text-3xl font-black uppercase">Acompanhar pedido</h1>
      <p className="mt-2 font-mono text-xs">Use o número que aparece depois do pagamento e o mesmo e-mail da compra.</p>
      <form onSubmit={send} className="mt-6 grid gap-2">
        <input name="numero" placeholder="MSH-XXXXXXXX" aria-label="Número do pedido" className="border border-[var(--line)] bg-transparent px-3 py-2.5" required />
        <input name="email" type="email" placeholder="E-mail" aria-label="E-mail" className="border border-[var(--line)] bg-transparent px-3 py-2.5" required />
        <button className="bg-[var(--ink)] px-3 py-3 text-xs font-bold uppercase text-[var(--bg)]">Consultar</button>
      </form>
      <p className="mt-3 font-mono text-xs text-[var(--rt)]">{msg}</p>
      {row && (
        <article className="mt-4 grid gap-2 border border-[var(--line)] p-4">
          <b>{row.numero}</b>
          <span className="font-mono text-xs">{ST[row.status] || row.status} · {Number(row.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          {row.rastreio ? <span className="font-mono text-xs">Rastreio: {row.rastreio}</span> : <span className="font-mono text-xs">Rastreio ainda não informado.</span>}
          {row.itens.map((i, n) => <div key={n} className="border-t border-[var(--line)] pt-2 text-sm">{i.quantidade}x {i.nome} · {i.tamanho} · {i.cor}</div>)}
        </article>
      )}
    </main>
  );
}
