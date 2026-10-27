"use client";
import { useEffect, useState } from "react";

const TAMANHOS = [16, 18, 20, 22, 24];

/** Barra de acessibilidade (eMAG / Res. CNJ 401/2021): atalhos, tamanho da letra, contraste, Libras e leitura em voz. */
export function BarraAcessibilidade() {
  const [tamanho, setTamanho] = useState(0);
  const [contraste, setContraste] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    try {
      setTamanho(Number(localStorage.getItem("hub-tamanho") ?? 0) || 0);
      setContraste(localStorage.getItem("hub-contraste") === "1");
    } catch { /* sem armazenamento */ }
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = `${TAMANHOS[tamanho]}px`;
    try { localStorage.setItem("hub-tamanho", String(tamanho)); } catch { /* sem armazenamento */ }
    return () => { document.documentElement.style.fontSize = ""; };
  }, [tamanho]);
  useEffect(() => {
    document.documentElement.classList.toggle("alto-contraste", contraste);
    try { localStorage.setItem("hub-contraste", contraste ? "1" : "0"); } catch { /* sem armazenamento */ }
    return () => document.documentElement.classList.remove("alto-contraste");
  }, [contraste]);

  function ouvir() {
    if (!("speechSynthesis" in window)) { setAviso("Seu navegador não lê textos em voz alta."); return; }
    if (lendo) { speechSynthesis.cancel(); setLendo(false); return; }
    const texto = document.getElementById("conteudo")?.innerText ?? "";
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.onend = () => setLendo(false);
    speechSynthesis.speak(fala);
    setLendo(true);
  }

  return (
    <div className="hub-barra" role="region" aria-label="Acessibilidade">
      <ul className="hub-atalhos">
        <li><a href="#conteudo" accessKey="1">Ir para o conteúdo <kbd>1</kbd></a></li>
        <li><a href="#menu" accessKey="2">Ir para o menu <kbd>2</kbd></a></li>
        <li><a href="#busca" accessKey="3">Ir para a busca <kbd>3</kbd></a></li>
        <li><a href="#rodape" accessKey="4">Ir para o rodapé <kbd>4</kbd></a></li>
      </ul>
      <ul className="hub-ferramentas">
        <li><a href="#acessibilidade">Acessibilidade</a></li>
        <li><button onClick={() => setTamanho((t) => Math.min(t + 1, TAMANHOS.length - 1))} aria-label="Aumentar letra">A+</button></li>
        <li><button onClick={() => setTamanho((t) => Math.max(t - 1, 0))} aria-label="Diminuir letra">A-</button></li>
        <li><button onClick={() => setTamanho(0)} aria-label="Letra normal">A</button></li>
        <li><button onClick={() => setContraste(!contraste)} aria-pressed={contraste}>Alto contraste</button></li>
        <li><button onClick={() => setAviso("Aqui entra o tradutor de Libras (VLibras ou o Rybena que o TJPA já usa).")}>Libras</button></li>
        <li><button onClick={ouvir} aria-pressed={lendo}>{lendo ? "Parar leitura" : "Ouvir página"}</button></li>
      </ul>
      {aviso && <p className="hub-aviso-barra" role="status">{aviso} <button onClick={() => setAviso("")} aria-label="Fechar aviso">×</button></p>}
    </div>
  );
}

/** Aviso de cookies (LGPD). */
export function AvisoCookies() {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    try { setVisivel(localStorage.getItem("hub-cookies") !== "1"); } catch { setVisivel(true); }
  }, []);
  if (!visivel) return null;
  return (
    <div className="hub-cookies" role="dialog" aria-label="Aviso de cookies">
      <p>Este portal usa cookies apenas para estatísticas de visita e para melhorar o atendimento, conforme a{" "}
        <a href="#privacidade">Política de Privacidade e Proteção de Dados Pessoais</a>.</p>
      <button onClick={() => { setVisivel(false); try { localStorage.setItem("hub-cookies", "1"); } catch { /* sem armazenamento */ } }}>Ciente</button>
    </div>
  );
}
