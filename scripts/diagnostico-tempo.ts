// Descobre por que o sistema está lento: mede rede (Supabase e Google) e testa o Gemini com e sem "raciocínio" interno.
// Uso: npm run diagnostico-tempo. Não imprime chave nem URL completa. Só dados fictícios.
import "./carregar-env";
import { dns } from "./_dns";

const ms = (t0: number) => `${Math.round(performance.now() - t0)} ms`;

async function tempoDe(rotulo: string, fn: () => Promise<string>) {
  const t0 = performance.now();
  try { console.log(`${rotulo}: ${ms(t0)}  ${await fn()}`); }
  catch (e) { console.log(`${rotulo}: ${ms(t0)}  ERRO ${String(e).slice(0, 100)}`); }
}

async function main() {
  console.log(`Node ${process.version}\n`);
  const sbUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const chaveSb = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && chaveSb) {
    const host = new URL(sbUrl).hostname;
    console.log(`== Supabase (${host.slice(0, 4)}…${host.slice(-12)})`);
    await tempoDe("DNS", async () => JSON.stringify(await dns(host)));
    for (let i = 1; i <= 4; i++) {
      await tempoDe(`GET contadores #${i}`, async () => {
        const h: Record<string, string> = { apikey: chaveSb };
        if (chaveSb.startsWith("eyJ")) h.Authorization = `Bearer ${chaveSb}`;
        const r = await fetch(`${sbUrl}/rest/v1/contadores?select=nome&limit=1`, { headers: h, cache: "no-store" });
        return `HTTP ${r.status}`;
      });
    }
  } else console.log("== Supabase: sem SUPABASE_URL/chave no .env.local (pulado)");

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return console.log("\n== Gemini: sem GEMINI_API_KEY (pulado)");
  console.log("\n== Google");
  await tempoDe("DNS", async () => JSON.stringify(await dns("generativelanguage.googleapis.com")));
  const modelo = (process.env.GEMINI_MODELS ?? "gemini-3.5-flash").split(",")[0].trim();
  console.log(`\n== Gemini ${modelo}: pergunta curta, 2 vezes por variante`);
  const variantes: [string, object][] = [
    ["padrão", {}],
    ["thinkingLevel=minimal", { thinkingConfig: { thinkingLevel: "minimal" } }],
    ["thinkingBudget=0", { thinkingConfig: { thinkingBudget: 0 } }],
  ];
  for (const [nome, extra] of variantes) {
    for (let i = 1; i <= 2; i++) {
      await tempoDe(`${nome} #${i}`, async () => {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: 'Responda só com JSON {"ok":true}. Contexto: geladeira quebrada, valor R$ 2000.' }] }],
            generationConfig: { responseMimeType: "application/json", ...extra },
          }),
        });
        const c = await r.json();
        const u = c?.usageMetadata ?? {};
        return `HTTP ${r.status}  tokens de raciocínio: ${u.thoughtsTokenCount ?? 0}`;
      });
    }
  }
}
main();
