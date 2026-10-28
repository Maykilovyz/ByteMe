"use client";
import { useState } from "react";
import { ChatTriagem } from "../chat";
import { EntendaPapel } from "../papel/papel";

/** Caixa de atendimento do hub: contar o problema (chat) ou entender um papel recebido. */
export function AtendimentoHub() {
  const [modo, setModo] = useState<"chat" | "papel">("chat");
  return (
    <>
      <div className="hub-modos" role="group" aria-label="O que você quer fazer">
        <button className={modo === "chat" ? "" : "sec"} aria-pressed={modo === "chat"} onClick={() => setModo("chat")}>Contar meu problema</button>
        <button className={modo === "papel" ? "" : "sec"} aria-pressed={modo === "papel"} onClick={() => setModo("papel")}>Entender um papel que recebi</button>
      </div>
      {modo === "chat" ? <ChatTriagem /> : <EntendaPapel />}
    </>
  );
}
