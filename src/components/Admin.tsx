"use client";

import { FormEvent, useEffect, useState } from "react";

const ST: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento", pago: "Pago", em_processamento: "Em processamento",
  comprado_fornecedor: "Comprado no fornecedor", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado", expirado: "Expirado",
};
const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Item = { quantidade: number; nome: string; tamanho: string; cor: string; preco_unit: number; custo_unit?: number; link_fornecedor?: string };
type Pedido = {
  numero: string; status: string; criado_em: string; forma_pagamento: string; total: number; frete: number;
  cliente_nome: string; cliente_email: string; cliente_telefone: string; endereco: string; numero_endereco: string;
  cidade: string; uf: string; cep: string; rastreio?: string; observacoes?: string; pedido_itens?: Item[];
};

export function Admin() {
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Pedido[]>([]);
  const [err, setErr] = useState("");

  async function fetchRows(password: string, st: string) {
    const r = await fetch("/api/admin/pedidos" + (st ? `?status=${st}` : ""), { headers: { "x-admin-password": password } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.erro || "Erro"), { status: r.status });
    return j as Pedido[];
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("moshr-admin") || "";
    if (!saved) return;
    setPw(saved);
    fetchRows(saved, "").then((rows) => { setRows(rows); setOk(true); }).catch(() => sessionStorage.removeItem("moshr-admin"));
  }, []);

  async function enter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("pw") as string;
    setMsg("");
    try {
      const list = await fetchRows(password, "");
      sessionStorage.setItem("moshr-admin", password);
      setPw(password); setRows(list); setOk(true);
    } catch (x) {
      const err = x as Error & { status?: number };
      setMsg(err.status === 401 ? "SENHA INCORRETA." : err.message);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
        <b className="font-black tracking-[0.12em]">MOSHR · PEDIDOS</b>
        {ok && <button className="border border-[var(--line)] bg-transparent px-3 py-2 text-xs font-bold uppercase text-[var(--ink)]" onClick={() => { sessionStorage.removeItem("moshr-admin"); setOk(false); setPw(""); }}>Sair</button>}
      </header>
      <main className="mx-auto max-w-[960px] px-5 py-5">
        {!ok && <form onSubmit={enter} className="mx-auto mt-12 flex max-w-md gap-2">
          <input name="pw" type="password" placeholder="Senha do painel" autoComplete="current-password" aria-label="Senha" className="flex-1 border border-[var(--line)] bg-transparent px-3 py-2" />
          <button className="bg-[var(--ink)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]">Entrar</button>
        </form>}
        <p className="min-h-[1.3em] text-center font-mono text-xs text-[var(--rt)]">{msg}</p>
        {ok && <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select aria-label="Filtrar por status" value={status} onChange={async (e) => { const st = e.target.value; setStatus(st); try { setRows(await fetchRows(pw, st)); } catch (x) { setErr((x as Error).message); } }} className="border border-[var(--line)] bg-transparent px-2 py-2">
              <option value="">Todos os status</option>
              {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="border border-[var(--line)] bg-transparent px-3 py-2 text-xs font-bold uppercase" onClick={async () => { try { setRows(await fetchRows(pw, status)); } catch (x) { setErr((x as Error).message); } }}>Atualizar</button>
            <span className="font-mono text-xs">{rows.length} PEDIDOS</span>
          </div>
          <p className="font-mono text-xs text-[var(--rt)]">{err}</p>
          {!rows.length && <p className="font-mono text-xs">NENHUM PEDIDO.</p>}
          {rows.map((p) => <Order key={p.numero} p={p} onSave={async (body) => {
            const r = await fetch("/api/admin/pedidos", { method: "PATCH", headers: { "x-admin-password": pw, "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.erro || "Erro");
            setRows(await fetchRows(pw, status));
          }} />)}
        </>}
      </main>
    </div>
  );
}

function Order({ p, onSave }: { p: Pedido; onSave: (b: Record<string, string>) => Promise<void> }) {
  const itens = p.pedido_itens || [];
  const lucro = itens.reduce((a, i) => a + (Number(i.preco_unit) - Number(i.custo_unit || 0)) * i.quantidade, 0);
  const semCusto = itens.some((i) => !i.custo_unit);
  let tel = String(p.cliente_telefone || "").replace(/\D/g, "");
  if (tel && !tel.startsWith("55")) tel = "55" + tel;
  const [note, setNote] = useState("");
  return (
    <article className="mb-3.5 grid gap-2.5 border border-[var(--line)] p-3.5">
      <div className="flex flex-wrap justify-between gap-2">
        <div><b>{p.numero}</b> <span className={`border px-2 font-mono text-xs ${p.status === "pago" ? "border-[var(--ok)] text-[var(--ok)]" : "border-[var(--line)]"}`}>{ST[p.status] || p.status}</span><br /><span className="font-mono text-xs">{new Date(p.criado_em).toLocaleString("pt-BR")} · {p.forma_pagamento === "pix" ? "Pix" : "Cartão/Mercado Pago"}</span></div>
        <div className="text-right"><b>{brl(p.total)}</b><br /><span className="font-mono text-xs">frete {brl(p.frete)}</span></div>
      </div>
      <div><b>{p.cliente_nome}</b> · <a href={`mailto:${p.cliente_email}`}>{p.cliente_email}</a>{tel.length >= 12 ? <> · <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></> : null}<br /><span className="font-mono text-xs">{p.endereco}, {p.numero_endereco} · {p.cidade}/{p.uf} · CEP {p.cep} · tel {p.cliente_telefone}</span></div>
      {itens.map((i, n) => <div key={n} className="grid grid-cols-[1fr_auto] gap-1 border-t border-[var(--line)] pt-2"><div>{i.quantidade}x <b>{i.nome}</b> · {i.tamanho} · {i.cor}<br /><span className="font-mono text-xs">venda {brl(i.preco_unit)} · custo {i.custo_unit ? brl(i.custo_unit) : "não informado"}</span></div><div>{/^https:\/\//.test(i.link_fornecedor || "") ? <a href={i.link_fornecedor} target="_blank" rel="noopener noreferrer">Comprar na AliExpress ↗</a> : <span className="font-mono text-xs">sem link</span>}</div></div>)}
      <div className="font-mono text-xs">Lucro estimado: {brl(lucro)}{semCusto ? " (faltam custos)" : ""} — antes das taxas do Mercado Pago.</div>
      <form className="grid gap-2 md:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setNote("Salvando…");
        try { await onSave({ numero: p.numero, status: String(f.get("status")), rastreio: String(f.get("rastreio")), observacoes: String(f.get("observacoes")) }); setNote("Salvo."); }
        catch (x) { setNote((x as Error).message); }
      }}>
        <select name="status" defaultValue={p.status} aria-label="Status" className="border border-[var(--line)] bg-transparent px-2 py-2">{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input name="rastreio" defaultValue={p.rastreio || ""} placeholder="Código de rastreio" aria-label="Rastreio" className="border border-[var(--line)] bg-transparent px-2 py-2" />
        <textarea name="observacoes" defaultValue={p.observacoes || ""} placeholder="Observações" aria-label="Observações" className="min-h-14 border border-[var(--line)] bg-transparent px-2 py-2 md:col-span-2" />
        <div className="md:col-span-2"><button className="bg-[var(--ink)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]">Salvar</button> <span className="font-mono text-xs text-[var(--rt)]">{note}</span></div>
      </form>
    </article>
  );
}
