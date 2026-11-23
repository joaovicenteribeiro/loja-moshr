import type { Metadata } from "next";
import { Admin } from "@/components/Admin";

export const metadata: Metadata = { title: "Pedidos – MOSHR", robots: { index: false, follow: false } };

export default function Page() {
  return <Admin />;
}
