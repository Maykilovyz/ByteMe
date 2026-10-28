// Função principal do backend: segue o fluxograma "raciocínio da IA" (v2) com as correções de 25/10.
import { ATRASO_SIMULADOR_MS, modoSimulador } from "./config";
import { unidadePorId } from "./dados";
import { checarSemIA, etapaDepoisDaFicha } from "./fluxo";
import { llmMontaFicha, type Ficha } from "./llm";
import { normalizarFicha, type Decisao } from "./regras";
import { textoResposta, TEXTO_EMERGENCIA, TEXTO_ENCAMINHADO } from "./respostas";
import { simularFicha } from "./simulador";
import { atualizar, criarAtendimento, gerarSenha, mudarStatus, obter, previsaoEsperaMin, registrar } from "./store";
import type { Atendimento } from "./tipos";

export type RespostaTriagem = {
  protocolo: string;
  tipo: "pergunta" | "emergencia" | "atendente" | "unidade" | "resolve_na_hora" | "orgao_externo";
  texto: string;
  senha?: string | null;
  esperaMin?: number | null;
  unidade?: { nome: string; endereco: string | null; horario: string | null } | null;
  documentos?: string[];
  advogado?: string | null;
  ficha?: Ficha | null;
};

const agora = () => new Date().toISOString();

function responderAssistente(at: Atendimento, texto: string) {
  at.historico.push({ papel: "assistente", texto, em: agora() });
}

async function entrarNaFila(at: Atendimento, unidadeId: string | null) {
  at.unidadeId = unidadeId;
  at.senha = await gerarSenha(at.perfil === "advogado" ? "A" : "C");
  const espera = await previsaoEsperaMin(unidadeId);
  mudarStatus(at, "aguardando_atendimento");
  return espera;
}

async function encaminhar(at: Atendimento, motivo: string, ficha: Ficha | null, emergencia = false): Promise<RespostaTriagem> {
  at.motivoEncaminhamento = motivo;
  const espera = await entrarNaFila(at, null);
  if (emergencia) mudarStatus(at, "emergencia");
  registrar(at, "encaminhado", { motivo });
  const texto = (emergencia ? TEXTO_EMERGENCIA : TEXTO_ENCAMINHADO) + ` Sua senha é ${at.senha}.`;
  at.respostaAoCidadao = texto;
  responderAssistente(at, texto);
  await atualizar(at);
  return { protocolo: at.protocolo, tipo: emergencia ? "emergencia" : "atendente", texto, senha: at.senha, esperaMin: espera, ficha };
}

async function finalizar(at: Atendimento, d: Decisao, ficha: Ficha): Promise<RespostaTriagem> {
  at.decisao = { tipo: d.tipo, motivo: d.motivo, assunto: "assunto" in d ? d.assunto?.id : null };
  registrar(at, "decisao", at.decisao);
  if (d.tipo === "atendente") return await encaminhar(at, `ficha_pronta: ${d.motivo}`, ficha);

  let espera: number | null = null;
  if (d.tipo === "unidade") {
    espera = await entrarNaFila(at, d.unidade.id);
  } else {
    mudarStatus(at, "resolvido_sem_fila");
  }
  const texto = textoResposta(d, at.senha, espera);
  at.respostaAoCidadao = texto;
  responderAssistente(at, texto);
  await atualizar(at);
  const u = d.tipo === "unidade" ? unidadePorId(d.unidade.id) : null;
  return {
    protocolo: at.protocolo, tipo: d.tipo, texto, senha: at.senha, esperaMin: espera,
    unidade: u ? { nome: u.nome, endereco: u.endereco, horario: u.horario } : null,
    documentos: d.tipo === "unidade" ? d.assunto.documentos : [],
    advogado: d.tipo === "unidade" ? d.advogado : null,
    ficha,
  };
}

/** Quem lê a conversa: a IA ou, sem chave de IA (ou com MODO_IA=simulador), o simulador de demonstração. */
async function lerConversa(at: Atendimento) {
  if (!modoSimulador()) return llmMontaFicha(at.historico, at.perguntasFeitas);
  await new Promise((ok) => setTimeout(ok, ATRASO_SIMULADOR_MS));
  return simularFicha(at.historico, at.perguntasFeitas);
}

export async function triar(entrada: { protocolo?: string; mensagem: string; canal?: string }): Promise<RespostaTriagem> {
  const mensagem = entrada.mensagem.trim().slice(0, 2000);
  let at = entrada.protocolo ? await obter(entrada.protocolo) : undefined;
  if (!at || at.status !== "em_triagem") at = await criarAtendimento("cidadao", entrada.canal ?? "web");
  at.historico.push({ papel: "cidadao", texto: mensagem, em: agora() });

  // 1. Pedido de humano e risco por palavras: sem IA, em toda mensagem.
  const semIA = checarSemIA(mensagem);
  if (semIA) return await encaminhar(at, semIA.motivo, null, semIA.emergencia);

  // 2. IA monta a ficha (com a conversa inteira).
  let ficha: Ficha;
  try {
    const r = await lerConversa(at);
    ficha = normalizarFicha(r.ficha);
    registrar(at, "ficha_ia", { provedor: r.provedor, ms: r.ms, bruto: r.bruto });
  } catch (e) {
    registrar(at, "erro_ia", String(e));
    return await encaminhar(at, "falha_da_ia", null);
  }
  at.ficha = ficha;

  // 3. Risco ou pedido de humano vistos pela IA, perguntas (no máximo MAX_PERGUNTAS; o contador fica no código) ou regras fixas.
  const etapa = etapaDepoisDaFicha(ficha, at.perguntasFeitas);
  if (etapa.tipo === "encaminhar") return await encaminhar(at, etapa.motivo, ficha, etapa.emergencia);
  if (etapa.tipo === "pergunta") {
    at.perguntasFeitas += 1;
    responderAssistente(at, etapa.pergunta);
    registrar(at, "pergunta", { faltando: etapa.faltando, pergunta: etapa.pergunta });
    await atualizar(at);
    return { protocolo: at.protocolo, tipo: "pergunta", texto: etapa.pergunta, ficha };
  }

  // 4. Regras fixas decidem.
  return await finalizar(at, etapa.decisao, ficha);
}
