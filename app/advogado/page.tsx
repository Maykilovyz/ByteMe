"use client";
import { useState } from "react";
import motivos from "@/data/motivos-advogado.json";
import unidades from "@/data/unidades.json";

type Resp = { protocolo?: string; tipo?: string; texto?: string; horarios?: string[]; erro?: string };

export default function Advogado() {
  const [oab, setOab] = useState("");
  const [processo, setProcesso] = useState("");
  const [motivoId, setMotivoId] = useState(motivos[0]?.id ?? "");
  const [unidadeId, setUnidadeId] = useState("");
  const [resp, setResp] = useState<Resp | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(corpo: object) {
    setEnviando(true);
    const r = await fetch("/api/advogado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    setResp(await r.json());
    setEnviando(false);
  }

  return (
    <>
      <h1>Atendimento ao advogado</h1>
      <div className="card">
        <label htmlFor="oab">Número da OAB (UF + número)</label>
        <input id="oab" value={oab} onChange={(e) => setOab(e.target.value)} placeholder="PA 12345" />
        <label htmlFor="proc">Número do processo (opcional)</label>
        <input id="proc" value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="0000000-00.0000.8.14.0000" />
        <label htmlFor="motivo">Motivo</label>
        <select id="motivo" value={motivoId} onChange={(e) => setMotivoId(e.target.value)}>
          {motivos.map((m) => <option key={m.id} value={m.id}>{m.motivo}</option>)}
        </select>
        <label htmlFor="vara">Vara ou setor</label>
        <select id="vara" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
          <option value="">Não sei / não se aplica</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <p><button disabled={enviando || !oab} onClick={() => enviar({ oab, processo: processo || null, motivoId, unidadeId: unidadeId || null })}>Continuar</button></p>
      </div>

      {resp && (
        <div className={`card ${resp.erro ? "" : "resultado"}`}>
          {resp.erro ? <p style={{ color: "var(--alerta)" }}>{resp.erro}</p> : <p>{resp.texto}</p>}
          {resp.horarios && (
            <div className="linha">
              {resp.horarios.map((h) => <button key={h} className="sec" onClick={() => enviar({ protocolo: resp.protocolo, horario: h })}>{h}</button>)}
            </div>
          )}
          {resp.protocolo && <p className="suave">Protocolo: {resp.protocolo}</p>}
        </div>
      )}
    </>
  );
}
