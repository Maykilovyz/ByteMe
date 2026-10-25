import assuntosJson from "@/data/assuntos.json";
import unidadesJson from "@/data/unidades.json";
import orgaosJson from "@/data/orgaos.json";
import motivosJson from "@/data/motivos-advogado.json";
import type { Assunto, MotivoAdvogado, Orgao, Unidade } from "./tipos";

export const ASSUNTOS = assuntosJson as Assunto[];
export const UNIDADES = unidadesJson as Unidade[];
export const ORGAOS = orgaosJson as Orgao[];
export const MOTIVOS_ADVOGADO = motivosJson as MotivoAdvogado[];

export const assuntoPorId = (id: string | null | undefined) => ASSUNTOS.find((a) => a.id === id);
export const unidadePorId = (id: string | null | undefined) => UNIDADES.find((u) => u.id === id);
export const orgaoPorId = (id: string | null | undefined) => ORGAOS.find((o) => o.id === id);
export const motivoPorId = (id: string | null | undefined) => MOTIVOS_ADVOGADO.find((m) => m.id === id);

/** Assunto exige cidade quando é do TJPA e não se resolve na hora. */
export const exigeCidade = (a: Assunto) => a.competencia === "TJPA" && !a.resolveNaHora;

/** Órgão externo padrão por competência, quando o assunto não é do TJPA. */
export const ORGAO_POR_COMPETENCIA: Record<string, string> = {
  "Justiça do Trabalho": "trt8",
  "Justiça Federal": "jef_dpu",
};
