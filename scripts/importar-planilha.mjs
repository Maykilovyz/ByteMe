// Converte a planilha da Amyr (planilha/tabela-assuntos-amyr.xlsx) nos arquivos data/*.json que o sistema lê.
// Uso: npm run importar-planilha
// Só entram linhas com status "Confirmado" ou "Exemplo - confirmar" (as "Descartar" ficam de fora).
// Para a versão final, troque INCLUIR_EXEMPLOS para false e só as confirmadas entram.
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

const INCLUIR_EXEMPLOS = true;
const arquivo = process.argv[2] ?? "planilha/tabela-assuntos-amyr.xlsx";

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(arquivo);

function linhas(nomeAba) {
  const ws = wb.getWorksheet(nomeAba);
  if (!ws) throw new Error(`Aba não encontrada: ${nomeAba}`);
  const cab = ws.getRow(1).values.slice(1).map((v) => String(v ?? "").trim());
  const out = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const obj = {};
    cab.forEach((c, i) => {
      const v = row.getCell(i + 1).value;
      obj[c] = v == null ? null : typeof v === "object" && "result" in v ? v.result : String(v).trim();
      if (obj[c] === "") obj[c] = null;
    });
    if (!obj[cab[0]]) return;
    if ("status" in obj) {
      if (obj.status === "Descartar") return;
      if (!INCLUIR_EXEMPLOS && obj.status !== "Confirmado") return;
    }
    out.push(obj);
  });
  return out;
}

const sn = (v) => String(v ?? "").toUpperCase() === "S";
const lista = (v) => (v ? String(v).split(";").map((s) => s.trim()).filter(Boolean) : []);

const assuntos = linhas("Assuntos").map((a) => ({
  id: a.id,
  nome: a.nome_simples,
  exemplos: lista(a.exemplos_de_frases),
  competencia: a.competencia ?? "TJPA",
  unidades: { ananindeua: a.unidade_ananindeua, belem: a.unidade_belem },
  resolveNaHora: sn(a.resolve_na_hora),
  comoResolveNaHora: a.como_resolve_na_hora,
  exigeValor: sn(a.exige_valor),
  regraAdvogado: a.regra_advogado ?? "Confirmar",
  documentos: lista(a.documentos),
  sempreHumano: sn(a.sempre_humano),
  observacoes: a.observacoes_juridicas,
  status: a.status,
}));

const unidades = linhas("Unidades").map((u) => ({
  id: u.id, nome: u.nome_oficial, comarca: u.comarca, endereco: u.endereco,
  horario: u.horario, canais: u.canais, contato: u.link_ou_contato, status: u.status,
}));

const orgaos = linhas("Orgaos externos").map((o) => ({
  id: o.id, nome: o.nome, quandoIndicar: o.quando_indicar, contato: o.como_contatar, link: o.link, status: o.status,
}));

const motivos = linhas("Motivos advogado").map((m) => ({
  id: m.id, motivo: m.motivo_no_menu, precisaHorario: sn(m.precisa_horario), destino: m.setor_ou_destino, status: m.status,
}));

const frases = linhas("Frases de teste").map((f) => ({
  n: Number(f.n), frase: f.frase_do_cidadao, cidade: f.cidade, assuntoEsperado: f.assunto_esperado,
  juizoEsperado: f.juizo_esperado, advogadoEsperado: f.precisa_advogado_esperado,
  riscoEsperado: f.risco_esperado === "Sim", oQueTesta: f.o_que_testa,
}));

const salvar = (nome, dados) => {
  writeFileSync(`data/${nome}.json`, JSON.stringify(dados, null, 2) + "\n");
  console.log(`data/${nome}.json: ${dados.length} registros`);
};
salvar("assuntos", assuntos);
salvar("unidades", unidades);
salvar("orgaos", orgaos);
salvar("motivos-advogado", motivos);
salvar("frases-teste", frases);
