import { notFound } from "next/navigation";
import { storePage } from "@/components/pages";

const SLUGS = ["troca", "privacidade", "termos", "contato"];

export default async function Page({ params }: { params: Promise<{ legal: string }> }) {
  const { legal } = await params;
  if (!SLUGS.includes(legal)) notFound();
  return storePage("legal", { legal });
}
