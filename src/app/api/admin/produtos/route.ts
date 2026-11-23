import { adminProdutos } from "@/server/catalog-admin";

export function GET(req: Request) { return adminProdutos(req); }
export function POST(req: Request) { return adminProdutos(req); }
export function PATCH(req: Request) { return adminProdutos(req); }
export function DELETE(req: Request) { return adminProdutos(req); }
