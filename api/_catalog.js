// Lê data/products.json (fonte única do catálogo). Arquivos com "_" não viram rotas.
import fs from "node:fs";
import path from "node:path";

export function loadCatalog() {
  const file = path.join(process.cwd(), "data", "products.json");
  const list = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.fromEntries(list.filter((p) => p.ativo !== false).map((p) => [String(p.id), p]));
}

// Tipos de peça (um produto tem UM tipo, além do estilo/subcultura).
export const TIPOS = {
  camisas: "Camisas", camisetas: "Camisetas", casacos: "Jaquetas / Moletons",
  calcas: "Calças", calcados: "Calçados", acessorios: "Acessórios",
};
const SINONIMOS = {
  camisas: ["camisa", "camisas", "flanela", "blusa", "blusas", "social"],
  camisetas: ["camiseta", "camisetas", "tshirt", "t-shirt", "regata", "top", "cropped", "baby tee"],
  casacos: ["casaco", "casacos", "jaqueta", "jaquetas", "moletom", "moletons", "bomber", "agasalho", "jaquetas/moletons", "jaquetas / moletons"],
  calcas: ["calca", "calcas", "jeans", "bermuda", "bermudas", "short", "shorts", "cargo"],
  calcados: ["calcado", "calcados", "tenis", "bota", "botas", "coturno", "sapato", "sandalia"],
  acessorios: ["acessorio", "acessorios", "cinto", "pulseira", "colar", "bone", "bolsa", "meia"],
};
export function normTipo(t) {
  const s = String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (TIPOS[s]) return s;
  for (const [k, v] of Object.entries(SINONIMOS)) if (v.includes(s)) return k;
  return null;
}
