"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import type { LojaInfo, PublicProduct } from "@/server/public";

const C: Record<string, string> = { grunge: "Grunge", goth: "Goth", punk: "Punk", emo: "Emo / Scene", cyber: "Cyber / Y2K", street: "Alt Streetwear" };
const TL: Record<string, string> = { camisas: "Camisas", camisetas: "Camisetas", casacos: "Jaquetas / Moletons", calcas: "Calças", calcados: "Calçados", acessorios: "Acessórios" };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const priceOf = (p: PublicProduct) => p.d || p.p;
const avail = (p: PublicProduct, s: string, k: string) => (p.id * 31 + s.charCodeAt(0) + k.charCodeAt(0)) % 6 !== 0;

type CartItem = { id: number; s: string; k: string; q: number };
type Pix = { id: string; numero: string; qr: string; qrBase64: string; total: number };
type View = "home" | "loja" | "produto" | "legal";

const btn = "inline-block bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)] px-6 py-3.5 no-underline uppercase font-bold text-sm tracking-wider hover:bg-[var(--red)] hover:border-[var(--red)] hover:text-white";
const chip = "border border-[var(--line)] bg-transparent px-3 py-1.5 uppercase text-xs font-bold tracking-wide disabled:opacity-35 disabled:line-through disabled:cursor-not-allowed aria-pressed:bg-[var(--ink)] aria-pressed:text-[var(--bg)]";

function Ph({ p, img }: { p: PublicProduct; img?: string }) {
  const src = img || p.img;
  if (src) return <div className="aspect-[4/5] overflow-hidden bg-[var(--ph1)]"><img src={src} alt={p.n} className="h-full w-full object-cover" /></div>;
  return (
    <div className={`relative flex aspect-[4/5] flex-col justify-between p-3 ${p.id % 2 ? "bg-[var(--ph1)]" : "bg-[var(--ph2)]"}`}>
      <span className="font-mono text-xs">MSH-{String(p.id).padStart(3, "0")}</span>
      <b className="text-2xl font-black uppercase leading-none">{p.t}</b>
      <i className="absolute right-3 top-3 h-2.5 w-2.5 bg-[var(--red)]" />
    </div>
  );
}

function Card({ p }: { p: PublicProduct }) {
  return (
    <Link href={`/produto/${p.id}`} className="block border-b border-r border-[var(--line)] no-underline">
      <Ph p={p} />
      <div className="grid gap-1.5 p-3">
        <span className="font-mono text-xs">{C[p.c] || p.c}</span>
        <h3 className="text-base font-black uppercase leading-tight">{p.n}</h3>
        <span className="font-mono text-xs">{p.d ? <><s className="opacity-55">{brl(p.p)}</s> <b className="text-[var(--rt)]">{brl(p.d)}</b></> : brl(p.p)}</span>
      </div>
    </Link>
  );
}

function contacts(loja: LojaInfo) {
  const zap = String(loja.whatsapp || "").replace(/\D/g, "");
  return [
    loja.email ? <a key="e" href={`mailto:${loja.email}`}>{loja.email}</a> : null,
    loja.instagram ? <a key="i" href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener">@{loja.instagram}</a> : null,
    zap ? <a key="w" href={`https://wa.me/${zap}`} target="_blank" rel="noopener">WhatsApp</a> : null,
  ].filter(Boolean);
}

function vendor(loja: LojaInfo) {
  const v = loja.vendedor || {};
  return v.nome ? [v.nome, v.documento, v.endereco].filter(Boolean).join(", ") : "";
}

