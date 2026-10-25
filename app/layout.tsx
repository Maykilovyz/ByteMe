import type { Metadata } from "next";
import Link from "next/link";
import { BotaoTotem } from "./componentes";
import "./globals.css";

export const metadata: Metadata = {
  title: "ByteMe · Atendimento",
  description: "Porta única de atendimento do TJPA (protótipo do Hackathon TJPA 2026, dados fictícios).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topo">
          <span className="marca">ByteMe <small>· atendimento TJPA (protótipo)</small></span>
          <nav>
            <Link href="/">Início</Link>
            <Link href="/cidadao">Cidadão</Link>
            <Link href="/advogado">Advogado</Link>
            <Link href="/atendente">Atendente</Link>
          </nav>
          <BotaoTotem />
        </header>
        <main>{children}</main>
        <p className="aviso-prototipo">Protótipo do Hackathon TJPA 2026. Dados fictícios. Regras a validar com o TJPA.</p>
      </body>
    </html>
  );
}
