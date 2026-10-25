// Função principal do backend: segue o fluxograma "raciocínio da IA" (v2) com as correções de 25/10.
import { unidadePorId } from "./dados";
import { llmMontaFicha, type Ficha } from "./llm";
import { aplicarRegras, normalizarFicha, proximoPasso, type Decisao } from "./regras";
import { textoResposta, TEXTO_EMERGENCIA, TEXTO_ENCAMINHADO } from "./respostas";
import { pediuHumano, riscoPorPalavras } from "./risco";
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

function entrarNaFila(at: Atendimento, unidadeId: string | null) {
  at.unidadeId = unidadeId;
  at.senha = gerarSenha(at.perfil === "advogado" ? "A" : "C");
  const espera = previsaoEsperaMin(unidadeId);
  mudarStatus(at, "aguardando_atendimento");
  return espera;
}

function encaminhar(at: Atendimento, motivo: string, ficha: Ficha | null, emergencia = false): RespostaTriagem {
  at.motivoEncaminhamento = motivo;
  const espera = entrarNaFila(at, null);
  if (emergencia) mudarStatus(at, "emergencia");
  registrar(at, "encaminhado", { motivo });
  const texto = (emergencia ? TEXTO_EMERGENCIA : TEXTO_ENCAMINHADO) + ` Sua senha é ${at.senha}.`;
  at.respostaAoCidadao = texto;
  responderAssistente(at, texto);
  atualizar(at);
  return { protocolo: at.protocolo, tipo: emergencia ? "emergencia" : "atendente", texto, senha: at.senha, esperaMin: espera, ficha };
}

function finalizar(at: Atendimento, d: Decisao, ficha: Ficha): RespostaTriagem {
  at.decisao = { tipo: d.tipo, motivo: d.motivo, assunto: "assunto" in d ? d.assunto?.id : null };
  registrar(at, "decisao", at.decisao);
  if (d.tipo === "atendente") return encaminhar(at, `ficha_pronta: ${d.motivo}`, ficha);

  let espera: number | null = null;
  if (d.tipo === "unidade") {
    espera = entrarNaFila(at, d.unidade.id);
  } else {
    mudarStatus(at, "resolvido_sem_fila");
  }
  const texto = textoResposta(d, at.senha, espera);
  at.respostaAoCidadao = texto;
  responderAssistente(at, texto);
  atualizar(at);
  const u = d.tipo === "unidade" ? unidadePorId(d.unidade.id) : null;
  return {
    protocolo: at.protocolo, tipo: d.tipo, texto, senha: at.senha, esperaMin: espera,
    unidade: u ? { nome: u.nome, endereco: u.endereco, horario: u.horario } : null,
    documentos: d.tipo === "unidade" ? d.assunto.documentos : [],
    advogado: d.tipo === "unidade" ? d.advogado : null,
    ficha,
  };
}

export async function triar(entrada: { protocolo?: string; mensagem: string; canal?: string }): Promise<RespostaTriagem> {
  const mensagem = entrada.mensagem.trim().slice(0, 2000);
  let at = entrada.protocolo ? obter(entrada.protocolo) : undefined;
  if (!at || at.status !== "em_triagem") at = criarAtendimento("cidadao", entrada.canal ?? "web");
  at.historico.push({ papel: "cidadao", texto: mensagem, em: agora() });

  // 1. Pedido de humano e risco por palavras: sem IA, em toda mensagem.
  if (pediuHumano(mensagem)) return encaminhar(at, "pedido_do_cidadao", null);
  if (riscoPorPalavras(mensagem)) return encaminhar(at, "risco_por_palavras", null, true);

  // 2. IA monta a ficha (com a conversa inteira).
  let ficha: Ficha;
  try {
    const r = await llmMontaFicha(at.historico, at.perguntasFeitas);
    ficha = normalizarFicha(r.ficha);
    registrar(at, "ficha_ia", { provedor: r.provedor, ms: r.ms, bruto: r.bruto });
  } catch (e) {
    registrar(at, "erro_ia", String(e));
    return encaminhar(at, "falha_da_ia", null);
  }
  at.ficha = ficha;

  if (ficha.risco_imediato) return encaminhar(at, "risco_detectado_pela_ia", ficha, true);
  if (ficha.quer_humano) return encaminhar(at, "pedido_do_cidadao", ficha);

  // 3. Perguntas (no máximo MAX_PERGUNTAS; o contador fica no código).
  const passo = proximoPasso(ficha, at.perguntasFeitas);
  if (passo.tipo === "pergunta") {
    at.perguntasFeitas += 1;
    responderAssistente(at, passo.pergunta);
    registrar(at, "pergunta", { faltando: passo.faltando, pergunta: passo.pergunta });
    atualizar(at);
    return { protocolo: at.protocolo, tipo: "pergunta", texto: passo.pergunta, ficha };
  }
  if (passo.tipo === "atendente") return encaminhar(at, passo.motivo, ficha);

  // 4. Regras fixas decidem.
  return finalizar(at, aplicarRegras(ficha), ficha);
}
