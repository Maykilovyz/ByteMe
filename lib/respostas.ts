// Textos fixos mostrados ao cidadão. A IA NÃO escreve a resposta final: ela vem destes modelos + da tabela.
// Revisão de linguagem e conteúdo: Amyr (jurídico).
import type { Decisao } from "./regras";

export const TEXTO_EMERGENCIA =
  "Se você ou alguém está em perigo agora, ligue 190 (Polícia). Para violência contra a mulher, ligue 180. " +
  "Para emergência médica, ligue 192 (SAMU). Se você está sofrendo muito, o CVV atende a qualquer hora no 188. " +
  "Já chamamos um atendente para falar com você.";

export const TEXTO_ENCAMINHADO =
  "Vamos te passar para um atendente. Ele já vai receber o que você contou, e você não precisa repetir.";

const TEXTO_ADVOGADO = {
  nao: "Você não precisa de advogado para este caso.",
  sim: "Para este caso você vai precisar de advogado. Se não puder pagar, procure a Defensoria Pública.",
  confirmar: "O atendente vai confirmar se você precisa de advogado.",
};

export function textoResposta(d: Decisao, senha?: string | null, esperaMin?: number | null): string {
  switch (d.tipo) {
    case "unidade": {
      const docs = d.assunto.documentos.length ? ` Leve: ${d.assunto.documentos.join("; ")}.` : "";
      const fila = senha ? ` Sua senha é ${senha}${esperaMin != null ? (esperaMin > 0 ? ` (espera prevista: cerca de ${esperaMin} min)` : " (você é o próximo)") : ""}.` : "";
      return `Seu caso é de: ${d.assunto.nome}. Procure: ${d.unidade.nome}.${docs} ${TEXTO_ADVOGADO[d.advogado]}${fila}`;
    }
    case "resolve_na_hora":
      return `Seu caso é de: ${d.assunto.nome}. Você pode resolver agora: ${d.como}`;
    case "orgao_externo":
      return `Seu caso é de: ${d.assunto.nome}. Esse assunto não é do Tribunal de Justiça do Pará. Procure: ${d.orgao.nome}${d.orgao.contato ? ` (${d.orgao.contato})` : ""}.`;
    case "atendente":
      return TEXTO_ENCAMINHADO;
  }
}