function LegalBody({ slug, loja }: { slug: string; loja: LojaInfo }) {
  const c = contacts(loja);
  const v = vendor(loja);
  const h = (t: string) => <h3 className="mb-2 mt-7 text-lg font-black uppercase">{t}</h3>;
  if (slug === "troca") return <>
    <p>Estas regras seguem o Código de Defesa do Consumidor. Se algo não ficar claro, fale com a gente: {c}</p>
    {h("Arrependimento (7 dias)")}<p>Você pode desistir da compra em até <b>7 dias corridos</b> a partir do recebimento do produto, sem precisar explicar o motivo.</p>
    {h("Como pedir")}<p>Envie uma mensagem com o número do pedido (começa com MSH-) e o seu nome. A peça deve estar sem uso, limpa e na embalagem.</p>
    {h("Defeito")}<p>Avise em até <b>30 dias</b> do recebimento, com fotos.</p>
    {h("Contato")}<p>{c}</p>
  </>;
  if (slug === "privacidade") return <>
    <p>Explicamos aqui como tratamos os seus dados, conforme a LGPD.</p>
    {h("Quais dados coletamos")}<p>Nome, e-mail, telefone, CEP, endereço e os itens do pedido. <b>Não guardamos dados de cartão</b>: o pagamento é feito no Mercado Pago.</p>
    {h("Para que usamos")}<p>Para processar o pagamento, enviar o produto, avisar sobre o pedido e cumprir obrigações legais.</p>
    {h("Com quem compartilhamos")}<p>Mercado Pago, fornecedores, transportadoras e a hospedagem do site. Não vendemos os seus dados.</p>
    {h("Armazenamento no navegador")}<p>Usamos o localStorage só para lembrar a sacola.</p>
  </>;
  if (slug === "termos") return <>
    {v ? <p>Loja operada por <b>{v}</b>.</p> : null}
    {h("Pedidos e pagamento")}<p>Aceitamos Pix, cartão de crédito (até 6x), débito e conta Mercado Pago. O pedido só é confirmado depois que o pagamento é aprovado. O Pix vale por 1 hora.</p>
    {h("Entrega")}<p>Prazo estimado de <b>10 a 20 dias úteis</b>. Frete R$ 24,90, grátis a partir de R$ 250.</p>
    {h("Trocas")}<p>Veja a página <Link href="/troca">Troca e devolução</Link>.</p>
  </>;
  return <><p>Fale com a gente pelos canais abaixo. Informe o número do pedido (MSH-…).</p><p className="text-lg">{c}</p>{v ? <p className="font-mono text-xs">{v}</p> : null}</>;
}

const LEGAL: Record<string, string> = { troca: "Troca e devolução", privacidade: "Política de privacidade", termos: "Termos de uso", contato: "Contato" };

