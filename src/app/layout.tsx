import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-inter" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "MOSHR – Wear your own identity.",
  description: "MOSHR: moda alternativa independente. Grunge, goth, punk, emo, cyber e streetwear. Envio para todo o Brasil.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${mono.variable} ${inter.className}`}>{children}</body>
    </html>
  );
}
