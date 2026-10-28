// Triagem e "Entenda seu papel" sem servidor, para o hub.html aberto direto do computador (pitch sem internet).
// Mesmo fluxo do orquestrador (lib/fluxo.ts) e mesmas regras e textos, com o simulador no lugar da IA.
// Não grava nada: a senha e a fila são só desta página. Empacotado no hub.html por scripts/gerar-simulador-hub.mjs.
import { MINUTOS_POR_ATENDIMENTO } from "./config";
import { unidadePorId } from "./dados";
import { checarSemIA, etapaDepoisDaFicha } from "./fluxo";
import type { Ficha } from "./llm";
import { entenderPapel } from "./papel";
import { normalizarFicha } from "./regras";
import { textoResposta, TEXTO_EMERGENCIA, TEXTO_ENCAMINHADO } from "./respostas";
import { simularFicha } from "./simulador";
import type { Mensagem } from "./tipos";

type Conversa = { historico: Mensagem[]; perguntasFeitas: number };
const conversas = new Map<string, Conversa>();
const fila: (string | null)[] = []; // unidade de cada senha já dada nesta página (null = atendente)
let contador = 0;

function entrarNaFila(unidadeId: string | null) {
  const naFrente = fila.filter((u) => u === unidadeId).length;
  fila.push(unidadeId);
  return { senha: `C${String(fila.length).padStart(3, "0")}`, esperaMin: naFrente * MINUTOS_POR_ATENDIMENTO };
}

/** Uma mensagem do cidadão. Responde no mesmo formato de POST /api/triagem. */
export function triar(entrada: { protocolo?: string | null; mensagem: string }) {
  const mensagem = entrada.mensagem.trim().slice(0, 2000);
  let protocolo = entrada.protocolo ?? "";
  let c = conversas.get(protocolo);
  if (!c) {
    protocolo = `DEMO-${String(++contador).padStart(4, "0")}`;
    c = { historico: [], perguntasFeitas: 0 };
    conversas.set(protocolo, c);
  }
  const agora = new Date().toISOString();
  c.historico.push({ papel: "cidadao", texto: mensagem, em: agora });
  const fim = (r: object) => { conversas.delete(protocolo); return { protocolo, modoDemo: true, ...r }; };
  const encaminhar = (emergencia: boolean, ficha: Ficha | null) => {
    const { senha, esperaMin } = entrarNaFila(null);
    return fim({ tipo: emergencia ? "emergencia" : "atendente", texto: `${emergencia ? TEXTO_EMERGENCIA : TEXTO_ENCAMINHADO} Sua senha é ${senha}.`, senha, esperaMin, ficha });
  };

  const semIA = checarSemIA(mensagem);
  if (semIA) return encaminhar(semIA.emergencia, null);

  const ficha = normalizarFicha(simularFicha(c.historico, c.perguntasFeitas).ficha);
  const etapa = etapaDepoisDaFicha(ficha, c.perguntasFeitas);
  if (etapa.tipo === "encaminhar") return encaminhar(etapa.emergencia, ficha);
  if (etapa.tipo === "pergunta") {
    c.perguntasFeitas += 1;
    c.historico.push({ papel: "assistente", texto: etapa.pergunta, em: agora });
    return { protocolo, modoDemo: true, tipo: "pergunta", texto: etapa.pergunta, ficha };
  }
  const d = etapa.decisao;
  if (d.tipo === "atendente") return encaminhar(false, ficha);
  const naFila = d.tipo === "unidade" ? entrarNaFila(d.unidade.id) : { senha: null, esperaMin: null };
  const u = d.tipo === "unidade" ? unidadePorId(d.unidade.id) : null;
  return fim({
    tipo: d.tipo, texto: textoResposta(d, naFila.senha, naFila.esperaMin), senha: naFila.senha, esperaMin: naFila.esperaMin,
    unidade: u ? { nome: u.nome, endereco: u.endereco, horario: u.horario } : null,
    documentos: d.tipo === "unidade" ? d.assunto.documentos : [],
    advogado: d.tipo === "unidade" ? d.advogado : null,
    ficha,
  });
}

/** "Entenda seu papel" sem IA: texto colado é lido pelas regras; foto e PDF pedem a IA (mesma resposta do servidor sem chave). */
export function papel(corpo: { texto?: string; arquivo?: string }) {
  const m = corpo.arquivo?.match(/^data:([^;]+);base64,(.*)$/);
  return entenderPapel({ texto: corpo.texto, arquivo: m ? { mimeType: m[1], data: m[2] } : undefined });
}
