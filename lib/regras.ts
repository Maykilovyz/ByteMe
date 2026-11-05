// Regras fixas. A IA só monta a ficha; QUEM DECIDE é este arquivo, a partir da tabela (data/assuntos.json).
// Base legal citada para a Amyr conferir: Lei 9.099/95, art. 3º, I (Juizado Cível até 40 SM), art. 8º, §1º
// (pessoa física, MEI, ME e EPP podem ser autoras), art. 9º (até 20 SM sem advogado); CPC, art. 103.
import { CIDADES, CONFIANCA_MINIMA, MAX_PERGUNTAS, SALARIO_MINIMO, slug } from "./config";
import { assuntoPorId, exigeCidade, ORGAO_POR_COMPETENCIA, orgaoPorId, unidadePorId } from "./dados";
import type { Ficha } from "./llm";
import type { Assunto, Orgao, Unidade } from "./tipos";

export type Advogado = "nao" | "sim" | "confirmar";

export type Decisao =
  | { tipo: "unidade"; assunto: Assunto; unidade: Unidade; advogado: Advogado; motivo: string }
  | { tipo: "resolve_na_hora"; assunto: Assunto; como: string; motivo: string }
  | { tipo: "orgao_externo"; assunto: Assunto; orgao: Orgao; motivo: string }
  | { tipo: "atendente"; assunto?: Assunto; motivo: string };

/** Ajusta a ficha da IA com checagens de código (assunto fora da lista, cidade padrão etc.). */
export function normalizarFicha(f: Ficha): Ficha {
  const ficha = { ...f };
  if (!assuntoPorId(ficha.assunto_id)) ficha.assunto_id = "indefinido";
  if (ficha.cidade == null && CIDADES.length === 1) ficha.cidade = CIDADES[0];
  if (ficha.cidade && ficha.cidade !== "outra" && !CIDADES.some((c) => slug(c) === slug(ficha.cidade))) {
    ficha.cidade = "outra";
  }
  return ficha;
}

/** Campos essenciais que faltam. O código decide o que é essencial, não a IA. */
export function camposFaltando(f: Ficha): ("assunto" | "cidade" | "valor" | "porte_empresa")[] {
  const a = assuntoPorId(f.assunto_id);
  if (!a) return ["assunto"];
  // Cidade fora da lista: não adianta perguntar o resto, as regras mandam para o atendente.
  if (exigeCidade(a) && f.cidade === "outra") return [];
  const faltam: ("cidade" | "valor" | "porte_empresa")[] = [];
  if (exigeCidade(a) && !f.cidade) faltam.push("cidade");
  // Valor e porte só importam na regra do Juizado (20/40 SM). Assuntos que sempre vão à Vara Cível (ex.: aluguel) não perguntam.
  const regraDeValor = a.exigeValor && a.regraAdvogado.startsWith("Juizado");
  if (regraDeValor && f.valor_estimado_reais == null) faltam.push("valor");
  if (regraDeValor && f.tipo_autor == null) faltam.push("porte_empresa");
  return faltam;
}

export const PERGUNTA_PADRAO: Record<string, string> = {
  assunto: "Pode me contar com um pouco mais de detalhe o que aconteceu?",
  cidade: "Em qual cidade você mora?",
  valor: "Qual foi o valor envolvido, mais ou menos?",
  porte_empresa: "A empresa é MEI, microempresa ou empresa de pequeno porte?",
};

export const confiancaOk = (f: Ficha) => f.assunto_id !== "indefinido" && f.confianca >= CONFIANCA_MINIMA;

// A IA às vezes pergunta algo que o código já sabe (ex.: a cidade, com uma cidade só). Nesse caso vale a pergunta padrão.
const SOBRE: Record<string, RegExp> = { cidade: /cidade|onde (voc[eê] )?mora/i, valor: /valor|quanto|pagou|r\$/i };
function perguntaCoerente(pergunta: string, faltando: string[]): boolean {
  return Object.entries(SOBRE).every(([campo, re]) => !re.test(pergunta) || faltando.includes(campo));
}

export type Passo =
  | { tipo: "pergunta"; faltando: string[]; pergunta: string }
  | { tipo: "atendente"; motivo: string }
  | { tipo: "decidir" };

