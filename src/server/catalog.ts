import fs from "node:fs";
import path from "node:path";

export type CatalogProduct = {
  id: number;
  nome: string;
  categoria: string;
  tipo: string;
  preco: number;
  promo?: number;
  tamanhos: string[];
  cores: string[];
  imagem?: string;
  imagens?: Record<string, string>;
  descricao?: string;
  medidas?: string;
  demo?: boolean;
  ativo?: boolean;
  custo?: number | null;
  aliexpress?: string | null;
  estoque?: number | null;
};

const file = () => path.join(process.cwd(), "data", "products.json");

export function loadAllProducts(): CatalogProduct[] {
  return JSON.parse(fs.readFileSync(file(), "utf8")) as CatalogProduct[];
}

export function saveAllProducts(list: CatalogProduct[]) {
  fs.writeFileSync(file(), JSON.stringify(list, null, 2) + "\n", "utf8");
}

export function loadCatalog(): Record<string, CatalogProduct> {
  return Object.fromEntries(loadAllProducts().filter((p) => p.ativo !== false).map((p) => [String(p.id), p]));
}

export function temEstoque(p: CatalogProduct, qty: number) {
  if (p.estoque == null) return true;
  return qty <= p.estoque;
}

export const TIPOS: Record<string, string> = {
  camisas: "Camisas",
  camisetas: "Camisetas",
  casacos: "Jaquetas / Moletons",
  calcas: "Calças",
  calcados: "Calçados",
  acessorios: "Acessórios",
};

const SINONIMOS: Record<string, string[]> = {
  camisas: ["camisa", "camisas", "flanela", "blusa", "blusas", "social"],
  camisetas: ["camiseta", "camisetas", "tshirt", "t-shirt", "regata", "top", "cropped", "baby tee"],
  casacos: ["casaco", "casacos", "jaqueta", "jaquetas", "moletom", "moletons", "bomber", "agasalho", "jaquetas/moletons", "jaquetas / moletons"],
  calcas: ["calca", "calcas", "jeans", "bermuda", "bermudas", "short", "shorts", "cargo"],
  calcados: ["calcado", "calcados", "tenis", "bota", "botas", "coturno", "sapato", "sandalia"],
  acessorios: ["acessorio", "acessorios", "cinto", "pulseira", "colar", "bone", "bolsa", "meia"],
};

export function normTipo(t: unknown) {
  const s = String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (TIPOS[s]) return s;
  for (const [k, v] of Object.entries(SINONIMOS)) if (v.includes(s)) return k;
  return null;
}
