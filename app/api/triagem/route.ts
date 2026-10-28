import { NextResponse } from "next/server";
import { z } from "zod";
import { modoSimulador } from "@/lib/config";
import { triar } from "@/lib/orquestrador";
import { medir } from "@/lib/tempo";

const Entrada = z.object({
  protocolo: z.string().optional(),
  mensagem: z.string().min(1).max(2000),
  canal: z.enum(["web", "totem", "whatsapp", "balcao"]).optional(),
});

export async function POST(req: Request) {
  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Mensagem inválida" }, { status: 400 });
  const resposta = await medir("POST /api/triagem (total)", () => triar(dados.data));
  // modoDemo: a tela avisa que as respostas vêm do simulador, não da IA.
  return NextResponse.json({ ...resposta, modoDemo: modoSimulador() });
}
