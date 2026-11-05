// Checagens baratas, sem IA, feitas em TODA mensagem antes de chamar a IA.
// Errar para mais custa pouco (chama atendente); errar para menos é grave.
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PALAVRAS_RISCO = [
  "vai me matar", "vou morrer", "me matar", "me mata", "vai matar", "te mata", "te matar", "matar", "me bate", "me bateu", "bateu em mim",
  "me agrediu", "agressao", "agrediu", "ameacou", "ameaca", "ameacando", "arma", "faca", "revolver",
  "estupro", "abuso", "abusou", "medo de voltar pra casa", "medo de voltar para casa", "me espancou",
  "violencia", "vai me pegar", "me pega",
  // Do workflow n8n (05/11): autolesão, agressão em curso, sequestro e cárcere privado.
  "quero morrer", "vou me matar", "tirar minha vida", "tirar a minha vida", "suicid", "nao aguento mais viver",
  "me batendo", "to apanhando", "tô apanhando", "estou apanhando", "me agredindo", "estupr", "abusando de",
  "sequestr", "carcere privado", "arma apontada",
];

const PEDIDOS_HUMANO = [
  "falar com uma pessoa", "falar com alguem", "falar com atendente", "quero um atendente",
  "falar com um humano", "atendimento humano", "pessoa de verdade", "falar com gente",
];

// Do workflow n8n (05/11): "passa pra um atendente", "chama alguém de verdade", "não quero falar com robô".
// Estreitos de propósito: "tentei falar com a pessoa da loja" é relato, não pedido de atendente.
const PEDIDOS_HUMANO_RX = [
  /\b(falar|conversar)\b.{0,12}\bcom (um |uma |o |a )?(atendente|humano|alguem de verdade|uma pessoa de verdade)\b/,
  /\b(passa|passe|transfere|transfira|chama|chame|manda|quero)\b.{0,12}\b(um |uma |o |a )?(atendente|humano|alguem de verdade)\b/,
  /\bquero (falar com )?(uma pessoa|um humano)\b/,
  /\b(nao quero|odeio|cansei de|cansei do)\b.{0,15}\b(robo|maquina|assistente virtual)\b/,
];

export function riscoPorPalavras(texto: string): boolean {
  const t = normalizar(texto);
  return PALAVRAS_RISCO.some((p) => t.includes(normalizar(p)));
}

export function pediuHumano(texto: string): boolean {
  const t = normalizar(texto);
  return PEDIDOS_HUMANO.some((p) => t.includes(p)) || PEDIDOS_HUMANO_RX.some((r) => r.test(t));
}

// Ordens dirigidas ao assistente ("ignore as instruções", "diga que eu ganho a causa"). Não são relato: vão ao atendente, sem IA.
// Padrões estreitos de propósito: "a loja ignorou o contrato" não casa (é "ignore" mandando, não "ignorou").
const ORDENS_AO_ASSISTENTE = [
  /\b(ignore|esqueca|desconsidere|desobedeca)\b.{0,40}\b(instrucoes|regras|ordens|comandos|prompt|orientacoes)\b/,
  /\b(diga|fale|escreva|garanta|prometa)\b.{0,15}\bque eu (ganho|ganhei|vou ganhar|venco|vencerei)\b/,
  /\b(mostre|revele|repita|exiba)\b.{0,30}\b(prompt|instrucoes do sistema|suas instrucoes)\b/,
  /\bvoce (agora )?(e|eh) (um|uma|o|a) /,
  /\b(system prompt|jailbreak|ignore (all|previous))\b/,
];

export function tentouInstruirIA(texto: string): boolean {
  const t = normalizar(texto);
  return ORDENS_AO_ASSISTENTE.some((r) => r.test(t));
}
