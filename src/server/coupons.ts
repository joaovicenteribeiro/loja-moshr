import fs from "node:fs";
import path from "node:path";

export const FRETE = 24.9;
export const GRATIS_ACIMA = 250;

type Cupom = { codigo: string; tipo: "frete_gratis"; ativo?: boolean };

function lista(): Cupom[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "coupons.json"), "utf8")) as Cupom[];
  } catch {
    return [];
  }
}

export function aplicarFrete(subtotal: number, codigo: unknown) {
  const base = !subtotal || subtotal >= GRATIS_ACIMA ? 0 : FRETE;
  const code = String(codigo || "").trim().toUpperCase();
  if (!code) return { frete: base, cupom: "" };
  const cupom = lista().find((c) => c.codigo.toUpperCase() === code && c.ativo !== false);
  if (!cupom) return { erro: "Cupom inválido." as const };
  if (cupom.tipo === "frete_gratis") return { frete: 0, cupom: cupom.codigo };
  return { erro: "Cupom inválido." as const };
}