function ShopInner({ products, loja, view, productId, legal }: { products: PublicProduct[]; loja: LojaInfo; view: View; productId?: string; legal?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const live = products.length > 0 && !products.some((p) => p.demo);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "co" | "pix" | "done">("cart");
  const [note, setNote] = useState("");
  const [pix, setPix] = useState<Pix | null>(null);
  const [pixMsg, setPixMsg] = useState("AGUARDANDO PAGAMENTO…");
  const [sel, setSel] = useState({ s: "", k: "", q: 1 });
  const [pm, setPm] = useState("");
  const [payErr, setPayErr] = useState("");
  const [paying, setPaying] = useState(false);
  const [nl, setNl] = useState("");
  const [banner, setBanner] = useState("");
  const [q, setQ] = useState(params.get("q") || "");
  const [size, setSize] = useState(params.get("size") || "");
  const [max, setMax] = useState(Number(params.get("max") || 0));
  const [sort, setSort] = useState(params.get("sort") || "novo");

  const tipo = view === "loja" ? (params.get("tipo") || "todos") : "todos";
  const cat = view === "loja" ? (params.get("cat") || "todas") : "todas";
  const product = products.find((p) => String(p.id) === productId);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("moshr-cart") || "[]")); } catch { /* vazio */ }
    const s = params.get("status") || params.get("collection_status");
    const m: Record<string, string> = {
      approved: "PAGAMENTO RECEBIDO. ESTAMOS CONFIRMANDO E ENVIAMOS O RASTREIO POR WHATSAPP.",
      pending: "PAGAMENTO PENDENTE. ASSIM QUE FOR CONFIRMADO, SEU PEDIDO SEGUE PARA ENVIO.",
      in_process: "PAGAMENTO EM ANÁLISE. AVISAMOS ASSIM QUE FOR CONCLUÍDO.",
    };
    if (s && m[s]) { setBanner(m[s]); setCart([]); localStorage.removeItem("moshr-cart"); }
    else if (s) setBanner("PAGAMENTO NÃO CONCLUÍDO. TENTE NOVAMENTE QUANDO QUISER.");
  }, [params]);

  useEffect(() => { localStorage.setItem("moshr-cart", JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    if (!product) return;
    setSel({ s: "", k: product.k[0] || "", q: 1 });
    setPm("");
  }, [product?.id]);

  useEffect(() => {
    if (!pix || step !== "pix") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/pix-status?id=" + encodeURIComponent(pix.id));
        const j = await r.json();
        if (j.paid) {
          clearInterval(t);
          setCart([]);
          setNote(`PAGAMENTO CONFIRMADO! PEDIDO ${pix.numero}. AVISAMOS PELO WHATSAPP QUANDO O PRODUTO FOR ENVIADO.`);
          setPix(null);
          setStep("done");
        } else if (j.final) setPixMsg("PIX EXPIRADO OU CANCELADO. FAÇA UM NOVO PEDIDO.");
      } catch { /* tenta de novo */ }
    }, 4000);
    return () => clearInterval(t);
  }, [pix, step]);

  const count = cart.reduce((a, i) => a + i.q, 0);
  const tipos = Object.keys(TL).filter((k) => products.some((p) => p.g === k));
  const totals = useMemo(() => {
    const s = cart.reduce((a, i) => { const p = products.find((x) => x.id === i.id); return a + (p ? priceOf(p) * i.q : 0); }, 0);
    const f = !s || s >= 250 ? 0 : 24.9;
    return { s, f, t: s + f };
  }, [cart, products]);

  function setQty(i: number, d: number) {
    setCart((list) => list.flatMap((item, idx) => {
      if (idx !== i) return [item];
      const qn = item.q + d;
      if (qn < 1) return [];
      return [{ ...item, q: Math.min(10, qn) }];
    }));
  }

  async function pay(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>;
    const er = (m: string) => { setPayErr(m); return; };
    if ((v.nome || "").trim().length < 3) return er("INFORME O NOME COMPLETO.");
    if (!/^\S+@\S+\.\S+$/.test(v.email)) return er("INFORME UM E-MAIL VÁLIDO.");
    if (v.zap.replace(/\D/g, "").length < 10) return er("INFORME O TELEFONE COM DDD.");
    if (v.cep.replace(/\D/g, "").length !== 8) return er("CEP COM 8 NÚMEROS.");
    if (!v.end.trim() || !v.num.trim() || !v.cid.trim() || v.uf.trim().length !== 2) return er("COMPLETE O ENDEREÇO, CIDADE E UF.");
    setPayErr("");
    setPaying(true);
    const body = JSON.stringify({ items: cart.map((i) => `${i.id}:${i.s}:${i.q}:${i.k}`).join(","), ...v });
    try {
      if (v.pg === "pix") {
        const r = await fetch("/api/pix", { method: "POST", headers: { "Content-Type": "application/json" }, body });
        const j = await r.json();
        if (!r.ok || !j.qr) throw j;
        setPix({ id: j.id, numero: j.numero, qr: j.qr, qrBase64: j.qrBase64, total: j.total });
        setStep("pix");
        setPixMsg("AGUARDANDO PAGAMENTO…");
      } else {
        const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body });
        const j = await r.json();
        if (!r.ok || !j.url) throw j;
        location.href = j.url;
      }
    } catch (j) {
      const err = j as { erro?: string };
      setPayErr(err?.erro || "NÃO FOI POSSÍVEL ABRIR O PAGAMENTO. TENTE NOVAMENTE.");
    } finally { setPaying(false); }
  }

  const list = products.filter((p) => (cat === "todas" || p.c === cat) && (tipo === "todos" || p.g === tipo) && (!size || p.s.includes(size)) && (!max || priceOf(p) <= max) && (p.n + (C[p.c] || "")).toLowerCase().includes(q.toLowerCase()));
  const order: Record<string, (a: PublicProduct, b: PublicProduct) => number> = {
    novo: (a, b) => b.id - a.id, pop: (a, b) => (a.id * 7 % 15) - (b.id * 7 % 15), asc: (a, b) => priceOf(a) - priceOf(b), desc: (a, b) => priceOf(b) - priceOf(a),
  };
  list.sort(order[sort] || order.novo);
  const sizes = [...new Set(products.flatMap((p) => p.s))];
  const title = [tipo !== "todos" ? TL[tipo] : "", cat !== "todas" ? C[cat] : ""].filter(Boolean).join(" · ") || "Todos os produtos";
  const zap = String(loja.whatsapp || "").replace(/\D/g, "");

  return (
    <>
      {!live && <div className="bg-[var(--red)] px-3 py-1.5 text-center font-mono text-xs text-white">AMBIENTE DE DEMONSTRAÇÃO · PRODUTOS E PREÇOS FICTÍCIOS · NENHUMA COBRANÇA REAL</div>}
      {banner && <div className="bg-[var(--ink)] px-3 py-1.5 text-center font-mono text-xs text-[var(--bg)]">{banner}</div>}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]">
        <div className="mx-auto grid h-16 max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center px-5">
          <span />
          <Link href="/" className="text-3xl font-black tracking-[0.12em] no-underline" aria-label="MOSHR, página inicial">MOSHR</Link>
          <div className="flex justify-end gap-4">
            <button className="bg-transparent uppercase text-xs font-bold tracking-wider" onClick={() => router.push("/loja")}>Busca</button>
            <button className="bg-transparent uppercase text-xs font-bold tracking-wider" onClick={() => { setStep(step === "done" ? "cart" : step); setOpen(true); }}>Sacola ({count})</button>
          </div>
        </div>
        <nav className="flex gap-5 overflow-x-auto border-t border-[var(--line)] px-5 py-2.5 text-xs font-medium uppercase tracking-wider">
          <Link href="/" aria-current={view === "home" ? "page" : undefined} className="whitespace-nowrap no-underline aria-[current=page]:text-[var(--rt)]">Início</Link>
          <Link href="/loja" className="whitespace-nowrap no-underline aria-[current=page]:text-[var(--rt)]" aria-current={view === "loja" && tipo === "todos" && cat === "todas" ? "page" : undefined}>Tudo</Link>
          <span className="font-mono opacity-50">PEÇAS</span>
          {tipos.map((k) => <Link key={k} href={`/loja?tipo=${k}`} className="whitespace-nowrap no-underline">{TL[k]}</Link>)}
          <span className="font-mono opacity-50">ESTILOS</span>
          {Object.entries(C).map(([k, v]) => <Link key={k} href={`/loja?cat=${k}`} className="whitespace-nowrap no-underline">{v}</Link>)}
        </nav>
      </header>
      <main>
        {view === "home" && <>
          <section className="grid border-b border-[var(--line)] md:grid-cols-[1.5fr_1fr]">
            <div className="px-5 py-9 md:py-14">
              <span className="font-mono text-xs">COLEÇÃO 01 / DEMO</span>
              <h1 className="my-4 text-6xl font-black uppercase leading-none md:text-8xl">Wear your<br />own<br /><span className="text-[var(--rt)]">identity.</span></h1>
              <Link href="/loja" className={btn}>Ver coleção →</Link>
            </div>
            <div className="flex flex-col justify-between gap-10 bg-[var(--ink)] p-8 text-[var(--bg)]">
              <p className="font-mono text-xs">MOSHR — MODA ALTERNATIVA INDEPENDENTE. GRUNGE, GOTH, PUNK, EMO, CYBER E STREETWEAR.</p>
              <p className="text-6xl font-black leading-none text-[var(--ag)]">{products.length}<br />{products.length === 1 ? "PEÇA" : "PEÇAS"}</p>
              <p className="font-mono text-xs">ENVIO PARA TODO O BRASIL · PIX E CARTÃO</p>
            </div>
          </section>
          <section className="border-b border-[var(--line)] py-14">
            <div className="mx-auto max-w-[1240px] px-5">
              <h2 className="mb-6 text-4xl font-black uppercase">Peças</h2>
              {tipos.map((k, i) => <Link key={k} href={`/loja?tipo=${k}`} className="grid grid-cols-[60px_1fr_auto] items-center gap-3 border-t border-[var(--line)] py-4 text-2xl font-bold uppercase no-underline last:border-b hover:pl-2 hover:text-[var(--rt)]"><span className="font-mono text-xs">0{i + 1}</span><span>{TL[k]}</span><span>→</span></Link>)}
            </div>
          </section>
          <section className="border-b border-[var(--line)] py-14">
            <div className="mx-auto max-w-[1240px] px-5">
              <div className="mb-6 flex items-end justify-between"><h2 className="text-4xl font-black uppercase">Subculturas</h2></div>
              {Object.entries(C).map(([k, v], i) => <Link key={k} href={`/loja?cat=${k}`} className="grid grid-cols-[60px_1fr_auto] items-center gap-3 border-t border-[var(--line)] py-4 text-2xl font-bold uppercase no-underline last:border-b hover:pl-2 hover:text-[var(--rt)]"><span className="font-mono text-xs">0{i + 1}</span><span>{v}</span><span>→</span></Link>)}
            </div>
          </section>
          <section className="border-b border-[var(--line)] py-14">
            <div className="mx-auto max-w-[1240px] px-5">
              <div className="mb-6 flex items-end justify-between"><h2 className="text-4xl font-black uppercase">Novidades</h2><Link href="/loja" className="font-mono text-xs no-underline">VER TUDO →</Link></div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] border-l border-t border-[var(--line)]">{products.slice(-4).reverse().map((p) => <Card key={p.id} p={p} />)}</div>
            </div>
          </section>
          <section className="bg-[var(--ink)] py-16 text-[var(--bg)]">
            <div className="mx-auto max-w-[1240px] px-5">
              <span className="font-mono text-xs">MANIFESTO</span>
              <p className="mt-3 max-w-[30ch] text-3xl font-medium leading-tight">Não seguimos tendência. Vestimos quem prefere o barulho.</p>
              <Link href="/loja" className="mt-5 inline-block border border-[var(--bg)] px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-[var(--bg)] no-underline hover:bg-[var(--red)] hover:border-[var(--red)]">Entrar →</Link>
            </div>
          </section>
          <section className="border-b border-[var(--line)] py-14">
            <div className="mx-auto max-w-[1240px] px-5">
              <h2 className="mb-6 text-4xl font-black uppercase">Newsletter</h2>
              <form className="flex max-w-md" onSubmit={(e) => { e.preventDefault(); setNl("CADASTRO DE TESTE REGISTRADO (DEMONSTRAÇÃO)."); }}>
                <input required type="email" placeholder="SEU E-MAIL" aria-label="E-mail" className="min-w-0 flex-1 border border-[var(--line)] bg-transparent px-3 py-3" />
                <button className={btn}>Entrar</button>
              </form>
              <p className="mt-2 min-h-[1.4em] font-mono text-xs text-[var(--rt)]">{nl}</p>
            </div>
          </section>
        </>}
        {view === "loja" && (
          <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-9">
            <div className="mb-6 flex items-end justify-between"><h2 className="text-4xl font-black uppercase">{title}</h2><span className="font-mono text-xs">{list.length} ITENS</span></div>
            <p className="mb-1.5 font-mono text-xs">TIPO DE PEÇA</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button className={chip} aria-pressed={tipo === "todos"} onClick={() => router.push("/loja")}>Todos</button>
              {Object.keys(TL).map((k) => <button key={k} className={chip} disabled={!products.some((p) => p.g === k)} aria-pressed={tipo === k} onClick={() => router.push(`/loja?tipo=${k}`)}>{TL[k]}</button>)}
            </div>
            <p className="mb-1.5 font-mono text-xs">ESTILO</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button className={chip} aria-pressed={cat === "todas"} onClick={() => router.push("/loja")}>Todas</button>
              {Object.entries(C).map(([k, v]) => <button key={k} className={chip} aria-pressed={cat === k} onClick={() => router.push(`/loja?cat=${k}`)}>{v}</button>)}
            </div>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="BUSCAR PRODUTO" aria-label="Buscar" className="min-w-40 flex-1 border border-[var(--line)] bg-transparent px-3 py-2" />
              <select aria-label="Tamanho" value={size} onChange={(e) => setSize(e.target.value)} className="border border-[var(--line)] bg-transparent px-3 py-2"><option value="">Tamanho: todos</option>{sizes.map((s) => <option key={s}>{s}</option>)}</select>
              <select aria-label="Preço" value={max} onChange={(e) => setMax(Number(e.target.value))} className="border border-[var(--line)] bg-transparent px-3 py-2"><option value={0}>Preço: todos</option><option value={100}>até R$ 100</option><option value={200}>até R$ 200</option><option value={300}>até R$ 300</option></select>
              <select aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value)} className="border border-[var(--line)] bg-transparent px-3 py-2"><option value="novo">Novidades</option><option value="pop">Popularidade</option><option value="asc">Menor preço</option><option value="desc">Maior preço</option></select>
            </div>
            {list.length ? <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] border-l border-t border-[var(--line)]">{list.map((p) => <Card key={p.id} p={p} />)}</div> : <p className="py-12 font-mono text-xs">NENHUM PRODUTO ENCONTRADO. LIMPE OS FILTROS.</p>}
          </div>
        )}
        {view === "produto" && (product ? (
          <div className="mx-auto max-w-[1240px] px-5">
            <div className="grid gap-10 py-10 md:grid-cols-[1.2fr_1fr]">
              <Ph p={product} img={product.imgs?.[sel.k]} />
              <div className="grid content-start gap-4">
                <span className="font-mono text-xs">{TL[product.g] ? `${TL[product.g]} · ` : ""}{C[product.c] || product.c} · MSH-{String(product.id).padStart(3, "0")}</span>
                <h1 className="text-4xl font-black uppercase">{product.n}</h1>
                <div className="font-mono">{product.d ? <><s className="opacity-55">{brl(product.p)}</s> <b className="text-[var(--rt)]">{brl(product.d)}</b></> : brl(product.p)}</div>
                <p>{product.desc || "Peça de demonstração da coleção 01. Descrição fictícia para teste de layout."}</p>
                <div><p className="mb-2 text-xs font-bold uppercase tracking-wider">Cor: {sel.k}</p><div className="flex flex-wrap gap-1.5">{product.k.map((k) => <button key={k} className={chip} aria-pressed={sel.k === k} onClick={() => setSel({ ...sel, k, s: "" })}>{k}</button>)}</div></div>
                <div><p className="mb-2 text-xs font-bold uppercase tracking-wider">Tamanho</p><div className="flex flex-wrap gap-1.5">{product.s.map((s) => <button key={s} className={chip} disabled={!avail(product, s, sel.k)} aria-pressed={sel.s === s} onClick={() => setSel({ ...sel, s })}>{s}</button>)}</div></div>
                <div><p className="mb-2 text-xs font-bold uppercase tracking-wider">Quantidade</p><div className="inline-flex border border-[var(--line)]"><button className="h-9 w-9 bg-transparent" aria-label="Diminuir" onClick={() => setSel({ ...sel, q: Math.max(1, sel.q - 1) })}>−</button><span className="w-9 text-center leading-9">{sel.q}</span><button className="h-9 w-9 bg-transparent" aria-label="Aumentar" onClick={() => setSel({ ...sel, q: Math.min(10, sel.q + 1) })}>+</button></div></div>
                <button className={btn} onClick={() => {
                  if (!sel.s) { setPm("ESCOLHA UM TAMANHO."); return; }
                  setCart((list) => {
                    const f = list.find((i) => i.id === product.id && i.s === sel.s && i.k === sel.k);
                    if (f) return list.map((i) => i === f ? { ...i, q: Math.min(10, i.q + sel.q) } : i);
                    return [...list, { id: product.id, s: sel.s, k: sel.k, q: sel.q }];
                  });
                  setStep("cart"); setOpen(true);
                }}>Adicionar à sacola</button>
                <p className="min-h-[1.4em] font-mono text-xs text-[var(--rt)]">{pm}</p>
                <div className="grid gap-1.5 border-t border-[var(--line)] pt-3 font-mono text-sm">
                  <span>MEDIDAS: {live ? (product.med || "SOB CONSULTA") : "P 50×68 cm · M 52×70 · G 55×72 · GG 58×74 (demo)"}</span>
                  <span>ENTREGA: 10 A 20 DIAS ÚTEIS COM RASTREIO</span>
                  <span>FRETE R$ 24,90 · GRÁTIS ACIMA DE R$ 250</span>
                  <span>TROCA EM ATÉ 7 DIAS APÓS O RECEBIMENTO</span>
                </div>
              </div>
            </div>
            <h2 className="mb-4 text-2xl font-black uppercase">Veja também</h2>
            <div className="mb-16 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] border-l border-t border-[var(--line)]">
              {products.filter((x) => x.c === product.c && x.id !== product.id).concat(products.filter((x) => x.c !== product.c)).slice(0, 4).map((p) => <Card key={p.id} p={p} />)}
            </div>
          </div>
        ) : <div className="mx-auto max-w-[1240px] px-5 py-16"><h2 className="text-3xl font-black uppercase">Produto não encontrado</h2><Link href="/loja" className="mt-4 inline-block">Voltar à coleção</Link></div>)}
        {view === "legal" && legal && LEGAL[legal] && (
          <div className="mx-auto max-w-[760px] px-5 py-10">
            <span className="font-mono text-xs">INFORMAÇÕES</span>
            <h1 className="my-2 text-5xl font-black uppercase">{LEGAL[legal]}</h1>
            <LegalBody slug={legal} loja={loja} />
          </div>
        )}
      </main>
      <footer className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-5 px-5 py-9 font-mono text-xs">
        <span>© MOSHR — WEAR YOUR OWN IDENTITY.</span>
        <span>{contacts(loja)}</span>
        <span><Link href="/troca">Troca e devolução</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos</Link> · <Link href="/contato">Contato</Link></span>
        {vendor(loja) ? <span>{vendor(loja)}</span> : null}
        {!live && <span>DEMO · NÃO É UMA OFERTA REAL</span>}
      </footer>
      {zap && <a className="fixed bottom-4 right-4 z-10 border border-[var(--ink)] bg-[var(--ink)] px-4 py-3 font-mono text-xs font-bold tracking-wider text-[var(--bg)] no-underline hover:border-[var(--red)] hover:bg-[var(--red)]" href={`https://wa.me/${zap}`} target="_blank" rel="noopener">WHATSAPP</a>}
      {open && <button className="fixed inset-0 z-40 bg-black/60" aria-label="Fechar sacola" onClick={() => setOpen(false)} />}
      <aside className={`fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[440px] flex-col overflow-auto border-l border-[var(--line)] bg-[var(--bg)] p-5 transition-transform ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`} aria-hidden={!open} aria-label="Sacola">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-black uppercase">{step === "co" ? "Finalizar" : step === "pix" ? "Pagamento Pix" : "Sacola"}</h2><button className="bg-transparent uppercase text-xs font-bold" onClick={() => setOpen(false)}>Fechar ×</button></div>
        {step === "pix" && pix ? <>
          <p className="font-mono text-xs">PEDIDO {pix.numero} · TOTAL {brl(pix.total)}</p>
          <img alt="QR Code Pix" className="mx-auto my-2 block w-full max-w-[260px] border border-[var(--line)] bg-white" src={`data:image/png;base64,${pix.qrBase64}`} />
          <p className="font-mono text-xs">ESCANEIE NO APP DE QUALQUER BANCO OU USE O PIX COPIA E COLA.</p>
          <input readOnly value={pix.qr} aria-label="Código Pix copia e cola" className="my-2 w-full border border-[var(--line)] bg-transparent p-2 font-mono text-[0.7rem]" />
          <button className={btn} onClick={() => { navigator.clipboard?.writeText(pix.qr).then(() => setPixMsg("CÓDIGO COPIADO. COLE NO PIX COPIA E COLA DO SEU BANCO.")).catch(() => {}); }}>Copiar código Pix</button>
          <p className="mt-2 font-mono text-xs text-[var(--rt)]">{pixMsg}</p>
        </> : step === "done" ? <p className="font-mono text-xs">{note}</p> : !cart.length ? <>
          <p className="font-mono text-xs">SUA SACOLA ESTÁ VAZIA.</p>
          <Link href="/loja" className={`${btn} mt-3`} onClick={() => setOpen(false)}>Ver coleção</Link>
        </> : <>
          {cart.map((i, k) => {
            const p = products.find((z) => z.id === i.id);
            if (!p) return null;
            return <div key={`${i.id}-${i.s}-${i.k}`} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-t border-[var(--line)] py-3"><div className="text-[0.55rem]"><Ph p={p} /></div><div><b>{p.n}</b><br /><span className="font-mono text-xs">{i.k} · {i.s} · {brl(priceOf(p))}</span></div><div className="inline-flex border border-[var(--line)]"><button className="h-9 w-9 bg-transparent" aria-label="Diminuir" onClick={() => setQty(k, -1)}>−</button><span className="w-9 text-center leading-9">{i.q}</span><button className="h-9 w-9 bg-transparent" aria-label="Aumentar" onClick={() => setQty(k, 1)}>+</button></div></div>;
          })}
          <p className="mb-1 mt-3 font-mono text-xs">{totals.s >= 250 ? "VOCÊ GANHOU FRETE GRÁTIS" : `FALTAM ${brl(250 - totals.s)} PARA FRETE GRÁTIS`}</p>
          <div className="h-1 bg-[var(--line)]"><div className="h-1 bg-[var(--red)]" style={{ width: `${Math.min(100, totals.s / 2.5)}%` }} /></div>
          <div className="mt-auto grid gap-1 border-t border-[var(--line)] pt-3 font-mono text-xs">
            <div className="flex justify-between"><span>SUBTOTAL</span><span>{brl(totals.s)}</span></div>
            <div className="flex justify-between"><span>FRETE (10–20 DIAS ÚTEIS)</span><span>{totals.f ? brl(totals.f) : "GRÁTIS"}</span></div>
            <div className="flex justify-between text-base"><b>TOTAL</b><b>{brl(totals.t)}</b></div>
          </div>
          {step === "cart" ? <button className={`${btn} mt-3`} onClick={() => setStep("co")}>Finalizar pedido</button> : (
            <form className="mt-3 grid gap-2" onSubmit={pay} noValidate>
              <input name="nome" placeholder="Nome completo" autoComplete="name" className="border border-[var(--line)] bg-transparent px-3 py-2.5" />
              <input name="email" type="email" placeholder="E-mail" autoComplete="email" className="border border-[var(--line)] bg-transparent px-3 py-2.5" />
              <input name="zap" placeholder="Telefone com DDD" autoComplete="tel" className="border border-[var(--line)] bg-transparent px-3 py-2.5" />
              <div className="grid grid-cols-2 gap-2"><input name="cep" placeholder="CEP" autoComplete="postal-code" className="border border-[var(--line)] bg-transparent px-3 py-2.5" /><input name="num" placeholder="Número" className="border border-[var(--line)] bg-transparent px-3 py-2.5" /></div>
              <input name="end" placeholder="Endereço" autoComplete="street-address" className="border border-[var(--line)] bg-transparent px-3 py-2.5" />
              <div className="grid grid-cols-2 gap-2"><input name="cid" placeholder="Cidade" className="border border-[var(--line)] bg-transparent px-3 py-2.5" /><input name="uf" placeholder="UF" maxLength={2} className="border border-[var(--line)] bg-transparent px-3 py-2.5" /></div>
              <fieldset className="grid gap-1.5 border border-[var(--line)] p-2.5"><legend className="px-1 font-mono text-xs">FORMA DE PAGAMENTO</legend>
                {[["todas", "Escolher no Mercado Pago"], ["pix", "Pix (QR Code aqui mesmo)"], ["credito", "Cartão de crédito (até 6x)"], ["debito", "Cartão de débito"], ["mp", "Conta Mercado Pago"]].map(([v, t]) => <label key={v} className="flex items-center gap-2 text-sm"><input type="radio" name="pg" value={v} defaultChecked={v === "todas"} className="accent-[var(--red)]" /> {t}</label>)}
              </fieldset>
              <p className="min-h-[1.3em] font-mono text-xs text-[var(--rt)]">{payErr}</p>
              <button className={btn} disabled={paying}>{paying ? "AGUARDE…" : "Pagar com Mercado Pago"}</button>
              <button type="button" className="bg-transparent text-left text-xs font-bold uppercase" onClick={() => setStep("cart")}>← Voltar à sacola</button>
            </form>
          )}
        </>}
      </aside>
    </>
  );
}

export function Shop(props: { products: PublicProduct[]; loja: LojaInfo; view?: View; productId?: string; legal?: string }) {
  return <Suspense fallback={null}><ShopInner view="home" {...props} /></Suspense>;
}
