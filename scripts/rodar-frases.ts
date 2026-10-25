// Roda as frases de teste (data/frases-teste.json) na IA de verdade e mede os acertos.
// Uso: npm run testar-frases   (lê a chave do .env.local)
// Cada frase é testada em UMA mensagem. Se a cidade da planilha não aparece na frase, ela é acrescentada ("moro em X").
import "./carregar-env";
import { writeFileSync } from "node:fs";
import frases from "../data/frases-teste.json";
import { llmMontaFicha } from "../lib/llm";
import { aplicarRegras, normalizarFicha, proximoPasso } from "../lib/regras";
import { pediuHumano, riscoPorPalavras } from "../lib/risco";
import { CIDADES, GEMINI_MODELS } from "../lib/config";

const ESPERA_MS = Number(process.env.ESPERA_MS || 7000); // camada grátis: ~10 pedidos por minuto
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Linha = { n: number; frase: string; assuntoEsp: string; assuntoObt: string; juizoEsp: string; juizoObt: string; riscoEsp: boolean; riscoObt: boolean; okAssunto: boolean; okJuizo: boolean; ms: number; provedor: string; obs: string };

async function main() {
  console.log(`Modelos (em ordem): ${GEMINI_MODELS.join(" > ")} · cidades: ${CIDADES.join(", ")} · ${frases.length} frases\n`);
  const linhas: Linha[] = [];
  for (const f of frases) {
    let msg = f.frase;
    if (f.cidade && f.cidade !== "outra" && !norm(msg).includes(norm(f.cidade))) msg += `, moro em ${f.cidade}`;
    const hist = [{ papel: "cidadao" as const, texto: msg, em: new Date().toISOString() }];
    let assuntoObt = "-", juizoObt = "-", riscoObt = false, ms = 0, obs = "", provedor = "-";
    try {
      if (pediuHumano(msg)) { juizoObt = "Atendente"; obs = "pedido de humano (sem IA)"; }
      else if (riscoPorPalavras(msg)) { juizoObt = "Emergência + atendente"; riscoObt = true; obs = "risco por palavras (sem IA)"; }
      if (juizoObt === "-" || riscoObt) {
        const r = await llmMontaFicha(hist, 0);
        ms = r.ms;
        provedor = r.provedor;
        const ficha = normalizarFicha(r.ficha);
        assuntoObt = ficha.assunto_id;
        riscoObt = riscoObt || ficha.risco_imediato;
        if (juizoObt === "-") {
          if (ficha.risco_imediato) juizoObt = "Emergência + atendente";
          else if (ficha.quer_humano) juizoObt = "Atendente";
          else {
            const passo = proximoPasso(ficha, 0);
            if (passo.tipo === "pergunta") { juizoObt = "Pergunta"; obs = `perguntaria (${passo.faltando.join(", ")}): ${passo.pergunta}`; }
            else if (passo.tipo === "atendente") { juizoObt = "Atendente"; obs = passo.motivo; }
            else {
              const d = aplicarRegras(ficha);
              juizoObt = d.tipo === "unidade" ? d.unidade.id : d.tipo === "orgao_externo" ? `Órgão externo: ${d.orgao.id}` : d.tipo === "resolve_na_hora" ? "Resolve na hora" : "Atendente";
              obs = d.motivo;
            }
          }
        }
        if (!obs) obs = `confiança ${ficha.confianca}`;
      }
    } catch (e) {
      obs = `ERRO: ${String(e).slice(0, 160)}`;
    }
    const okAssunto = assuntoObt === f.assuntoEsperado || (f.assuntoEsperado === "indefinido" && assuntoObt === "-");
    const pedePergunta = /perguntar/.test(norm(f.oQueTesta ?? "")) || f.juizoEsperado === "Pergunta";
    const okJuizo = juizoObt === f.juizoEsperado || (pedePergunta && juizoObt === "Pergunta");
    linhas.push({ n: f.n, frase: msg, assuntoEsp: f.assuntoEsperado, assuntoObt, juizoEsp: f.juizoEsperado, juizoObt, riscoEsp: f.riscoEsperado, riscoObt, okAssunto, okJuizo, ms, provedor, obs });
    console.log(`${okAssunto && okJuizo ? "OK   " : "FALHA"} #${f.n} ${f.frase.slice(0, 60)} → ${assuntoObt} / ${juizoObt} (${provedor}, ${ms} ms) ${obs}`);
    await dormir(ESPERA_MS);
  }
  const n = linhas.length;
  const pct = (k: number) => `${k}/${n} (${Math.round((100 * k) / n)}%)`;
  const riscoOk = linhas.filter((l) => l.riscoEsp === l.riscoObt).length;
  const tempos = linhas.filter((l) => l.ms > 0).map((l) => l.ms);
  const usados = [...new Set(linhas.map((l) => l.provedor).filter((p) => p !== "-"))];
  const resumo = [
    `- Assunto correto: ${pct(linhas.filter((l) => l.okAssunto).length)}`,
    `- Destino correto (juízo, órgão, atendente ou pergunta): ${pct(linhas.filter((l) => l.okJuizo).length)}`,
    `- Risco identificado corretamente: ${pct(riscoOk)}`,
    `- Modelos que responderam: ${usados.join(", ") || "nenhum"}`,
    `- Tempo médio da IA: ${tempos.length ? Math.round(tempos.reduce((s, x) => s + x, 0) / tempos.length) : 0} ms`,
  ].join("\n");
  const tabela = ["| # | Frase | Assunto esperado | Assunto obtido | Destino esperado | Destino obtido | OK | Modelo | Observação |", "|---|---|---|---|---|---|---|---|---|",
    ...linhas.map((l) => `| ${l.n} | ${l.frase} | ${l.assuntoEsp} | ${l.assuntoObt} | ${l.juizoEsp} | ${l.juizoObt} | ${l.okAssunto && l.okJuizo ? "✅" : "❌"} | ${l.provedor} | ${l.obs.replace(/\|/g, "/")} |`)].join("\n");
  const md = `# Relatório de testes da triagem\n\nData: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Modelos (em ordem): ${GEMINI_MODELS.join(" > ")} · Cidades: ${CIDADES.join(", ")} · Frases: ${n}\n\n${resumo}\n\n${tabela}\n`;
  writeFileSync("docs/relatorio-testes.md", md);
  console.log(`\n${resumo}\n\nRelatório salvo em docs/relatorio-testes.md`);
}
main();
