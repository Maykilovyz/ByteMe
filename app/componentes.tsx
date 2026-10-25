"use client";
import { useEffect, useState } from "react";

/** Modo totem: mesma tela, letra maior. Fica salvo no navegador. */
export function BotaoTotem() {
  const [ligado, setLigado] = useState(false);
  useEffect(() => {
    let salvo = false;
    try { salvo = localStorage.getItem("totem") === "1"; } catch { /* sem armazenamento */ }
    const daUrl = new URLSearchParams(location.search).get("totem") === "1";
    setLigado(salvo || daUrl);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("totem", ligado);
    try { localStorage.setItem("totem", ligado ? "1" : "0"); } catch { /* sem armazenamento */ }
  }, [ligado]);
  return (
    <button className="sec" onClick={() => setLigado(!ligado)} aria-pressed={ligado}>
      {ligado ? "Letra normal" : "Letra grande (totem)"}
    </button>
  );
}
