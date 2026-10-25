// Checagens baratas, sem IA, feitas em TODA mensagem antes de chamar a IA.
// Errar para mais custa pouco (chama atendente); errar para menos é grave.
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PALAVRAS_RISCO = [
  "vai me matar", "vou morrer", "me matar", "me mata", "vai matar", "te mata", "te matar", "matar", "me bate", "me bateu", "bateu em mim",
  "me agrediu", "agressao", "agrediu", "ameacou", "ameaca", "ameacando", "arma", "faca", "revolver",
  "estupro", "abuso", "abusou", "medo de voltar pra casa", "medo de voltar para casa", "me espancou",
  "violencia", "vai me pegar", "me pega",
];

const PEDIDOS_HUMANO = [
  "falar com uma pessoa", "falar com alguem", "falar com atendente", "quero um atendente",
  "falar com um humano", "atendimento humano", "pessoa de verdade", "falar com gente",
];

export function riscoPorPalavras(texto: string): boolean {
  const t = normalizar(texto);
  return PALAVRAS_RISCO.some((p) => t.includes(p));
}

export function pediuHumano(texto: string): boolean {
  const t = normalizar(texto);
  return PEDIDOS_HUMANO.some((p) => t.includes(p));
}
