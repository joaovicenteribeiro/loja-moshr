// Uso: node tools/import-csv.mjs meus-produtos.csv   (gera data/products.json)
// tipo = tipo da peça: camisas | camisetas | casacos (jaquetas/moletons) | calcas | calcados | acessorios
// Colunas: nome;categoria;tipo;preco;promo;custo;tamanhos;cores;imagem;descricao;medidas;aliexpress
// Tamanhos e cores separados por "|". Aceita separador ; ou , e decimal com vírgula.
import fs from "node:fs";
import { normTipo } from "../api/_catalog.js";
const CATS = ["grunge", "goth", "punk", "emo", "cyber", "street"];
const [, , input, output = "data/products.json"] = process.argv;
if (!input) { console.error("Uso: node tools/import-csv.mjs arquivo.csv"); process.exit(1); }
const raw = fs.readFileSync(input, "utf8").replace(/^\uFEFF/, "");
const d = raw.split("\n")[0].includes(";") ? ";" : ",";
function parse(t) {
  const rows = []; let r = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { r.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; r.push(c); c = ""; if (r.some((x) => x.trim())) rows.push(r); r = []; }
    else c += ch;
  }
  r.push(c); if (r.some((x) => x.trim())) rows.push(r); return rows;
}
const [head, ...rows] = parse(raw), h = head.map((x) => x.trim().toLowerCase());
const num = (s) => { s = (s || "").trim(); return s ? parseFloat(s.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) : 0; };
const list = (s) => (s || "").split("|").map((x) => x.trim()).filter(Boolean);
const errs = [], warns = [], out = [];
rows.forEach((row, i) => {
  const g = (k) => (row[h.indexOf(k)] || "").trim(), n = i + 2, nome = g("nome");
  const e = (m) => errs.push(`Linha ${n} (${nome || "sem nome"}): ${m}`);
  const preco = num(g("preco")), promo = num(g("promo")), custo = num(g("custo"));
  const tam = list(g("tamanhos")), cor = list(g("cores")), ali = g("aliexpress");
  // imagem: um caminho único OU uma foto por cor: "Preto=images/a.jpg|Branco=images/b.jpg"
  const im = g("imagem"); let imagem = im; const imagens = {};
  if (im.includes("=")) {
    im.split("|").forEach((x) => { const [k, ...v] = x.split("="); imagens[k.trim()] = v.join("=").trim(); });
    imagem = Object.values(imagens)[0] || "";
    Object.keys(imagens).forEach((k) => { if (!cor.includes(k)) e(`foto de cor inexistente: ${k}`); });
  }
  [imagem, ...Object.values(imagens)].filter(Boolean).forEach((f) => { if (!fs.existsSync("public/" + f)) warns.push(`Linha ${n} (${nome}): arquivo public/${f} não encontrado.`); });
  if (!nome) e("nome vazio");
  const tipo = normTipo(g("tipo"));
  if (!tipo) e("tipo deve ser: camisas, camisetas, casacos (jaquetas/moletons), calcas, calcados ou acessorios");
  if (!CATS.includes(g("categoria"))) e(`categoria deve ser uma de: ${CATS.join(", ")}`);
  if (!(preco > 0)) e("preco inválido");
  if (promo && promo >= preco) e("promo deve ser menor que o preco");
  if (!tam.length || !cor.length) e("informe tamanhos e cores (separados por |)");
  if (ali && !/^https:\/\//.test(ali)) e("aliexpress deve começar com https://");
  const venda = promo || preco;
  if (!custo) warns.push(`Linha ${n} (${nome}): sem custo informado, margem não calculada.`);
  else if ((venda - custo) / venda < 0.3) warns.push(`Linha ${n} (${nome}): margem de ${(((venda - custo) / venda) * 100).toFixed(0)}% antes de taxas e frete. Confira se compensa.`);
  out.push({ id: i + 1, nome, categoria: g("categoria"), tipo, preco, promo, custo,
    tamanhos: tam, cores: cor, imagem, imagens, descricao: g("descricao"), medidas: g("medidas"), aliexpress: ali, ativo: true });
});
if (errs.length) { console.error("Corrija antes de importar:\n- " + errs.join("\n- ")); process.exit(1); }
fs.writeFileSync(output, JSON.stringify(out, null, 2) + "\n");
warns.forEach((w) => console.warn("Aviso: " + w));
console.log(`OK: ${out.length} produtos gravados em ${output}`);
