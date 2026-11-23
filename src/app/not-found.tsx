import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[760px] px-5 py-16">
      <p className="font-mono text-xs uppercase">404</p>
      <h1 className="mt-2 text-4xl font-black uppercase">Página não encontrada</h1>
      <Link href="/" className="mt-6 inline-block bg-[var(--ink)] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[var(--bg)]">Voltar</Link>
    </main>
  );
}
