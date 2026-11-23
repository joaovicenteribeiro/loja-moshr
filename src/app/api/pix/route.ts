import { postPix } from "@/server/pix";

export function POST(req: Request) {
  return postPix(req);
}
