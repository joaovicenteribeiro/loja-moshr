import { getPixStatus } from "@/server/pix";

export function GET(req: Request) {
  return getPixStatus(req);
}
