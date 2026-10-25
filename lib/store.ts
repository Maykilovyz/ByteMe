// Armazenamento simples para a versão 0: memória + arquivo data/runtime-db.json (roda no notebook com `npm run dev`).
// Para publicar na Vercel, trocar por Supabase (esquema em docs/supabase-schema.sql). As funções abaixo são a interface.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MINUTOS_POR_ATENDIMENTO } from "./config";
import type { Atendimento, Status } from "./tipos";

type Banco = { atendimentos: Record<string, Atendimento>; contadorSenha: number; contadorProtocolo: number };

const ARQUIVO = path.join(process.cwd(), "data", "runtime-db.json");
const g = globalThis as unknown as { __byteme?: Banco };

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

const agora = () => new Date().toISOString();

export function criarAtendimento(perfil: Atendimento["perfil"], canal: string): Atendimento {
  const b = banco();
  b.contadorProtocolo += 1;
  const data = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const protocolo = `BM-${data}-${String(b.contadorProtocolo).padStart(4, "0")}`;
  const at: Atendimento = {
    protocolo, perfil, canal, status: "em_triagem", historicoStatus: [{ status: "em_triagem", em: agora() }],
    historico: [], perguntasFeitas: 0, ficha: null, decisao: null, motivoEncaminhamento: null, senha: null,
    unidadeId: null, respostaAoCidadao: null, triagemCorreta: null, satisfacao: null, registros: [], criadoEm: agora(),
  };
  b.atendimentos[protocolo] = at;
  salvar();
  return at;
}

export const obter = (protocolo: string) => banco().atendimentos[protocolo];

export function atualizar(at: Atendimento) {
  banco().atendimentos[at.protocolo] = at;
  salvar();
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

export function gerarSenha(prefixo: "C" | "A"): string {
  const b = banco();
  b.contadorSenha += 1;
  return `${prefixo}${String(b.contadorSenha).padStart(3, "0")}`;
}

export function previsaoEsperaMin(unidadeId: string | null): number {
  const naFrente = Object.values(banco().atendimentos).filter(
    (a) => a.status === "aguardando_atendimento" && (unidadeId == null || a.unidadeId === unidadeId)
  ).length;
  return naFrente * MINUTOS_POR_ATENDIMENTO;
}

export function listar(): Atendimento[] {
  return Object.values(banco().atendimentos).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}
