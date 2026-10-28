// Empacota a triagem local (lib/triagem-local.ts: simulador + regras + "Entenda seu papel" por regras) e coloca dentro do
// public/hub.html, entre os marcadores. Assim o hub.html funciona aberto direto do computador, sem servidor e sem internet.
// Uso: npm run gerar-simulador-hub   (rodar de novo depois de mudar lib/ ou importar a planilha)
// Cidades: as da variável CIDADES; sem ela, Ananindeua e Belém, as duas cidades da planilha.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const CIDADES = process.env.CIDADES || "Ananindeua,Belém";
const INICIO = "/* simulador-local:inicio */";
const FIM = "/* simulador-local:fim */";

// O zod só confere a resposta da IA, que não existe no hub sem servidor. No pacote ele vira um substituto vazio (440 KB a menos).
const semZod = {
  name: "sem-zod",
  setup(b) {
    b.onResolve({ filter: /^zod$/ }, () => ({ path: "zod", namespace: "sem-zod" }));
    b.onLoad({ filter: /.*/, namespace: "sem-zod" }, () => ({
      contents: "const z = new Proxy(function () {}, { get: () => z, apply: () => z }); export { z };",
      loader: "js",
    }));
  },
};

const r = await build({
  entryPoints: ["lib/triagem-local.ts"],
  bundle: true, write: false, minify: true, charset: "utf8",
  format: "iife", globalName: "ByteMeLocal", platform: "browser", target: "es2020",
  define: { "process.env": JSON.stringify({ CIDADES, MODO_IA: "simulador" }) },
  plugins: [semZod],
});
const js = r.outputFiles[0].text.trim().replace(/<\/script/gi, "<\\/script");

const hub = readFileSync("public/hub.html", "utf8");
const i = hub.indexOf(INICIO), f = hub.indexOf(FIM);
if (i < 0 || f < i) throw new Error("public/hub.html sem os marcadores do simulador");
writeFileSync("public/hub.html", `${hub.slice(0, i + INICIO.length)}\n${js}\n${hub.slice(f)}`);
console.log(`Simulador colocado no public/hub.html (${Math.round(js.length / 1024)} KB, cidades: ${CIDADES})`);
