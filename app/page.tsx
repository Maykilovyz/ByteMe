import Link from "next/link";

export default function Inicio() {
  return (
    <>
      <h1>Como podemos ajudar?</h1>
      <div className="portas">
        <Link className="porta" href="/cidadao">
          <h2>Sou cidadão</h2>
          <p>Conte seu problema com suas palavras. A gente diz para onde ir, o que levar e se precisa de advogado.</p>
        </Link>
        <Link className="porta" href="/advogado">
          <h2>Sou advogado</h2>
          <p>Secretaria, despacho, audiência ou certidão: escolha o motivo e receba senha ou horário.</p>
        </Link>
      </div>
    </>
  );
}
