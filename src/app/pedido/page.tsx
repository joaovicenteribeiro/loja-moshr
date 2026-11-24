"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const ST: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento", pago: "Pago", em_processamento: "Em processamento",
  comprado_fornecedor: "Em separação", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado", expirado: "Expirado",
};

type Pedido = { numero: string; status: string; total: number; rastreio?: string | null; itens: { quantidade: number; nome: string; tamanho: string; cor: string }[] };

function PedidoPage() {
  const params = useSearchParams();
  const [msg, setMsg] = useState("");
  const [row, setRow] = useState<Pedido | null>(null);
  const pago = params.get("pago") === "1";

  useEffect(() => {
    const numero = params.get("numero") || "";
    const email = params.get("email") || "";
    if (!numero || !email) return;
    const q = new URLSearchParams({ numero, email });
    fetch("/api/pedido?" + q).then((r) => r.json()).then((j) => {
      if (j.numero) setRow(j);
    }).catch(() => {});
  }, [params]);

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
      {pago && <p className="mt-6 border border-[var(--ok)] px-3 py-2 font-mono text-xs text-[var(--ok)]">PAGAMENTO REALIZADO. PEDIDO {params.get("numero")}.</p>}
      <h1 className="mt-6 text-3xl font-black uppercase">Acompanhar pedido</h1>
      <p className="mt-2 font-mono text-xs">Use o número que aparece depois do pagamento e o mesmo e-mail da compra.</p>
      <form onSubmit={send} className="mt-6 grid gap-2">
        <input name="numero" defaultValue={params.get("numero") || ""} placeholder="MSH-XXXXXXXX" aria-label="Número do pedido" className="border border-[var(--line)] bg-transparent px-3 py-2.5" required />
        <input name="email" type="email" defaultValue={params.get("email") || ""} placeholder="E-mail" aria-label="E-mail" className="border border-[var(--line)] bg-transparent px-3 py-2.5" required />
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

export default function Page() {
  return <Suspense fallback={null}><PedidoPage /></Suspense>;
}
