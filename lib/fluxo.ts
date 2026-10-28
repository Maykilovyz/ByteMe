// Passos do fluxograma que não dependem de banco nem de IA.
// Usados pelo orquestrador (servidor) e pela triagem local (hub.html aberto sem servidor), para os dois seguirem o mesmo caminho.
import type { Ficha } from "./llm";
import { aplicarRegras, proximoPasso, type Decisao } from "./regras";
import { pediuHumano, riscoPorPalavras, tentouInstruirIA } from "./risco";

/** Checagens sem IA, feitas em toda mensagem: pedido de humano, risco por palavras e ordem ao assistente. */
export function checarSemIA(mensagem: string): { motivo: string; emergencia: boolean } | null {
  if (pediuHumano(mensagem)) return { motivo: "pedido_do_cidadao", emergencia: false };
  if (riscoPorPalavras(mensagem)) return { motivo: "risco_por_palavras", emergencia: true };
  if (tentouInstruirIA(mensagem)) return { motivo: "ordem_ao_assistente", emergencia: false };
  return null;
}

export type Etapa =
  | { tipo: "encaminhar"; motivo: string; emergencia: boolean }
  | { tipo: "pergunta"; faltando: string[]; pergunta: string }
  | { tipo: "decisao"; decisao: Decisao };

/** Depois da ficha: emergência, pedido de humano, pergunta (no máximo MAX_PERGUNTAS), atendente ou decisão das regras fixas. */
export function etapaDepoisDaFicha(ficha: Ficha, perguntasFeitas: number): Etapa {
  if (ficha.risco_imediato) return { tipo: "encaminhar", motivo: "risco_detectado_pela_ia", emergencia: true };
  if (ficha.quer_humano) return { tipo: "encaminhar", motivo: "pedido_do_cidadao", emergencia: false };
  const passo = proximoPasso(ficha, perguntasFeitas);
  if (passo.tipo === "pergunta") return passo;
  if (passo.tipo === "atendente") return { tipo: "encaminhar", motivo: passo.motivo, emergencia: false };
  return { tipo: "decisao", decisao: aplicarRegras(ficha) };
}
