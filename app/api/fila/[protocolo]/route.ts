import { NextResponse } from "next/server";
import { z } from "zod";
import { atualizar, mudarStatus, obter, registrar } from "@/lib/store";

const Patch = z.object({
  status: z.enum(["em_atendimento", "concluido"]).optional(),
  triagemCorreta: z.boolean().optional(),
  satisfacao: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ protocolo: string }> }) {
  const { protocolo } = await ctx.params;
  const at = obter(protocolo);
  if (!at) return NextResponse.json({ erro: "Protocolo não encontrado" }, { status: 404 });
  const dados = Patch.safeParse(await req.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  const { status, triagemCorreta, satisfacao } = dados.data;
  if (status) mudarStatus(at, status);
  if (triagemCorreta !== undefined) { at.triagemCorreta = triagemCorreta; registrar(at, "triagem_avaliada", { triagemCorreta }); }
  if (satisfacao !== undefined) { at.satisfacao = satisfacao; registrar(at, "satisfacao", { satisfacao }); }
  atualizar(at);
  return NextResponse.json(at);
}
