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
        <li><a href="#conteudo" accessKey="1">Conteúdo <kbd>Alt+1</kbd></a></li>
        <li><a href="#menu" accessKey="2">Menu principal <kbd>Alt+2</kbd></a></li>
        <li><a href="#busca" accessKey="3">Busca <kbd>Alt+3</kbd></a></li>
        <li><a href="#rodape" accessKey="4">Rodapé <kbd>Alt+4</kbd></a></li>
        <li><a href="#acessibilidade">Acessibilidade</a></li>
      </ul>
      <ul className="hub-ferramentas">
        <li><button onClick={() => setTamanho((t) => Math.min(t + 1, TAMANHOS.length - 1))} aria-label="Aumentar letra">A+</button></li>
        <li><button onClick={() => setTamanho((t) => Math.max(t - 1, 0))} aria-label="Diminuir letra">A-</button></li>
        <li><button onClick={() => setTamanho(0)} aria-label="Letra normal">A</button></li>
        <li><button onClick={ouvir} aria-pressed={lendo}>{lendo ? "Parar leitura" : "Ouvir página"}</button></li>
        <li><button onClick={() => setAviso("Aqui entra o tradutor de Libras (VLibras ou o Rybena que o TJPA já usa).")}>Libras</button></li>
        <li><button className="hub-contraste" onClick={() => setContraste(!contraste)} aria-pressed={contraste} aria-label="Alto contraste" title="Alto contraste">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" /></svg>
        </button></li>
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
      <p>O Tribunal de Justiça do Pará usa cookies, guardados só por um tempo, para contar as visitas e melhorar o atendimento on-line, conforme a{" "}
        <a href="https://www.tjpa.jus.br/PortalExterno/institucional/Lei-Geral-de-Protecao-de-Dados---LGPD/1209309-politica-de-privacidade-de-dados-pessoais.xhtml">Política de Privacidade e Proteção de Dados Pessoais</a> e a{" "}
        <a href="https://www.tjpa.jus.br/PortalExterno/institucional/Lei-Geral-de-Protecao-de-Dados---LGPD/1209301-politica-de-privacidade-para-navegacao.xhtml">Política de Privacidade para Navegação</a>. Ao usar o portal, você concorda com isso.</p>
      <button onClick={() => { setVisivel(false); try { localStorage.setItem("hub-cookies", "1"); } catch { /* sem armazenamento */ } }}>Ciente</button>
    </div>
  );
}
