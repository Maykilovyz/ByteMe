import { NextResponse } from "next/server";
import { z } from "zod";
import { motivoPorId, orgaoPorId, unidadePorId } from "@/lib/dados";
import { atualizar, criarAtendimento, gerarSenha, mudarStatus, obter, previsaoEsperaMin, registrar } from "@/lib/store";

// OAB: UF + número (ex.: PA 12345). Na demo só se confere o formato; validar na OAB fica para a implantação.
const Entrada = z.object({
  oab: z.string().regex(/^[A-Za-z]{2}\s?\d{3,6}$/, "OAB no formato UF + número, ex.: PA 12345"),
  processo: z.string().max(30).optional().nullable(),
  motivoId: z.string(),
  unidadeId: z.string().optional().nullable(),
});

function horariosSimulados(): string[] {
  const out: string[] = [];
  const d = new Date();
  while (out.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    out.push(`${d.toLocaleDateString("pt-BR")} às ${["09:00", "10:30", "13:00"][out.length]}`);
  }
  return out;
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  // Segunda etapa: confirmar horário escolhido.
  if (corpo?.protocolo && corpo?.horario) {
    const at = await obter(corpo.protocolo);
    if (!at?.advogado) return NextResponse.json({ erro: "Protocolo não encontrado" }, { status: 404 });
    at.advogado.horario = String(corpo.horario);
    registrar(at, "horario_agendado", { horario: at.advogado.horario });
    mudarStatus(at, "aguardando_atendimento");
    await atualizar(at);
    return NextResponse.json({ protocolo: at.protocolo, tipo: "agendado", texto: `Agendado para ${at.advogado.horario}. Protocolo ${at.protocolo}.` });
  }

  const dados = Entrada.safeParse(corpo);
  if (!dados.success) return NextResponse.json({ erro: dados.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const { oab, processo, motivoId, unidadeId } = dados.data;
  const motivo = motivoPorId(motivoId);
  if (!motivo) return NextResponse.json({ erro: "Motivo inválido" }, { status: 400 });

  const at = await criarAtendimento("advogado", "web");
  at.advogado = { oab: oab.toUpperCase(), processo: processo ?? null, motivoId, horario: null };
  at.unidadeId = unidadeId ?? null;
  registrar(at, "menu_advogado", { motivoId, unidadeId });

  if (motivoId === "suporte_sistema") {
    const o = orgaoPorId("suporte_sistemas_tjpa");
    mudarStatus(at, "resolvido_sem_fila");
    await atualizar(at);
    return NextResponse.json({ protocolo: at.protocolo, tipo: "suporte", texto: `Para login, assinatura ou sistema eletrônico, use o ${o?.nome ?? "suporte oficial do TJPA"}${o?.link ? `: ${o.link}` : ""}.` });
  }
  if (motivo.precisaHorario) {
    await atualizar(at);
    return NextResponse.json({ protocolo: at.protocolo, tipo: "horarios", texto: `${motivo.motivo} precisa de horário marcado. Escolha um:`, horarios: horariosSimulados() });
  }
  at.senha = await gerarSenha("A");
  const espera = await previsaoEsperaMin(at.unidadeId);
  mudarStatus(at, "aguardando_atendimento");
  await atualizar(at);
  const u = unidadePorId(at.unidadeId);
  return NextResponse.json({ protocolo: at.protocolo, tipo: "fila", texto: `Senha ${at.senha}${u ? ` para ${u.nome}` : ""}. ${espera > 0 ? `Espera prevista: cerca de ${espera} min.` : "Você é o próximo."}` });
}
