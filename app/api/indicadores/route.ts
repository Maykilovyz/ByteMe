import { NextResponse } from "next/server";
import { listar } from "@/lib/store";

export const dynamic = "force-dynamic";

// Sugestão dos 4 números do painel (a decidir pelo Mayke). Todos saem dos status gravados.
export async function GET() {
  const todos = await listar();
  const minutos = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  const esperas = todos.flatMap((at) => {
    const ini = at.historicoStatus.find((h) => h.status === "aguardando_atendimento");
    const fim = at.historicoStatus.find((h) => h.status === "em_atendimento");
    return ini && fim ? [minutos(ini.em, fim.em)] : [];
  });
  const finalizados = todos.filter((a) => a.status !== "em_triagem");
  const avaliados = todos.filter((a) => a.triagemCorreta !== null);
  const notas = todos.flatMap((a) => (a.satisfacao ? [a.satisfacao] : []));
  const media = (xs: number[]) => (xs.length ? Number((xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1)) : null);
  return NextResponse.json({
    tempoMedioEsperaMin: media(esperas),
    pctResolvidoSemFila: finalizados.length ? Math.round((100 * finalizados.filter((a) => a.status === "resolvido_sem_fila").length) / finalizados.length) : null,
    pctTriagemCorreta: avaliados.length ? Math.round((100 * avaliados.filter((a) => a.triagemCorreta).length) / avaliados.length) : null,
    satisfacaoMedia: media(notas),
    total: todos.length,
  });
}
