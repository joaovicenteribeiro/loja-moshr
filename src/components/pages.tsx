import { Shop } from "@/components/Shop";
import { loadLoja, publicCatalog } from "@/server/public";

export function storePage(view: "home" | "loja" | "produto" | "legal", extra?: { productId?: string; legal?: string }) {
  return <Shop products={publicCatalog()} loja={loadLoja()} view={view} productId={extra?.productId} legal={extra?.legal} />;
}