/** Depois da ficha: perguntar, mandar ao atendente ou aplicar as regras. Usado pelo orquestrador e pelo teste de frases. */
export function proximoPasso(f: Ficha, perguntasFeitas: number): Passo {
  const faltando = camposFaltando(f);
  // Relato claro, mas o problema não está na lista (ou é só uma tentativa de mudar as regras): a IA não pergunta.
  if (f.assunto_id === "indefinido" && !f.pergunta_pendente) return { tipo: "atendente", motivo: "assunto_fora_da_lista" };
  // Audiência, prazo, despejo ou corte nos próximos dias: uma pessoa assume, mesmo com a ficha completa.
  if (f.prazo_iminente && f.assunto_id !== "indefinido") return { tipo: "atendente", motivo: "prazo_iminente" };
  // O que a pessoa disse não saber (ou não querer informar) não é perguntado de novo: vai ao atendente.
  const semResposta = new Set(f.campos_sem_resposta ?? []);
  const perguntaveis = faltando.filter((c) => !semResposta.has(c));
  if (perguntaveis.length && perguntasFeitas < MAX_PERGUNTAS) {
    const daIA = f.pergunta_pendente && perguntaCoerente(f.pergunta_pendente, perguntaveis) ? f.pergunta_pendente : null;
    return { tipo: "pergunta", faltando: perguntaveis, pergunta: daIA || PERGUNTA_PADRAO[perguntaveis[0]] };
  }
  if (faltando.length || !confiancaOk(f)) {
    const motivo = faltando.length ? `faltou ${faltando.join(", ")}${semResposta.size ? " (pessoa não soube informar)" : ""}` : "baixa confiança";
    return { tipo: "atendente", motivo: `ficha_parcial: ${motivo}` };
  }
  return { tipo: "decidir" };
}

/** Regra de valor e de autor do Juizado Cível. Devolve o tipo de unidade e se precisa de advogado. */
export function decidirJuizoCivel(valor: number, tipoAutor: Ficha["tipo_autor"]) {
  const sm = valor / SALARIO_MINIMO;
  const podeSerAutorNoJuizado = tipoAutor === "pessoa_fisica" || tipoAutor === "mei_me_epp";
  if (!podeSerAutorNoJuizado || sm > 40) return { prefixo: "vara_civel", advogado: "sim" as Advogado, sm };
  return { prefixo: "jec_civel", advogado: (sm > 20 ? "sim" : "nao") as Advogado, sm };
}

export function aplicarRegras(f: Ficha): Decisao {
  const a = assuntoPorId(f.assunto_id);
  if (!a) return { tipo: "atendente", motivo: "assunto_indefinido" };
  if (a.sempreHumano) return { tipo: "atendente", assunto: a, motivo: "assunto_sempre_humano" };

  if (a.competencia !== "TJPA") {
    const orgao = orgaoPorId(ORGAO_POR_COMPETENCIA[a.competencia]);
    if (!orgao) return { tipo: "atendente", assunto: a, motivo: "competencia_externa_sem_orgao" };
    return { tipo: "orgao_externo", assunto: a, orgao, motivo: `competencia: ${a.competencia}` };
  }

  if (a.resolveNaHora) {
    return { tipo: "resolve_na_hora", assunto: a, como: a.comoResolveNaHora ?? "Consulte o site do TJPA.", motivo: "resolve_na_hora" };
  }

  if (f.cidade === "outra") return { tipo: "atendente", assunto: a, motivo: "cidade_fora_da_demo" };
  const cidade = slug(f.cidade);

  if (a.regraAdvogado.startsWith("Juizado")) {
    if (f.valor_estimado_reais == null || f.tipo_autor == null) return { tipo: "atendente", assunto: a, motivo: "falta_valor_ou_porte" };
    const r = decidirJuizoCivel(f.valor_estimado_reais, f.tipo_autor);
    const unidade = unidadePorId(`${r.prefixo}_${cidade}`);
    if (!unidade) return { tipo: "atendente", assunto: a, motivo: `unidade_nao_cadastrada: ${r.prefixo}_${cidade}` };
    return { tipo: "unidade", assunto: a, unidade, advogado: r.advogado, motivo: `valor = ${r.sm.toFixed(1)} SM; autor = ${f.tipo_autor}` };
  }

  const unidade = unidadePorId(a.unidades[cidade]);
  if (!unidade) return { tipo: "atendente", assunto: a, motivo: `unidade_nao_cadastrada para ${cidade}` };
  const advogado: Advogado =
    a.regraAdvogado === "Não precisa" ? "nao" : a.regraAdvogado === "Sempre precisa de advogado" ? "sim" : "confirmar";
  return { tipo: "unidade", assunto: a, unidade, advogado, motivo: `regra: ${a.regraAdvogado}` };
}
