import fs from "node:fs";
import path from "node:path";
import { loadCatalog, normTipo } from "./catalog";

const CURTO: Record<string, string> = { camisas: "CAMISA", camisetas: "CAMISETA", casacos: "CASACO", calcas: "CALÇA", calcados: "CALÇADO", acessorios: "ACESSÓRIO" };

export type PublicProduct = {
  id: number; n: string; c: string; g: string; t: string; p: number; d: number;
  s: string[]; k: string[]; img: string; imgs: Record<string, string>; desc: string; med: string; demo: boolean;
};

export function publicCatalog(): PublicProduct[] {
  return Object.values(loadCatalog()).map((p) => ({
    id: p.id, n: p.nome, c: p.categoria, g: normTipo(p.tipo) || "outros",
    t: CURTO[normTipo(p.tipo) || ""] || String(p.tipo || "PEÇA").toUpperCase(),
    p: p.preco, d: p.promo || 0, s: p.tamanhos, k: p.cores,
    img: p.imagem || "", imgs: p.imagens || {}, desc: p.descricao || "", med: p.medidas || "", demo: !!p.demo,
  }));
}

export type LojaInfo = { email?: string; instagram?: string; whatsapp?: string; vendedor?: { nome?: string; documento?: string; endereco?: string } };

export function loadLoja(): LojaInfo {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "loja.json"), "utf8"));
  } catch { return {}; }
}
