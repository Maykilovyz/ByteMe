import { NextResponse } from "next/server";
import { unidadePorId, assuntoPorId } from "@/lib/dados";
import { listar } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Fila do atendente: tudo que não está em triagem nem resolvido sem fila. */
export async function GET() {
  const itens = listar()
    .filter((a) => !["em_triagem", "resolvido_sem_fila"].includes(a.status))
    .map((a) => ({
      ...a,
      unidadeNome: unidadePorId(a.unidadeId)?.nome ?? null,
      assuntoNome: assuntoPorId((a.ficha as { assunto_id?: string } | null)?.assunto_id)?.nome ?? null,
    }));
  return NextResponse.json(itens);
}
