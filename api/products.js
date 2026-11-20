// GET /api/products — catálogo PÚBLICO. Custo e link do fornecedor NUNCA saem daqui.
import { loadCatalog } from "./_catalog.js";

export default function handler(req, res) {
  try {
    const out = Object.values(loadCatalog()).map((p) => ({
      id: p.id, n: p.nome, c: p.categoria, t: String(p.tipo || "").toUpperCase(),
      p: p.preco, d: p.promo || 0, s: p.tamanhos, k: p.cores,
      img: p.imagem || "", imgs: p.imagens || {}, desc: p.descricao || "", med: p.medidas || "", demo: !!p.demo,
    }));
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ erro: "catálogo indisponível" });
  }
}
