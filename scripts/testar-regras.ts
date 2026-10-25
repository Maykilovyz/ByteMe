// Testa as regras fixas SEM chamar a IA (rápido, grátis). Uso: npm run testar-regras
import "./carregar-env";
import { aplicarRegras, camposFaltando, decidirJuizoCivel } from "../lib/regras";
import type { Ficha } from "../lib/llm";

const base: Ficha = {
  risco_imediato: false, quer_humano: false, assunto_id: "consumidor_produto_defeito", confianca: 0.9,
  cidade: "Ananindeua", contra_quem: "loja", valor_estimado_reais: 3000, urgencia: "media",
  tipo_autor: "pessoa_fisica", resumo: "", pergunta_pendente: null,
};

const casos: [string, Partial<Ficha>, string][] = [
  ["geladeira R$ 3 mil (caso-demo)", {}, "unidade jec_civel_ananindeua advogado=nao"],
  ["carro R$ 45 mil (20 a 40 SM)", { valor_estimado_reais: 45000 }, "unidade jec_civel_ananindeua advogado=sim"],
  ["apartamento R$ 300 mil (> 40 SM)", { valor_estimado_reais: 300000 }, "unidade vara_civel_ananindeua advogado=sim"],
  ["MEI cobra R$ 2 mil", { assunto_id: "cobranca_de_divida", tipo_autor: "mei_me_epp", valor_estimado_reais: 2000 }, "unidade jec_civel_ananindeua advogado=nao"],
  ["empresa média cobra R$ 15 mil", { assunto_id: "cobranca_de_divida", tipo_autor: "outra_empresa", valor_estimado_reais: 15000 }, "unidade vara_civel_ananindeua advogado=sim"],
  ["pensão", { assunto_id: "pensao_alimenticia", valor_estimado_reais: null }, "unidade vara_familia_ananindeua advogado=confirmar"],
  ["certidão", { assunto_id: "certidao", cidade: null }, "resolve_na_hora"],
  ["trabalhista", { assunto_id: "trabalhista" }, "orgao_externo trt8"],
  ["INSS", { assunto_id: "inss_beneficio" }, "orgao_externo jef_dpu"],
  ["intimação (sempre humano)", { assunto_id: "intimacao_recebida" }, "atendente"],
  ["cidade fora da demo", { cidade: "outra" }, "atendente"],
];

let ok = 0;
for (const [nome, mud, esperado] of casos) {
  const f = { ...base, ...mud };
  const d = aplicarRegras(f);
  const obtido =
    d.tipo === "unidade" ? `unidade ${d.unidade.id} advogado=${d.advogado}` :
    d.tipo === "orgao_externo" ? `orgao_externo ${d.orgao.id}` : d.tipo;
  const passou = obtido === esperado;
  if (passou) ok++;
  console.log(`${passou ? "OK  " : "FALHA"} ${nome}: ${obtido}${passou ? "" : `  (esperado: ${esperado})`}  [${d.motivo}]`);
}
console.log(`\nFaltando (banco sem valor): ${camposFaltando({ ...base, assunto_id: "cobranca_indevida_servico", valor_estimado_reais: null }).join(", ")}`);
console.log(`20 SM exatos = R$ ${20 * Number(process.env.SALARIO_MINIMO || 1621)}: ${JSON.stringify(decidirJuizoCivel(20 * 1621, "pessoa_fisica"))}`);
console.log(`\n${ok}/${casos.length} regras corretas`);
process.exit(ok === casos.length ? 0 : 1);
