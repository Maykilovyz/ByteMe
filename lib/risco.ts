// Checagens baratas, sem IA, feitas em TODA mensagem antes de chamar a IA.
// Errar para mais custa pouco (chama atendente); errar para menos é grave.
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Para o risco o "ç" fica: sem ele, "faça" vira "faca" e "quero que a loja faça a troca" dava alerta de perigo.
// Isso ficou frequente com o ditado por voz, que escreve sempre com acento e cedilha.
const normalizarRisco = (t: string) => t.toLowerCase().replace(/ç/g, "\u0001").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\u0001/g, "ç");

// Expressões inteiras, não pedaços de palavra: "arma" não pega "farmácia" nem "armário".
// Quem escreve "ameacou" ou "faca" sem cedilha ainda dispara; errar para mais é o lado seguro.
const PALAVRAS_RISCO = [
  "vai me matar", "vou morrer", "me matar", "me mat(a|ando)", "vai matar", "te mata", "te matar", "mat(ar|ou|aram|arem)", "me bat(e|eu|endo|er)", "bateu em mim",
  "me agrediu", "agress(ao|oes|or|ora)", "agrediu", "amea[cç](a|as|ou|ando|ado|ada)", "arma(s|do|da)?", "faca(s|da)?", "revolver",
  "estupr(o|ou|ada|ador)", "abus(o|os|ou|ada|ador)", "medo de voltar pra casa", "medo de voltar para casa", "me espancou",
  "violencias?", "vai me pegar", "me pega",
];
const RISCO = new RegExp(`(?<![a-zç])(${PALAVRAS_RISCO.join("|")})(?![a-zç])`);

const PEDIDOS_HUMANO = [
  "falar com uma pessoa", "falar com alguem", "falar com atendente", "quero um atendente",
  "falar com um humano", "atendimento humano", "pessoa de verdade", "falar com gente",
];

export function riscoPorPalavras(texto: string): boolean {
  return RISCO.test(normalizarRisco(texto));
}

export function pediuHumano(texto: string): boolean {
  const t = normalizar(texto);
  return PEDIDOS_HUMANO.some((p) => t.includes(p));
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
