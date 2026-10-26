// Parâmetros do sistema. Os valores vêm do .env.local (veja .env.example).
export const MAX_PERGUNTAS = 4; // até 4 perguntas; decidido em 26/10 (era 2)
// Salário mínimo 2026: R$ 1.621 (decreto federal). Confirme antes da demo.
export const SALARIO_MINIMO = Number(process.env.SALARIO_MINIMO || 1621);
export const CIDADES = (process.env.CIDADES || "Ananindeua").split(",").map((c) => c.trim()).filter(Boolean);
// Lista de modelos Gemini, em ordem de tentativa. Se um estiver sobrecarregado (503), lento ou no limite (429), tenta o próximo.
// Em 25/10 às 19h50, o gemini-3.8-flash e o 3.7 davam 503 ("high demand"); 3.5-flash e 3.5-flash-lite respondiam.
export const GEMINI_MODELS = (process.env.GEMINI_MODELS || "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.8-flash")
  .split(",").map((m) => m.trim()).filter(Boolean);
export const GEMINI_MODEL = GEMINI_MODELS[0];
export const TIMEOUT_IA_MS = 15_000;
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const CONFIANCA_MINIMA = 0.7;
export const MINUTOS_POR_ATENDIMENTO = 8; // usado na previsão de espera; ajustar com dados reais

export function slug(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/\s+/g, "_");
}
