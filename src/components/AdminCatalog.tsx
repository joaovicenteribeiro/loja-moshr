"use client";

import { FormEvent, useEffect, useState } from "react";

const CATS = [["grunge", "Grunge"], ["goth", "Goth"], ["punk", "Punk"], ["emo", "Emo / Scene"], ["cyber", "Cyber / Y2K"], ["street", "Alt Streetwear"]];
const TIPOS = [["camisas", "Camisas"], ["camisetas", "Camisetas"], ["casacos", "Jaquetas / Moletons"], ["calcas", "Calças"], ["calcados", "Calçados"], ["acessorios", "Acessórios"]];
const field = "border border-[var(--line)] bg-transparent px-2 py-2";

export type Peca = {
  id: number; nome: string; categoria: string; tipo: string; preco: number; promo?: number; custo?: number | null;
  tamanhos: string[]; cores: string[]; imagem?: string; descricao?: string; medidas?: string; aliexpress?: string | null;
  estoque?: number | null; ativo?: boolean;
};

async function api(pw: string, path: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, headers: { "x-admin-password": pw, ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Erro");
  return j;
}

export function Pecas({ pw }: { pw: string }) {
  const [rows, setRows] = useState<Peca[]>([]);
  const [edit, setEdit] = useState<Peca | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setRows(await api(pw, "/api/admin/produtos"));
  }
  useEffect(() => { load().catch((e) => setMsg((e as Error).message)); }, [pw]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs">{rows.length} PEÇAS</span>
        <button className="bg-[var(--ink)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]" onClick={() => setEdit({ id: 0, nome: "", categoria: "grunge", tipo: "camisetas", preco: 0, tamanhos: ["P", "M", "G"], cores: ["Preto"], ativo: true, estoque: null })}>Nova peça</button>
      </div>
      <p className="font-mono text-xs text-[var(--rt)]">{msg}</p>
      {edit && <PecaForm pw={pw} peca={edit} onClose={() => setEdit(null)} onSaved={async (m) => { setMsg(m); setEdit(null); await load(); }} />}
      {rows.map((p) => (
        <article key={p.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 border border-[var(--line)] p-3">
          {p.imagem ? <img src={p.imagem} alt="" className="h-20 w-[72px] object-cover" /> : <div className="h-20 bg-[var(--ph1)]" />}
          <div>
            <b>{p.nome}</b> {p.ativo === false ? <span className="font-mono text-xs">OCULTA</span> : null}
            <br /><span className="font-mono text-xs">{p.tipo} · {p.categoria} · R$ {p.preco} · estoque {p.estoque == null ? "livre" : p.estoque}</span>
          </div>
          <div className="flex gap-2">
            <button className="border border-[var(--line)] bg-transparent px-2 py-2 text-xs font-bold uppercase" onClick={() => setEdit(p)}>Editar</button>
            <button className="border border-[var(--line)] bg-transparent px-2 py-2 text-xs font-bold uppercase" onClick={async () => {
              if (!confirm(`Remover ${p.nome}?`)) return;
              try { await api(pw, "/api/admin/produtos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }); await load(); }
              catch (e) { setMsg((e as Error).message); }
            }}>Remover</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function PecaForm({ pw, peca, onClose, onSaved }: { pw: string; peca: Peca; onClose: () => void; onSaved: (m: string) => void }) {
  const [imagem, setImagem] = useState(peca.imagem || "");
  const [err, setErr] = useState("");

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      id: peca.id || undefined,
      nome: f.get("nome"), categoria: f.get("categoria"), tipo: f.get("tipo"),
      preco: f.get("preco"), promo: f.get("promo"), custo: f.get("custo"), estoque: f.get("estoque"),
      tamanhos: f.get("tamanhos"), cores: f.get("cores"), descricao: f.get("descricao"), medidas: f.get("medidas"),
      aliexpress: f.get("aliexpress"), imagem, ativo: f.get("ativo") === "on",
    };
    setErr("Salvando…");
    try {
      await api(pw, "/api/admin/produtos", { method: peca.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      onSaved("Peça salva. Atualize a loja para ver na vitrine.");
    } catch (x) { setErr((x as Error).message); }
  }

  return (
    <form onSubmit={send} className="grid gap-2 border border-[var(--line)] p-3 md:grid-cols-2">
      <input name="nome" required defaultValue={peca.nome} placeholder="Nome" aria-label="Nome" className={field} />
      <select name="categoria" defaultValue={peca.categoria} aria-label="Estilo" className={field}>{CATS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select name="tipo" defaultValue={peca.tipo} aria-label="Tipo" className={field}>{TIPOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input name="preco" required type="number" min="1" step="0.01" defaultValue={peca.preco || ""} placeholder="Preço" aria-label="Preço" className={field} />
      <input name="promo" type="number" min="0" step="0.01" defaultValue={peca.promo || ""} placeholder="Preço promocional (opcional)" aria-label="Promoção" className={field} />
      <input name="custo" type="number" min="0" step="0.01" defaultValue={peca.custo || ""} placeholder="Custo (só você vê)" aria-label="Custo" className={field} />
      <input name="estoque" type="number" min="0" step="1" defaultValue={peca.estoque ?? ""} placeholder="Estoque (vazio = sem limite)" aria-label="Estoque" className={field} />
      <input name="tamanhos" required defaultValue={peca.tamanhos.join(", ")} placeholder="Tamanhos: P, M, G" aria-label="Tamanhos" className={field} />
      <input name="cores" required defaultValue={peca.cores.join(", ")} placeholder="Cores: Preto, Branco" aria-label="Cores" className={field} />
      <input name="medidas" defaultValue={peca.medidas || ""} placeholder="Medidas" aria-label="Medidas" className={`${field} md:col-span-2`} />
      <textarea name="descricao" defaultValue={peca.descricao || ""} placeholder="Descrição" aria-label="Descrição" className={`${field} min-h-20 md:col-span-2`} />
      <input name="aliexpress" defaultValue={peca.aliexpress || ""} placeholder="Link do fornecedor (https://…)" aria-label="Fornecedor" className={`${field} md:col-span-2`} />
      <label className="text-xs font-bold uppercase">Foto
        <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const body = new FormData();
          body.set("file", file);
          setErr("Enviando foto…");
          try { const j = await api(pw, "/api/admin/upload", { method: "POST", body }); setImagem(j.imagem); setErr("Foto enviada."); }
          catch (x) { setErr((x as Error).message); }
        }} />
      </label>
      <input value={imagem} onChange={(e) => setImagem(e.target.value)} placeholder="ou cole a URL da imagem" aria-label="Imagem" className={field} />
      <label className="flex items-center gap-2 text-sm"><input name="ativo" type="checkbox" defaultChecked={peca.ativo !== false} /> Visível na loja</label>
      <div className="flex gap-2 md:col-span-2">
        <button className="bg-[var(--ink)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]">Salvar peça</button>
        <button type="button" className="border border-[var(--line)] bg-transparent px-3 py-2 text-xs font-bold uppercase" onClick={onClose}>Cancelar</button>
        <span className="font-mono text-xs text-[var(--rt)]">{err}</span>
      </div>
    </form>
  );
}

type Loja = { email?: string; instagram?: string; whatsapp?: string; vendedor?: { nome?: string; documento?: string; endereco?: string } };

export function LojaForm({ pw }: { pw: string }) {
  const [loja, setLoja] = useState<Loja | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api(pw, "/api/admin/loja").then(setLoja).catch((e) => setMsg((e as Error).message)); }, [pw]);
  if (!loja) return <p className="font-mono text-xs">{msg || "Carregando…"}</p>;
  return (
    <form className="grid max-w-xl gap-2" onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      setMsg("Salvando…");
      try {
        const saved = await api(pw, "/api/admin/loja", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          email: f.get("email"), instagram: f.get("instagram"), whatsapp: f.get("whatsapp"),
          vendedor: { nome: f.get("nome"), documento: f.get("documento"), endereco: f.get("endereco") },
        }) });
        setLoja(saved);
        setMsg("Dados da loja salvos.");
      } catch (x) { setMsg((x as Error).message); }
    }}>
      <p className="font-mono text-xs">WhatsApp, e-mail e dados do vendedor aparecem no rodapé e nas páginas legais. O CPF/CNPJ é exigido para vender.</p>
      <input name="email" type="email" defaultValue={loja.email || ""} placeholder="E-mail" aria-label="E-mail" className={field} />
      <input name="instagram" defaultValue={loja.instagram || ""} placeholder="Instagram (sem @)" aria-label="Instagram" className={field} />
      <input name="whatsapp" defaultValue={loja.whatsapp || ""} placeholder="WhatsApp com DDD" aria-label="WhatsApp" className={field} />
      <input name="nome" defaultValue={loja.vendedor?.nome || ""} placeholder="Nome do vendedor" aria-label="Nome do vendedor" className={field} />
      <input name="documento" defaultValue={loja.vendedor?.documento || ""} placeholder="CPF ou CNPJ" aria-label="Documento" className={field} />
      <input name="endereco" defaultValue={loja.vendedor?.endereco || ""} placeholder="Endereço do vendedor" aria-label="Endereço" className={field} />
      <button className="bg-[var(--ink)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]">Salvar loja</button>
      <p className="font-mono text-xs text-[var(--rt)]">{msg}</p>
    </form>
  );
}
