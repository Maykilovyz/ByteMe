import { NextResponse } from "next/server";
import { z } from "zod";
import { triar } from "@/lib/orquestrador";

const Entrada = z.object({
  protocolo: z.string().optional(),
  mensagem: z.string().min(1).max(2000),
  canal: z.enum(["web", "totem", "whatsapp", "balcao"]).optional(),
});

export async function POST(req: Request) {
  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Mensagem inválida" }, { status: 400 });
  const resposta = await triar(dados.data);
  return NextResponse.json(resposta);
}
