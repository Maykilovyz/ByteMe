"use client";
import { useRef, useState } from "react";
import type { DecisaoPapel, Leitura } from "@/lib/papel";
import { EXEMPLOS_PAPEL } from "@/lib/papel-exemplos";
import { BotaoOuvir, calar } from "../voz";

type Resultado = { leitura: Leitura; decisao: DecisaoPapel; fonte: "ia" | "regras"; aviso: string };

const NOME_TIPO: Record<Leitura["tipo"], string> = {
  citacao: "Citação", intimacao: "Intimação", mandado: "Mandado", sentenca: "Sentença", decisao: "Decisão",
  despacho: "Despacho", outro: "Papel da Justiça", nao_judicial: "Outro papel",
};
const LINK_DEFENSORIA = "https://www.defensoria.pa.def.br/";
const MAX_PDF = 4_500_000;

/** Foto vira JPEG de no máximo 1600 px no lado maior: lê bem e sobe rápido no 4G. PDF vai como está. */
async function prepararArquivo(arquivo: File): Promise<string> {
  const comoDataUrl = (f: Blob) => new Promise<string>((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => falha(r.error);
    r.readAsDataURL(f);
  });
  if (arquivo.type === "application/pdf") {
    if (arquivo.size > MAX_PDF) throw new Error("Esse PDF é grande demais. Mande uma foto da primeira página ou cole o texto.");
    return comoDataUrl(arquivo);
  }
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = falha;
      i.src = url;
    });
    const escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const tela = document.createElement("canvas");
    tela.width = Math.round(img.naturalWidth * escala);
    tela.height = Math.round(img.naturalHeight * escala);
    tela.getContext("2d")!.drawImage(img, 0, 0, tela.width, tela.height);
    return tela.toDataURL("image/jpeg", 0.85);
  } catch {
    if (arquivo.size > MAX_PDF) throw new Error("Não conseguimos abrir essa foto. Tente tirar outra ou cole o texto.");
    return comoDataUrl(arquivo); // formato que o navegador não abre (HEIC no computador): a IA tenta ler assim mesmo
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Texto único do resultado, para ouvir em voz alta. */
function paraOuvir(r: Resultado): string {
  const { leitura: l, decisao: d } = r;
  const quando = d.ate_quando.length ? d.ate_quando.map((q) => `${q.destaque}. ${q.detalhe}`).join(" ") : "Este papel não traz prazo nem data escritos.";
  return `${l.titulo_simples}. ${l.o_que_e} O que fazer: ${d.o_que_fazer.join(" ")} Até quando: ${quando}`;
}

/** "Entenda seu papel": foto, PDF ou texto de um papel da Justiça vira 3 blocos em linguagem simples. Usado em /papel e no /hub. */
export function EntendaPapel() {
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [senha, setSenha] = useState<{ senha?: string | null; texto: string } | null>(null);
  const [chamando, setChamando] = useState(false);
  const topo = useRef<HTMLDivElement>(null);

  async function ler(corpo: { texto?: string; arquivo?: string }, aviso: string) {
    setErro(null); setLendo(aviso); setSenha(null);
    try {
      const r = await fetch("/api/papel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const dados = await r.json();
      if (dados.erro) setErro(dados.erro);
      else setResultado(dados);
    } catch {
      setErro("Tivemos um problema para ler o papel. Tente de novo ou fale com um atendente.");
    } finally {
      setLendo(null);
      setTimeout(() => topo.current?.focus(), 50);
    }
  }

  async function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    try {
      await ler({ arquivo: await prepararArquivo(arquivo) }, arquivo.type === "application/pdf" ? "Lendo o PDF…" : "Lendo a foto…");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não conseguimos abrir esse arquivo.");
    }
  }

  async function falarComPessoa() {
    if (!resultado) return;
    setChamando(true);
    const l = resultado.leitura;
    const mensagem = `Quero falar com uma pessoa sobre um papel da Justiça que recebi: ${NOME_TIPO[l.tipo].toLowerCase()}${l.processo ? `, processo ${l.processo}` : ""}.`;
    try {
      const canal = document.documentElement.classList.contains("totem") ? "totem" : "web";
      const r = await fetch("/api/triagem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagem, canal }) });
      setSenha(await r.json());
    } catch {
      setSenha({ texto: "Não conseguimos chamar o atendente. Procure o balcão de atendimento." });
    } finally {
      setChamando(false);
    }
  }

  function novo() {
    calar();
    setResultado(null); setTexto(""); setErro(null); setSenha(null);
    setTimeout(() => topo.current?.focus(), 50);
  }

  if (resultado) {
    const { leitura: l, decisao: d } = resultado;
    return (
      <div className={`papel-resultado${d.nivel === "emergencia" ? " emergencia" : ""}`} ref={topo} tabIndex={-1} aria-labelledby="papel-titulo">
        <div className="papel-cabeca">
          <span className="etiqueta">{NOME_TIPO[l.tipo]}</span>
          <h2 id="papel-titulo">{l.titulo_simples}</h2>
          {(l.orgao || l.processo) && <p className="suave">{[l.orgao, l.processo && `Processo ${l.processo}`].filter(Boolean).join(" · ")}</p>}
          <BotaoOuvir texto={paraOuvir(resultado)} rotulo="Ouvir a explicação" />
        </div>

        <section className="papel-bloco" aria-labelledby="b1">
          <h3 id="b1"><span aria-hidden="true">1</span> O que é</h3>
          <p>{l.o_que_e}</p>
          {l.termos.length > 0 && (
            <details>
              <summary>Palavras difíceis deste papel ({l.termos.length})</summary>
              <dl className="papel-termos">
                {l.termos.map((t) => <div key={t.termo}><dt>{t.termo}</dt><dd>{t.explicacao}</dd></div>)}
              </dl>
            </details>
          )}
        </section>

        <section className={`papel-bloco${d.nivel === "emergencia" ? " urgente" : ""}`} aria-labelledby="b2">
          <h3 id="b2"><span aria-hidden="true">2</span> O que fazer</h3>
          <ol>{d.o_que_fazer.map((p) => <li key={p}>{p}</li>)}</ol>
          <div className="linha">
            {d.defensoria && (
              <a className="botao" href={LINK_DEFENSORIA} target="_blank" rel="noopener noreferrer">
                Defensoria Pública do Pará<span className="sr-only"> (abre em nova aba)</span>
              </a>
            )}
            <button className={d.defensoria ? "sec" : ""} onClick={falarComPessoa} disabled={chamando || !!senha}>
              {chamando ? "Chamando…" : "Falar com uma pessoa"}
            </button>
          </div>
          {senha && (
            <div className="papel-senha" role="status">
              {senha.senha && <><span className="suave">Sua senha</span> <strong className="senha">{senha.senha}</strong></>}
              <p>{senha.texto}</p>
            </div>
          )}
        </section>

        <section className={`papel-bloco${d.ate_quando.length ? " urgente" : ""}`} aria-labelledby="b3">
          <h3 id="b3"><span aria-hidden="true">3</span> Até quando</h3>
          {d.ate_quando.length ? d.ate_quando.map((q) => (
            <div key={q.destaque} className="papel-prazo">
              <strong>{q.destaque}</strong>
              <p>{q.detalhe}</p>
            </div>
          )) : <p>Este papel não traz prazo nem data escritos.</p>}
        </section>

        <p className="papel-aviso">
          {resultado.aviso}
          {resultado.fonte === "regras" && " Leitura feita por regras automáticas, sem IA."}
        </p>
        <button className="sec" onClick={novo}>Entender outro papel</button>
      </div>
    );
  }

  return (
    <div className="papel-entrada" ref={topo} tabIndex={-1}>
      <div className="papel-fotos">
        <label className="botao papel-arquivo">
          <input type="file" accept="image/*" capture="environment" onChange={escolherArquivo} disabled={!!lendo} />
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
          </svg>
          Tirar foto do papel
        </label>
        <label className="botao sec papel-arquivo">
          <input type="file" accept="image/*,application/pdf" onChange={escolherArquivo} disabled={!!lendo} />
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h8l4 4v14H6z M14 3v4h4 M9 13h6 M9 17h4" />
          </svg>
          Escolher foto ou PDF
        </label>
      </div>
      <p className="suave papel-dica">Dica: papel inteiro na foto, em lugar claro, sem sombra.</p>

      <label htmlFor="papel-texto">Ou cole o texto do papel</label>
      <textarea id="papel-texto" rows={5} value={texto} maxLength={12000} onChange={(e) => setTexto(e.target.value)}
        placeholder="Cole aqui o texto da intimação, citação ou sentença" />
      <p><button onClick={() => ler({ texto }, "Lendo o texto…")} disabled={!!lendo || !texto.trim()}>Explicar este papel</button></p>

      <div className="papel-exemplos">
        <span className="suave">Ver um exemplo fictício:</span>
        {EXEMPLOS_PAPEL.map((ex) => (
          <button key={ex.nome} className="sec" disabled={!!lendo} onClick={() => { setTexto(ex.texto); ler({ texto: ex.texto }, "Lendo o exemplo…"); }}>
            {ex.nome}
          </button>
        ))}
      </div>

      {lendo && <p className="papel-lendo" role="status">{lendo}</p>}
      {erro && <p className="papel-erro" role="alert">{erro}</p>}
    </div>
  );
}
