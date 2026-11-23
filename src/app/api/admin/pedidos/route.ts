import { adminPedidos } from "@/server/admin";

export function GET(req: Request) {
  return adminPedidos(req);
}
export function PATCH(req: Request) {
  return adminPedidos(req);
}
