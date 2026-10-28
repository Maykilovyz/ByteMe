import type { Metadata } from "next";
import { EntendaPapel } from "./papel";

export const metadata: Metadata = { title: "Entenda seu papel · ByteMe" };

export default function Papel() {
  return (
    <>
      <h1>Entenda seu papel</h1>
      <p>Recebeu uma intimação, citação ou sentença e não entendeu? Mande uma foto ou cole o texto. A gente explica em 3 partes: o que é, o que fazer e até quando.</p>
      <div className="card"><EntendaPapel /></div>
    </>
  );
}
