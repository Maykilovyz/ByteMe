"use client";
import { useEffect, useState } from "react";

type Item = {
  protocolo: string; perfil: string; canal: string; status: string; senha: string | null;
  motivoEncaminhamento: string | null; unidadeNome: string | null; assuntoNome: string | null;
  ficha: Record<string, unknown> | null; historico: { papel: string; texto: string }[];
  triagemCorreta: boolean | null; advogado?: { oab: string; processo: string | null; motivoId: string; horario: string | null };
  criadoEm: string;
};

const ROTULO: Record<string, string> = {
  aguardando_atendimento: "Aguardando", em_atendimento: "Em atendimento", concluido: "Concluído",
  emergencia: "EMERGÊNCIA", encaminhado_humano: "Encaminhado",
};

export default function Atendente() {
  const [itens, setItens] = useState<Item[]>([]);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  async function carregar() {
    try { setItens(await (await fetch("/api/fila", { cache: "no-store" })).json()); } catch { /* tenta de novo no próximo ciclo */ }
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 3000); return () => clearInterval(t); }, []);

  async function patch(protocolo: string, corpo: object) {
    await fetch(`/api/fila/${protocolo}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    carregar();
  }

  const visiveis = itens
    .filter((i) => mostrarConcluidos || i.status !== "concluido")
    .sort((a, b) => (a.status === "emergencia" ? -1 : 0) - (b.status === "emergencia" ? -1 : 0));

  return (
    <>
      <h1>Fila do atendente</h1>
      <p className="linha">
        <span className="suave">Atualiza sozinha a cada 3 segundos · {visiveis.length} na fila</span>
        <label className="linha" style={{ fontWeight: 400 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={mostrarConcluidos} onChange={(e) => setMostrarConcluidos(e.target.checked)} /> mostrar concluídos
        </label>
      </p>
      {visiveis.length === 0 && <div className="card suave">Ninguém na fila.</div>}
      {visiveis.map((i) => {
        const f = i.ficha as Record<string, string | number | null> | null;
        return (
          <div key={i.protocolo} className="card">
            <div className="linha" style={{ justifyContent: "space-between" }}>
              <span className="senha" style={{ fontSize: "1.4rem" }}>{i.senha ?? "—"}</span>
              <span className={`etiqueta ${i.status === "emergencia" ? "emergencia" : ""}`}>{ROTULO[i.status] ?? i.status}</span>
            </div>
            <div className="suave">{i.protocolo} · {i.perfil} · {i.canal}{i.unidadeNome ? ` · ${i.unidadeNome}` : ""}</div>
            {i.motivoEncaminhamento && <p><strong>Por que veio para você:</strong> {i.motivoEncaminhamento}</p>}
            {i.advogado && <p>OAB {i.advogado.oab} · motivo {i.advogado.motivoId}{i.advogado.processo ? ` · processo ${i.advogado.processo}` : ""}{i.advogado.horario ? ` · horário ${i.advogado.horario}` : ""}</p>}
            {f && (
              <dl className="ficha">
                <dt>Assunto</dt><dd>{i.assuntoNome ?? String(f.assunto_id)}</dd>
                <dt>Resumo</dt><dd>{String(f.resumo ?? "")}</dd>
                <dt>Cidade</dt><dd>{String(f.cidade ?? "—")}</dd>
                <dt>Contra quem</dt><dd>{String(f.contra_quem ?? "—")}</dd>
                <dt>Valor</dt><dd>{f.valor_estimado_reais != null ? `R$ ${Number(f.valor_estimado_reais).toLocaleString("pt-BR")} (estimado)` : "—"}</dd>
                <dt>Urgência</dt><dd>{String(f.urgencia ?? "—")}</dd>
              </dl>
            )}
            {i.historico.length > 0 && (
              <details><summary>Conversa ({i.historico.length} mensagens)</summary>
                {i.historico.map((m, k) => <p key={k}><strong>{m.papel === "cidadao" ? "Cidadão" : "Sistema"}:</strong> {m.texto}</p>)}
              </details>
            )}
            <div className="linha" style={{ marginTop: 8 }}>
              {i.status !== "em_atendimento" && i.status !== "concluido" && <button onClick={() => patch(i.protocolo, { status: "em_atendimento" })}>Chamar</button>}
              {i.status !== "concluido" && <button className="sec" onClick={() => patch(i.protocolo, { status: "concluido" })}>Concluir</button>}
              {f && (
                <>
                  <span className="suave">Triagem correta?</span>
                  <button className={i.triagemCorreta === true ? "" : "sec"} onClick={() => patch(i.protocolo, { triagemCorreta: true })}>Sim</button>
                  <button className={i.triagemCorreta === false ? "perigo" : "sec"} onClick={() => patch(i.protocolo, { triagemCorreta: false })}>Não</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
