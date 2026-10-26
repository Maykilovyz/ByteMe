// Armazenamento. Duas opções com a mesma interface:
//  - Supabase, quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas (necessário para publicar na Vercel; esquema em docs/supabase-schema.sql);
//  - memória + arquivo data/runtime-db.json, para rodar no notebook sem conta nenhuma.
// A chave do Supabase fica só no servidor (nunca em código do navegador, nunca no GitHub).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MINUTOS_POR_ATENDIMENTO } from "./config";
import { medir } from "./tempo";
import type { Atendimento, Status } from "./tipos";

type Banco = { atendimentos: Record<string, Atendimento>; contadorSenha: number; contadorProtocolo: number };

const ARQUIVO = path.join(process.cwd(), "data", "runtime-db.json");
const g = globalThis as unknown as { __byteme?: Banco };

const usaSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function banco(): Banco {
  if (!g.__byteme) {
    g.__byteme = existsSync(ARQUIVO)
      ? JSON.parse(readFileSync(ARQUIVO, "utf8"))
      : { atendimentos: {}, contadorSenha: 0, contadorProtocolo: 0 };
  }
  return g.__byteme!;
}

function salvar() {
  try { writeFileSync(ARQUIVO, JSON.stringify(banco(), null, 2)); } catch { /* ambiente sem disco gravável: fica só em memória */ }
}

/** Chamada à API REST do Supabase (PostgREST). Lança erro com o texto devolvido, sem incluir a chave. */
async function sb(caminho: string, init: RequestInit = {}): Promise<Response> {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${caminho}`;
  const headers: Record<string, string> = { apikey: chave, "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (chave.startsWith("eyJ")) headers.Authorization = `Bearer ${chave}`; // chaves antigas (JWT); as novas (sb_secret_) só usam apikey
  const r = await medir(`supabase ${init.method ?? "GET"} ${caminho.split("?")[0]}`, () => fetch(url, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(10_000) }));
  if (!r.ok) throw new Error(`Supabase ${r.status} em ${caminho.split("?")[0]}: ${(await r.text()).slice(0, 200)}`);
  return r;
}

/** Lê o JSON da resposta; se vier uma página da web, a URL do projeto está errada. */
async function lerJson<T>(r: Response): Promise<T> {
  if (!(r.headers.get("content-type") ?? "").includes("json")) {
    throw new Error("Supabase: a SUPABASE_URL parece errada (devolveu uma página, não dados). Use a Project URL, tipo https://xxxx.supabase.co, sem /dashboard e sem /rest/v1.");
  }
  return (await r.json()) as T;
}

async function proximoContador(nome: string): Promise<number> {
  const r = await sb("rpc/proximo_contador", { method: "POST", body: JSON.stringify({ p_nome: nome }) });
  return Number(await lerJson<number>(r));
}

const agora = () => new Date().toISOString();

export async function criarAtendimento(perfil: Atendimento["perfil"], canal: string): Promise<Atendimento> {
  const data = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let numero: number;
  if (usaSupabase()) numero = await proximoContador(`protocolo:${data}`);
  else numero = ++banco().contadorProtocolo;
  const protocolo = `BM-${data}-${String(numero).padStart(4, "0")}`;
  const at: Atendimento = {
    protocolo, perfil, canal, status: "em_triagem", historicoStatus: [{ status: "em_triagem", em: agora() }],
    historico: [], perguntasFeitas: 0, ficha: null, decisao: null, motivoEncaminhamento: null, senha: null,
    unidadeId: null, respostaAoCidadao: null, triagemCorreta: null, satisfacao: null, registros: [], criadoEm: agora(),
  };
  await atualizar(at);
  return at;
}

export async function obter(protocolo: string): Promise<Atendimento | undefined> {
  if (!usaSupabase()) return banco().atendimentos[protocolo];
  const r = await sb(`atendimentos?protocolo=eq.${encodeURIComponent(protocolo)}&select=dados`);
  const linhas = await lerJson<{ dados: Atendimento }[]>(r);
  return linhas[0]?.dados;
}

export async function atualizar(at: Atendimento): Promise<void> {
  if (!usaSupabase()) {
    banco().atendimentos[at.protocolo] = at;
    salvar();
    return;
  }
  await sb("atendimentos?on_conflict=protocolo", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ protocolo: at.protocolo, status: at.status, unidade_id: at.unidadeId, criado_em: at.criadoEm, dados: at }),
  });
}

export function mudarStatus(at: Atendimento, status: Status) {
  at.status = status;
  at.historicoStatus.push({ status, em: agora() });
  registrar(at, `status:${status}`);
}

/** Toda decisão fica gravada com o motivo (auditoria e indicadores). */
export function registrar(at: Atendimento, evento: string, detalhe?: unknown) {
  at.registros.push({ em: agora(), evento, detalhe });
}

export async function gerarSenha(prefixo: "C" | "A"): Promise<string> {
  const numero = usaSupabase() ? await proximoContador("senha") : ++banco().contadorSenha;
  return `${prefixo}${String(numero).padStart(3, "0")}`;
}

export async function previsaoEsperaMin(unidadeId: string | null): Promise<number> {
  let naFrente: number;
  if (usaSupabase()) {
    const filtroUnidade = unidadeId == null ? "" : `&unidade_id=eq.${encodeURIComponent(unidadeId)}`;
    const r = await sb(`atendimentos?status=eq.aguardando_atendimento${filtroUnidade}&select=protocolo`);
    naFrente = (await lerJson<unknown[]>(r)).length;
  } else {
    naFrente = Object.values(banco().atendimentos).filter(
      (a) => a.status === "aguardando_atendimento" && (unidadeId == null || a.unidadeId === unidadeId)
    ).length;
  }
  return naFrente * MINUTOS_POR_ATENDIMENTO;
}

export async function listar(): Promise<Atendimento[]> {
  if (!usaSupabase()) return Object.values(banco().atendimentos).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const r = await sb("atendimentos?select=dados&order=criado_em.asc&limit=1000");
  return (await lerJson<{ dados: Atendimento }[]>(r)).map((l) => l.dados);
}
