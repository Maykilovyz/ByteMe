"use client";
import { useRef, useState } from "react";

export type Servico = { nome: string; para: string; url: string };
type Aba = { id: string; titulo: string; itens: Servico[] };

/** Abas "Cidadão / Advogado" no estilo das abas do portal do TJPA, com teclado de abas da WAI-ARIA (setas, Home, End). */
export function AbasServicos({ abas }: { abas: Aba[] }) {
  const [ativa, setAtiva] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);

  function teclar(e: React.KeyboardEvent, i: number) {
    const n = abas.length;
    const destino = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    setAtiva(destino);
    botoes.current[destino]?.focus();
  }

  return (
    <div className="hub-abas">
      <div role="tablist" aria-label="Serviços por público" className="hub-abas-lista">
        {abas.map((a, i) => (
          <button key={a.id} id={`aba-${a.id}`} role="tab" ref={(el) => { botoes.current[i] = el; }}
            aria-selected={ativa === i} aria-controls={`painel-${a.id}`} tabIndex={ativa === i ? 0 : -1}
            onClick={() => setAtiva(i)} onKeyDown={(e) => teclar(e, i)}>
            {a.titulo}
          </button>
        ))}
      </div>
      {abas.map((a, i) => (
        <div key={a.id} id={`painel-${a.id}`} role="tabpanel" aria-labelledby={`aba-${a.id}`} hidden={ativa !== i} tabIndex={0} className="hub-abas-painel">
          <ul className="hub-lista">
            {a.itens.map((s) => (
              <li key={s.nome}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.nome}<span className="sr-only"> (abre em nova aba)</span>
                </a>
                <span className="hub-lista-para">{s.para}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
