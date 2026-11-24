import fs from "node:fs";
import path from "node:path";
import { loadCatalog, normTipo } from "./catalog";

const CURTO: Record<string, string> = { camisas: "CAMISA", camisetas: "CAMISETA", casacos: "CASACO", calcas: "CALÇA", calcados: "CALÇADO", acessorios: "ACESSÓRIO" };

export type PublicProduct = {
  id: number; n: string; c: string; g: string; t: string; p: number; d: number;
  s: string[]; k: string[]; img: string; imgs: Record<string, string>; desc: string; med: string; demo: boolean;
  e: number | null;
};

function foto(src?: string) {
  const s = String(src || "").trim();
  if (!s || s.startsWith("/") || /^https?:\/\//.test(s)) return s;
  return "/" + s.replace(/^\.\//, "");
}

export function publicCatalog(): PublicProduct[] {
  return Object.values(loadCatalog()).map((p) => ({
    id: p.id, n: p.nome, c: p.categoria, g: normTipo(p.tipo) || "outros",
    t: CURTO[normTipo(p.tipo) || ""] || String(p.tipo || "PEÇA").toUpperCase(),
    p: p.preco, d: p.promo || 0, s: p.tamanhos, k: p.cores,
    img: foto(p.imagem), imgs: Object.fromEntries(Object.entries(p.imagens || {}).map(([k, v]) => [k, foto(v)])),
    desc: p.descricao || "", med: p.medidas || "", demo: !!p.demo,
    e: p.estoque == null ? null : Number(p.estoque),
  }));
}

export type LojaInfo = { email?: string; instagram?: string; whatsapp?: string; vendedor?: { nome?: string; documento?: string; endereco?: string } };

const lojaFile = () => path.join(process.cwd(), "public", "loja.json");

export function loadLoja(): LojaInfo {
  try {
    return JSON.parse(fs.readFileSync(lojaFile(), "utf8"));
  } catch { return {}; }
}

export function saveLoja(b: LojaInfo): LojaInfo {
  const loja: LojaInfo = {
    email: String(b.email || "").trim().slice(0, 120),
    instagram: String(b.instagram || "").replace(/^@/, "").trim().slice(0, 60),
    whatsapp: String(b.whatsapp || "").replace(/\D/g, "").slice(0, 15),
    vendedor: {
      nome: String(b.vendedor?.nome || "").trim().slice(0, 120),
      documento: String(b.vendedor?.documento || "").trim().slice(0, 24),
      endereco: String(b.vendedor?.endereco || "").trim().slice(0, 200),
    },
  };
  fs.writeFileSync(lojaFile(), JSON.stringify(loja, null, 2) + "\n", "utf8");
  return loja;
}
