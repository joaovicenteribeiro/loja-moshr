import { loadAllProducts, saveAllProducts, normTipo, type CatalogProduct } from "./catalog";
import { adminGuard } from "./admin";

const CATS = ["grunge", "goth", "punk", "emo", "cyber", "street"];
const headers = { "Cache-Control": "no-store" };

function splitList(v: unknown) {
  return String(v ?? "").split(/[,|]/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
}

function numOrNull(v: unknown) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fromBody(b: Record<string, unknown>, prev?: CatalogProduct): { erro: string } | { p: Omit<CatalogProduct, "id"> } {
  const nome = String(b.nome || "").trim().slice(0, 120);
  const tipo = normTipo(b.tipo);
  const categoria = String(b.categoria || "").trim();
  const preco = Number(b.preco);
  if (nome.length < 2) return { erro: "Informe o nome." };
  if (!tipo) return { erro: "Tipo de peça inválido." };
  if (!CATS.includes(categoria)) return { erro: "Estilo inválido." };
  if (!Number.isFinite(preco) || preco <= 0) return { erro: "Preço inválido." };
  const tamanhos = splitList(b.tamanhos);
  const cores = splitList(b.cores);
  if (!tamanhos.length || !cores.length) return { erro: "Informe tamanhos e cores, separados por vírgula." };
  const promo = numOrNull(b.promo);
  const custo = numOrNull(b.custo);
  const estoque = b.estoque === "" || b.estoque == null ? null : Math.max(0, parseInt(String(b.estoque), 10) || 0);
  const imagem = String(b.imagem || prev?.imagem || "").trim().slice(0, 300);
  const link = String(b.aliexpress || "").trim();
  return {
    p: {
      nome, categoria, tipo, preco: +preco.toFixed(2),
      promo: promo && promo > 0 ? +promo.toFixed(2) : 0,
      custo: custo && custo > 0 ? +custo.toFixed(2) : null,
      tamanhos, cores,
      imagem: imagem || undefined,
      imagens: prev?.imagens,
      descricao: String(b.descricao || "").slice(0, 2000),
      medidas: String(b.medidas || "").slice(0, 500),
      aliexpress: /^https:\/\//.test(link) ? link.slice(0, 400) : null,
      estoque,
      ativo: b.ativo !== false && String(b.ativo) !== "false",
      demo: false,
    },
  };
}

export async function adminProdutos(req: Request) {
  const negado = adminGuard(req);
  if (negado) return negado;
  try {
    const list = loadAllProducts();
    if (req.method === "GET") return Response.json(list, { headers });
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (req.method === "POST") {
      const parsed = fromBody(b);
      if ("erro" in parsed) return Response.json({ erro: parsed.erro }, { status: 400, headers });
      const id = list.reduce((m, p) => Math.max(m, p.id), 0) + 1;
      const next = [...list, { id, ...parsed.p }];
      saveAllProducts(next);
      return Response.json(next.find((p) => p.id === id), { headers });
    }
    const id = Number(b.id);
    const i = list.findIndex((p) => p.id === id);
    if (!id || i < 0) return Response.json({ erro: "Peça não encontrada." }, { status: 404, headers });
    if (req.method === "DELETE") {
      list.splice(i, 1);
      saveAllProducts(list);
      return Response.json({ ok: true }, { headers });
    }
    if (req.method === "PATCH") {
      const parsed = fromBody(b, list[i]);
      if ("erro" in parsed) return Response.json({ erro: parsed.erro }, { status: 400, headers });
      list[i] = { id, ...parsed.p };
      saveAllProducts(list);
      return Response.json(list[i], { headers });
    }
    return Response.json({ erro: "Método não permitido" }, { status: 405, headers });
  } catch (e) {
    console.error("admin produtos:", (e as Error).message);
    return Response.json({ erro: "Não foi possível gravar o catálogo." }, { status: 500, headers });
  }
}
