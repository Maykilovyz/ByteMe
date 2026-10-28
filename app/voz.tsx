"use client";
// Falar em vez de escrever: ditado pelo microfone e leitura em voz alta, com o que o navegador já tem (Web Speech API).
// O ditado existe no Chrome, Edge e Safari (não no Firefox) e só funciona em https ou localhost.
// No Chrome, o áudio do ditado é processado pelo Google: veja a nota de LGPD no README.
import { useCallback, useEffect, useRef, useState } from "react";

type Resultado = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type Reconhecimento = {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<Resultado> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function criarReconhecimento(): Reconhecimento | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
  const Classe = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

const ERROS: Record<string, string> = {
  "not-allowed": "O navegador não deixou usar o microfone. Toque no cadeado da barra de endereço e permita o microfone.",
  "service-not-allowed": "O navegador não deixou usar o microfone. Toque no cadeado da barra de endereço e permita o microfone.",
  "no-speech": "Não ouvimos nada. Toque em Falar e tente de novo, mais perto do microfone.",
  "audio-capture": "Não achamos um microfone neste aparelho.",
  network: "O ditado precisa de internet. Tente de novo ou escreva.",
};

/** Por que o ditado não pode funcionar aqui, ou null. O botão Falar fica sempre à vista e mostra este motivo em vez de sumir. */
function motivoSemDitado(): string | null {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  if (!w.SpeechRecognition && !w.webkitSpeechRecognition)
    return "Este navegador não tem ditado por voz. Abra a página no Chrome, no Edge ou no Safari. No Firefox e dentro de apps (WhatsApp, Instagram) o microfone não funciona.";
  if (!window.isSecureContext)
    return "O microfone só funciona quando a página é aberta por um endereço https ou por localhost. Pelo IP da rede (http://192.168…) o navegador bloqueia.";
  return null;
}

/** Ditado: escreve no campo o que a pessoa fala, para ela conferir antes de enviar. Falar de novo continua o texto. */
export function useDitado(aoMudar: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rec = useRef<Reconhecimento | null>(null);

  useEffect(() => () => rec.current?.abort(), []);

  const parar = useCallback(() => rec.current?.stop(), []);
  const comecar = useCallback((textoAtual: string) => {
    const motivo = motivoSemDitado();
    if (motivo) return setErro(motivo);
    const r = criarReconhecimento();
    if (!r) return;
    rec.current?.abort();
    calar(); // não ouvir a própria leitura em voz alta
    r.lang = "pt-BR";
    r.interimResults = true; // o texto aparece enquanto a pessoa fala
    r.continuous = false; // para sozinho depois de uma pausa
    const antes = textoAtual.trim() ? `${textoAtual.trim()} ` : "";
    r.onresult = (e) => {
      let falado = "";
      for (let i = 0; i < e.results.length; i++) falado += e.results[i][0].transcript;
      aoMudar(antes + falado.trim());
    };
    r.onerror = (e) => setErro(ERROS[e.error] ?? null);
    r.onend = () => setOuvindo(false);
    rec.current = r;
    setErro(null);
    setOuvindo(true);
    try { r.start(); } catch { setOuvindo(false); setErro("Não deu para ligar o microfone. Tente de novo ou escreva."); }
  }, [aoMudar]);

  return { ouvindo, erro, comecar, parar };
}

export const temLeituraEmVoz = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Lê o texto em voz alta, em português do Brasil, um pouco mais devagar que o normal. */
export function falar(texto: string, aoTerminar?: () => void) {
  if (!temLeituraEmVoz()) return;
  speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 0.95;
  const voz = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase() === "pt-br");
  if (voz) fala.voice = voz;
  if (aoTerminar) { fala.onend = aoTerminar; fala.onerror = aoTerminar; }
  speechSynthesis.speak(fala);
}

export function calar() {
  if (temLeituraEmVoz()) speechSynthesis.cancel();
}

/** Botão de microfone. */
export function BotaoMicrofone({ ouvindo, onClick, disabled }: { ouvindo: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={`mic${ouvindo ? " ouvindo" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={ouvindo}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0 M12 18v3 M8 21h8" />
      </svg>
      <span>{ouvindo ? "Ouvindo… toque para parar" : "Falar"}</span>
    </button>
  );
}

/** Botão "Ouvir": lê um texto em voz alta; tocar de novo para. */
export function BotaoOuvir({ texto, rotulo = "Ouvir" }: { texto: string; rotulo?: string }) {
  const [lendo, setLendo] = useState(false);
  const [existe, setExiste] = useState(false);
  const lendoAgora = useRef(false);
  const mudar = (v: boolean) => { lendoAgora.current = v; setLendo(v); };
  useEffect(() => {
    setExiste(temLeituraEmVoz());
    return () => { if (lendoAgora.current) calar(); }; // saiu da tela no meio da leitura
  }, []);
  if (!existe) return null;
  return (
    <button type="button" className="sec ouvir" aria-pressed={lendo}
      onClick={() => { if (lendo) { calar(); mudar(false); } else { mudar(true); falar(texto, () => mudar(false)); } }}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12" />
      </svg>
      <span>{lendo ? "Parar leitura" : rotulo}</span>
    </button>
  );
}
