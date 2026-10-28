"use client";
import { useState } from "react";
import { MenuAdvogado } from "../advogado/menu";
import { ChatTriagem } from "../chat";
import { EntendaPapel } from "../papel/papel";

/** Caixa de atendimento do hub: contar o problema (chat), entender um papel recebido ou atendimento do advogado. */
export function AtendimentoHub() {
  const [modo, setModo] = useState<"chat" | "papel" | "advogado">("chat");
  return (
    <>
      <div className="hub-modos" role="group" aria-label="O que você quer fazer">
        <button className={modo === "chat" ? "" : "sec"} aria-pressed={modo === "chat"} onClick={() => setModo("chat")}>Contar meu problema</button>
        <button className={modo === "papel" ? "" : "sec"} aria-pressed={modo === "papel"} onClick={() => setModo("papel")}>Entender um papel</button>
        <button className={modo === "advogado" ? "" : "sec"} aria-pressed={modo === "advogado"} onClick={() => setModo("advogado")}>Sou advogado</button>
      </div>
      {modo === "chat" ? <ChatTriagem /> : modo === "papel" ? <EntendaPapel /> : <MenuAdvogado />}
    </>
  );
}
