"use client";
import { useEffect, useRef, useState } from "react";
import { BotaoMicrofone, BotaoOuvir, calar, falar, temLeituraEmVoz, useDitado } from "./voz";

type Bolha = { papel: "cidadao" | "assistente"; texto: string };
type Resposta = {
  protocolo: string; tipo: string; texto: string; senha?: string | null; esperaMin?: number | null;
  unidade?: { nome: string; endereco: string | null; horario: string | null } | null;
  documentos?: string[]; advogado?: string | null;
};

const TEXTO_ADVOGADO: Record<string, string> = {
  nao: "Não precisa de advogado",
  sim: "Precisa de advogado (Defensoria Pública, se não puder pagar)",
  confirmar: "O atendente confirma se precisa de advogado",
};

/** Chat de triagem do cidadão. Usado em /cidadao e embutido no /hub. */
export function ChatTriagem() {
  const [bolhas, setBolhas] = useState<Bolha[]>([
    { papel: "assistente", texto: "Olá! Conte com suas palavras o que aconteceu. Pode escrever do seu jeito." },
  ]);
  const [texto, setTexto] = useState("");
  const [protocolo, setProtocolo] = useState<string | undefined>();
  const [final, setFinal] = useState<Resposta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [nota, setNota] = useState<number | null>(null);
  // Quem fala recebe a resposta falada; dá para ligar e desligar no botão
  const [emVoz, setEmVoz] = useState(false);
  const [podeLer, setPodeLer] = useState(false);
  useEffect(() => setPodeLer(temLeituraEmVoz()), []);
  const ditado = useDitado(setTexto);
  const fim = useRef<HTMLDivElement>(null);

  async function enviar(mensagem: string) {
    if (!mensagem.trim() || enviando) return;
    ditado.parar();
    setEnviando(true);
    setBolhas((b) => [...b, { papel: "cidadao", texto: mensagem }]);
    setTexto("");
    try {
      const canal = document.body.classList.contains("totem") ? "totem" : "web";
      const r = await fetch("/api/triagem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolo, mensagem, canal }),
      });
      const dados: Resposta = await r.json();
      setProtocolo(dados.protocolo);
      setBolhas((b) => [...b, { papel: "assistente", texto: dados.texto }]);
      if (dados.tipo !== "pergunta") setFinal(dados);
      if (emVoz) falar(dados.texto);
    } catch {
      setBolhas((b) => [...b, { papel: "assistente", texto: "Tivemos um problema. Procure o balcão de atendimento." }]);
    } finally {
      setEnviando(false);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  async function avaliar(n: number) {
    setNota(n);
    if (protocolo) await fetch(`/api/fila/${protocolo}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ satisfacao: n }) });
  }

  function microfone() {
    if (ditado.ouvindo) return ditado.parar();
    if (podeLer) setEmVoz(true);
    ditado.comecar(texto);
  }

  function recomecar() {
    calar();
    setBolhas([{ papel: "assistente", texto: "Olá! Conte com suas palavras o que aconteceu." }]);
    setProtocolo(undefined); setFinal(null); setNota(null);
  }

  return (
    <>
      <div className="card chat" aria-live="polite">
        {bolhas.map((b, i) => <div key={i} className={`bolha ${b.papel}`}>{b.texto}</div>)}
        {enviando && <div className="bolha assistente suave">Lendo o que você escreveu…</div>}
        <div ref={fim} />
      </div>

      {final ? (
        <div className={`card resultado ${final.tipo === "emergencia" ? "emergencia" : ""}`}>
          {final.senha && <><div className="suave">Sua senha</div><div className="senha">{final.senha}</div></>}
          {final.esperaMin != null && <p>{final.esperaMin > 0 ? `Espera prevista: cerca de ${final.esperaMin} min` : "Você é o próximo da fila"}</p>}
          {final.unidade && <p><strong>Onde:</strong> {final.unidade.nome}{final.unidade.endereco ? ` · ${final.unidade.endereco}` : ""}</p>}
          {final.documentos && final.documentos.length > 0 && (
            <><strong>O que levar:</strong><ul>{final.documentos.map((d) => <li key={d}>{d}</li>)}</ul></>
          )}
          {final.advogado && <p><strong>{TEXTO_ADVOGADO[final.advogado]}</strong></p>}
          <p><BotaoOuvir texto={final.texto} rotulo="Ouvir a resposta" /></p>
          <p className="suave">Protocolo: {final.protocolo}</p>
          <div className="estrelas linha">
            <span>Esse atendimento ajudou?</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={nota === n ? "" : "sec"} onClick={() => avaliar(n)} aria-label={`Nota ${n}`}>{n}</button>
            ))}
          </div>
          <p><button className="sec" onClick={recomecar}>Novo atendimento</button></p>
        </div>
      ) : (
        <div className="card">
          <label htmlFor="msg">Sua mensagem (escreva ou toque em Falar)</label>
          <div className="linha">
            <textarea id="msg" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
              placeholder="Ex.: comprei uma geladeira que chegou quebrada e a loja não quer trocar" />
            <BotaoMicrofone ouvindo={ditado.ouvindo} onClick={microfone} disabled={enviando} />
            <button onClick={() => enviar(texto)} disabled={enviando || !texto.trim()}>Enviar</button>
          </div>
          {ditado.ouvindo && <p className="suave" role="status">Pode falar. Quando terminar, confira o texto e toque em Enviar.</p>}
          {ditado.erro && <p className="erro-voz" role="alert">{ditado.erro}</p>}
          <div className="linha acoes-chat">
            <button className="sec" onClick={() => enviar("Quero falar com uma pessoa")} disabled={enviando}>Falar com uma pessoa</button>
            {podeLer && (
              <button className="sec" aria-pressed={emVoz} onClick={() => { if (emVoz) calar(); setEmVoz(!emVoz); }}>
                {emVoz ? "Respostas em voz alta: ligado" : "Ler respostas em voz alta"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
