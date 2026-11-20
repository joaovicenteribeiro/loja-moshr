// Lê data/products.json (fonte única do catálogo). Arquivos com "_" não viram rotas.
import fs from "node:fs";
import path from "node:path";

export function loadCatalog() {
  const file = path.join(process.cwd(), "data", "products.json");
  const list = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.fromEntries(list.filter((p) => p.ativo !== false).map((p) => [String(p.id), p]));
}
