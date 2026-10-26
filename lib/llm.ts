// Única parte do sistema que fala com a IA. Trocar de provedor = mexer só neste arquivo.
import { z } from "zod";
import { GEMINI_MODELS, GROQ_MODEL, TIMEOUT_IA_MS } from "./config";
import { montarPrompt } from "./prompt";
import { medir } from "./tempo";
import type { Mensagem } from "./tipos";

export const FichaSchema = z.object({
  risco_imediato: z.boolean(),
  quer_humano: z.boolean(),
  assunto_id: z.string(),
  confianca: z.number().min(0).max(1),
  cidade: z.string().nullable(),
  contra_quem: z.string().nullable(),
  valor_estimado_reais: z.number().nullable(),
  urgencia: z.enum(["baixa", "media", "alta"]),
  tipo_autor: z.enum(["pessoa_fisica", "mei_me_epp", "outra_empresa"]).nullable(),
  resumo: z.string(),
  pergunta_pendente: z.string().nullable(),
});
export type Ficha = z.infer<typeof FichaSchema>;

export type ResultadoLLM = { ficha: Ficha; provedor: string; bruto: string; ms: number };

/** Erro que vale a pena tentar em outro modelo: sobrecarga (503), limite (429), demora ou erro do servidor. */
class ErroTemporario extends Error {}

/** Modelos que acabaram de recusar por limite (429): pulados até a hora indicada, para não gastar uma viagem de rede por mensagem. */
const g = globalThis as unknown as { __bloqueadosGemini?: Map<string, number> };
const bloqueados = () => (g.__bloqueadosGemini ??= new Map<string, number>());

/** Segundos de espera pedidos pelo Google num erro 429 ("retryDelay": "25400s"); sem a informação, 30 s. */
function esperaDoLimite(corpo: unknown): number {
  const detalhes = (corpo as { error?: { details?: { retryDelay?: string }[] } })?.error?.details ?? [];
  const texto = detalhes.map((d) => d.retryDelay).find(Boolean);
  const seg = texto ? parseFloat(texto) : NaN;
  return Number.isFinite(seg) ? Math.min(Math.max(seg, 5), 6 * 3600) : 30;
}

function transcricao(historico: Mensagem[]): string {
  return historico.map((m) => `${m.papel === "cidadao" ? "Cidadão" : "Assistente"}: ${m.texto}`).join("\n");
}

/** Remove cercas ```json ... ``` e texto solto em volta do JSON. */
export function extrairJson(texto: string): unknown {
  const limpo = texto.replace(/```(?:json)?/gi, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim < ini) throw new Error("Resposta sem JSON");
  return JSON.parse(limpo.slice(ini, fim + 1));
}

async function chamarGemini(modelo: string, system: string, usuario: string): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("GEMINI_API_KEY não configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
  const resp = await medir(`gemini ${modelo}`, () => fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: usuario }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_IA_MS),
  })).catch((e) => { throw new ErroTemporario(`${modelo}: sem resposta (${String(e).slice(0, 80)})`); });
  if (resp.status === 429) {
    const seg = esperaDoLimite(await resp.json().catch(() => null));
    bloqueados().set(modelo, Date.now() + seg * 1000);
    throw new ErroTemporario(`${modelo}: limite de uso (HTTP 429), pulado por ${Math.round(seg)} s`);
  }
  if (resp.status >= 500) throw new ErroTemporario(`${modelo}: HTTP ${resp.status}`);
  const corpo = await resp.json();
  if (!resp.ok) throw new Error(`Gemini ${modelo} ${resp.status}: ${JSON.stringify(corpo).slice(0, 300)}`);
  const texto = corpo?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!texto) throw new Error(`Gemini sem texto: ${JSON.stringify(corpo).slice(0, 300)}`);
  return texto;
}

async function chamarGroq(system: string, usuario: string): Promise<string> {
  const chave = process.env.GROQ_API_KEY;
  if (!chave) throw new Error("GROQ_API_KEY não configurada");
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: usuario }],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_IA_MS),
  });
  const corpo = await resp.json();
  if (!resp.ok) throw new Error(`Groq ${resp.status}: ${JSON.stringify(corpo).slice(0, 300)}`);
  return corpo?.choices?.[0]?.message?.content ?? "";
}

async function tentar(chamar: (system: string, usuario: string) => Promise<string>, nome: string, system: string, usuario: string) {
  let ultimoErro: unknown;
  for (let i = 0; i < 2; i++) { // 1 tentativa + 1 repetição se o JSON vier inválido
    const bruto = await chamar(system, usuario);
    try {
      const ficha = FichaSchema.parse(extrairJson(bruto));
      return { ficha, bruto };
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw new Error(`${nome}: JSON inválido duas vezes: ${String(ultimoErro).slice(0, 200)}`);
}

/** Monta a ficha a partir da conversa. Tenta cada modelo Gemini da lista; se todos falharem, tenta o Groq (se houver chave). */
export async function llmMontaFicha(historico: Mensagem[], perguntasFeitas: number): Promise<ResultadoLLM> {
  const system = montarPrompt(perguntasFeitas);
  const usuario = `CONVERSA ATÉ AGORA:\n${transcricao(historico)}`;
  const t0 = Date.now();
  const erros: string[] = [];
  for (const modelo of GEMINI_MODELS) {
    if ((bloqueados().get(modelo) ?? 0) > Date.now()) { erros.push(`${modelo}: pulado (limite de uso)`); continue; }
    try {
      const r = await tentar((s, u) => chamarGemini(modelo, s, u), modelo, system, usuario);
      return { ...r, provedor: `gemini:${modelo}`, ms: Date.now() - t0 };
    } catch (e) {
      erros.push(String(e).slice(0, 120));
      if (!(e instanceof ErroTemporario)) break; // erro de chave ou de pedido: outro modelo não resolve
    }
  }
  if (process.env.GROQ_API_KEY) {
    const r = await tentar(chamarGroq, GROQ_MODEL, system, usuario);
    return { ...r, provedor: `groq:${GROQ_MODEL}`, ms: Date.now() - t0 };
  }
  throw new Error(`Nenhum modelo respondeu: ${erros.join(" | ")}`);
}
