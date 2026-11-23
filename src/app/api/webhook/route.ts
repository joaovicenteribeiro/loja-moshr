import { postWebhook } from "@/server/webhook";

export function POST(req: Request) {
  return postWebhook(req);
}
