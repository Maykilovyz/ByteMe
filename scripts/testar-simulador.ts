// Testa o simulador da IA (lib/simulador.ts) com as frases da planilha, sem IA e sem internet. Uso: npm run testar-simulador
// Cada frase passa pelo mesmo caminho do orquestrador: checagens sem IA, ficha, perguntas e regras.
// "Uma mensagem": só a frase. "Conversa": quando o sistema pergunta, o teste responde como o cidadão (cidade, valor ou porte).
import "./carregar-env";
import "./_cidades-da-planilha";
import base from "../data/frases-teste.json";
import extra from "../data/frases-extra.json";
import novas from "./frases-simulador.json";
import { ASSUNTOS } from "../lib/dados";
import { checarSemIA, etapaDepoisDaFicha, type Etapa } from "../lib/fluxo";
import { normalizarFicha } from "../lib/regras";
import { acharValor, simularFicha } from "../lib/simulador";
import type { Mensagem } from "../lib/tipos";

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const msg = (papel: Mensagem["papel"], texto: string): Mensagem => ({ papel, texto, em: "" });

/** Onde a conversa termina, no mesmo formato da coluna "Onde deve cair" da planilha. */
function destino(e: Etapa | { tipo: "semIA"; emergencia: boolean }): string {
  if (e.tipo === "semIA") return e.emergencia ? "Emergência + atendente" : "Atendente";
  if (e.tipo === "encaminhar") return e.emergencia ? "Emergência + atendente" : "Atendente";
  if (e.tipo === "pergunta") return "Pergunta";
  const d = e.decisao;
  return d.tipo === "unidade" ? d.unidade.id : d.tipo === "orgao_externo" ? `Órgão externo: ${d.orgao.id}` : d.tipo === "resolve_na_hora" ? "Resolve na hora" : "Atendente";
}

type Frase = (typeof base)[number];

/** Roda uma conversa. Com responder, responde às perguntas até o fim (no máximo 4). */
function rodar(f: Frase, responder: boolean) {
  let texto = f.frase;
  if (f.cidade && f.cidade !== "outra" && !norm(texto).includes(norm(f.cidade))) texto += `, moro em ${f.cidade}`;
  const hist: Mensagem[] = [];
  let perguntas = 0, assunto = "-";
  const falas: string[] = [];
  for (;;) {
    hist.push(msg("cidadao", texto));
    falas.push(texto);
    const sem = checarSemIA(texto);
    // Risco por palavras vai direto ao atendente; o assunto é lido só para conferir com a planilha (como em rodar-frases.ts).
    if (sem?.emergencia) assunto = simularFicha(hist, perguntas).ficha.assunto_id;
    if (sem) return { assunto, destino: destino({ tipo: "semIA", emergencia: sem.emergencia }), falas, risco: sem.emergencia };
    const r = simularFicha(hist, perguntas);
    const ficha = normalizarFicha(r.ficha);
    assunto = ficha.assunto_id;
    const etapa = etapaDepoisDaFicha(ficha, perguntas);
    if (etapa.tipo !== "pergunta" || !responder) return { assunto, destino: destino(etapa), falas, risco: ficha.risco_imediato, etapa };
    perguntas++;
    hist.push(msg("assistente", etapa.pergunta));
    falas.push(`[${etapa.pergunta}]`);
    const falta = etapa.faltando[0];
    // Resposta do cidadão: o valor segue o que a planilha espera (sem advogado = até 20 SM; com advogado = entre 20 e 40 SM no Juizado; Vara = acima de 40)
    if (falta === "cidade") texto = f.cidade && f.cidade !== "outra" ? `moro em ${f.cidade}` : "moro em Marabá";
    else if (falta === "valor") texto = f.juizoEsperado.startsWith("vara") ? "uns 80 mil reais" : f.advogadoEsperado === "Sim" ? "uns 25 mil" : "dois mil e quinhentos";
    else if (falta === "porte_empresa") texto = "é MEI";
    else return { assunto, destino: "Pergunta", falas, risco: false, etapa };
  }
}

