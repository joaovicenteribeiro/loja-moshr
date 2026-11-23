import { postCheckout } from "@/server/checkout";

export function POST(req: Request) {
  return postCheckout(req);
}