function main() {
  let falhas = 0;
  const conferir = (ok: boolean, rotulo: string) => { if (!ok) falhas++; console.log(`${ok ? "OK   " : "FALHA"} ${rotulo}`); };

  console.log("== Valor em reais ==");
  const valores: [string, number | null][] = [
    ["paguei 2500", 2500], ["R$ 2.500,00", 2500], ["uns 2 mil e quinhentos", 2500], ["dois mil e quinhentos reais", 2500],
    ["comprei um carro usado de 45 mil", 45000], ["deu 85 mil reais", 85000], ["2,5 mil", 2500], ["mil e duzentos reais", 1200],
    ["2500", 2500], ["empresa com 80 funcionários e um cliente não pagou 15 mil", 15000], ["meu filho de 5 anos", null],
    ["há 4 meses sem pagar", null], ["comprei em 2025 uma geladeira", null], ["meu telefone é (91) 99230-0151", null],
    ["comprei um carro", null], ["a geladeira de 2000 quebrou", 2000], ["cobrando 3 meses, deu 450 reais", 450], ["trezentos reais", 300],
  ];
  for (const [t, esperado] of valores) conferir(acharValor(t) === esperado, `"${t}" → ${acharValor(t)} (esperado ${esperado})`);

  console.log("\n== Exemplos da planilha (\"Como o cidadão costuma falar\"): assunto ==");
  let exOk = 0, exTotal = 0;
  for (const a of ASSUNTOS) for (const ex of a.exemplos) {
    exTotal++;
    const sem = checarSemIA(ex);
    const obtido = sem?.emergencia ? "violencia_domestica" : normalizarFicha(simularFicha([msg("cidadao", ex)], 0).ficha).assunto_id;
    const ok = obtido === a.id;
    if (ok) exOk++;
    else console.log(`FALHA "${ex}" → ${obtido} (esperado ${a.id})`);
  }
  console.log(`${exOk}/${exTotal} exemplos no assunto certo`);
  if (exOk < exTotal) falhas += exTotal - exOk;

  console.log("\n== Frases novas, fora da planilha (scripts/frases-simulador.json): assunto ==");
  let novasOk = 0;
  for (const { frase, assunto } of novas) {
    const sem = checarSemIA(frase);
    const obtido = sem?.emergencia ? "violencia_domestica" : normalizarFicha(simularFicha([msg("cidadao", frase)], 0).ficha).assunto_id;
    if (obtido === assunto) novasOk++;
    else console.log(`FALHA "${frase}" → ${obtido} (esperado ${assunto})`);
  }
  console.log(`${novasOk}/${novas.length} frases novas no assunto certo`);
  if (novasOk < novas.length) falhas += novas.length - novasOk;

  console.log("\n== Frases de teste da planilha ==");
  const frases = [...base, ...extra] as Frase[];
  let umaOk = 0, conversaOk = 0, assuntoOk = 0, riscoOk = 0;
  for (const f of frases) {
    const uma = rodar(f, false);
    const conversa = rodar(f, true);
    const okAssunto = uma.assunto === f.assuntoEsperado || (f.assuntoEsperado === "indefinido" && uma.assunto === "-");
    const okUma = uma.destino === f.juizoEsperado;
    const okConversa = f.juizoEsperado === "Pergunta" ? okUma : conversa.destino === f.juizoEsperado;
    if (okAssunto) assuntoOk++;
    if (okUma) umaOk++;
    if (okConversa) conversaOk++;
    if (uma.risco === f.riscoEsperado) riscoOk++;
    const marca = okAssunto && okConversa ? "OK   " : "FALHA";
    if (!(okAssunto && okConversa)) falhas++;
    const caminho = conversa.falas.length > 1 ? `  conversa: ${conversa.falas.join(" → ")}` : "";
    console.log(`${marca} #${f.n} ${f.frase.slice(0, 70)} → ${uma.assunto} / ${okUma ? uma.destino : `${uma.destino} → ${conversa.destino}`}${caminho}`);
  }
  const n = frases.length;
  const pct = (k: number) => `${k}/${n} (${Math.round((100 * k) / n)}%)`;
  console.log(`\nAssunto certo: ${pct(assuntoOk)}`);
  console.log(`Destino certo com uma mensagem: ${pct(umaOk)}`);
  console.log(`Destino certo na conversa (respondendo às perguntas): ${pct(conversaOk)}`);
  console.log(`Risco certo: ${pct(riscoOk)}`);
  console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
  process.exitCode = falhas ? 1 : 0;
}
main();
