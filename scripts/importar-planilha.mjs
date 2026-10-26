// Converte a planilha da Amyr (planilha/tabela-assuntos-amyr.xlsx) nos arquivos data/*.json que o sistema lê.
// Uso: npm run importar-planilha
// Só entram linhas com status "Confirmado" ou "Exemplo - confirmar" (as "Descartar" ficam de fora).
// Para a versão final, troque INCLUIR_EXEMPLOS para false e só as confirmadas entram.
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

const INCLUIR_EXEMPLOS = true;
const arquivo = process.argv[2] ?? "planilha/base-de-conhecimento-organizada.xlsx";

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(arquivo);

// Dois formatos de planilha: o modelo original (cabeçalho técnico na linha 1) e a "base de conhecimento organizada"
// da Amyr (aba Resumo, título nas linhas 1 e 2, cabeçalho legível na linha 3, coluna Área). O formato é detectado pela aba Resumo.
const organizada = Boolean(wb.getWorksheet("Resumo"));

function texto(v) {
  if (v == null) return null;
  if (typeof v === "object") {
    if ("result" in v) return texto(v.result);
    if ("richText" in v) return v.richText.map((t) => t.text).join("").trim() || null;
    if ("text" in v) return texto(v.text);
    return String(v);
  }
  const t = String(v).trim();
  return t === "" ? null : t;
}

/** Aba da base organizada: cabeçalho na linha 3, linhas de dados a partir da 4. */
function linhasOrganizada(nomeAba) {
  const ws = wb.getWorksheet(nomeAba);
  if (!ws) throw new Error(`Aba não encontrada: ${nomeAba}`);
  const cab = ws.getRow(3).values.slice(1).map((v) => texto(v) ?? "");
  const out = [];
  ws.eachRow((row, n) => {
    if (n < 4) return;
    const obj = {};
    cab.forEach((c, i) => { obj[c] = texto(row.getCell(i + 1).value); });
    if (!obj[cab[0]] || obj.Status === "Descartar") return;
    if (!INCLUIR_EXEMPLOS && obj.Status !== "Confirmado") return;
    out.push(obj);
  });
  return out;
}

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

const sn = (v) => ["S", "SIM"].includes(String(v ?? "").toUpperCase());
const lista = (v) => (v ? String(v).split(";").map((s) => s.trim()).filter(Boolean) : []);

const mapa = organizada
  ? {
      assuntos: linhasOrganizada("Assuntos").map((a) => ({
        id: a["ID (não mudar)"],
        nome: a["Assunto (como o cidadão lê)"],
        exemplos: lista(a["Como o cidadão costuma falar"]),
        competencia: a["Competência"] ?? "TJPA",
        unidades: { ananindeua: a["Unidade em Ananindeua"], belem: a["Unidade em Belém"] },
        resolveNaHora: sn(a["Resolve na hora?"]),
        comoResolveNaHora: a["Como resolve na hora"],
        exigeValor: sn(a["Depende do valor?"]),
        regraAdvogado: a["Precisa de advogado?"] ?? "Confirmar",
        documentos: lista(a["Documentos a levar"]),
        sempreHumano: sn(a["Só atendente humano?"]),
        observacoes: a["Observações jurídicas (equipe)"],
        status: a.Status,
      })),
      unidades: linhasOrganizada("Unidades").map((u) => ({
        id: u["ID (não mudar)"], nome: u["Nome da unidade"], comarca: u.Comarca, endereco: u["Endereço"],
        horario: u["Horário"], canais: u.Canais, contato: u["Link / contato"], status: u.Status,
      })),
      orgaos: linhasOrganizada("Órgãos externos").map((o) => ({
        id: o["ID (não mudar)"], nome: o["Órgão"], quandoIndicar: o["Quando indicar"], contato: o["Como contatar"], link: o.Link, status: o.Status,
      })),
      motivos: linhasOrganizada("Motivos advogado").map((m) => ({
        id: m["ID (não mudar)"], motivo: m["Motivo no menu"], precisaHorario: sn(m["Precisa de horário?"]), destino: m["Destino / setor"], status: m.Status,
      })),
      frases: linhasOrganizada("Frases de teste").map((f) => ({
        n: Number(f["Nº"]), frase: f["Frase do cidadão"], cidade: f.Cidade, assuntoEsperado: f["Assunto esperado"],
        juizoEsperado: f["Onde deve cair"], advogadoEsperado: f["Precisa de advogado?"],
        riscoEsperado: sn(f["Risco?"]), oQueTesta: f["O que testa"],
      })),
    }
  : {
      assuntos: linhas("Assuntos").map((a) => ({
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
      })),
      unidades: linhas("Unidades").map((u) => ({
        id: u.id, nome: u.nome_oficial, comarca: u.comarca, endereco: u.endereco,
        horario: u.horario, canais: u.canais, contato: u.link_ou_contato, status: u.status,
      })),
      orgaos: linhas("Orgaos externos").map((o) => ({
        id: o.id, nome: o.nome, quandoIndicar: o.quando_indicar, contato: o.como_contatar, link: o.link, status: o.status,
      })),
      motivos: linhas("Motivos advogado").map((m) => ({
        id: m.id, motivo: m.motivo_no_menu, precisaHorario: sn(m.precisa_horario), destino: m.setor_ou_destino, status: m.status,
      })),
      frases: linhas("Frases de teste").map((f) => ({
        n: Number(f.n), frase: f.frase_do_cidadao, cidade: f.cidade, assuntoEsperado: f.assunto_esperado,
        juizoEsperado: f.juizo_esperado, advogadoEsperado: f.precisa_advogado_esperado,
        riscoEsperado: f.risco_esperado === "Sim", oQueTesta: f.o_que_testa,
      })),
    };

const salvar = (nome, dados) => {
  writeFileSync(`data/${nome}.json`, JSON.stringify(dados, null, 2) + "\n");
  console.log(`data/${nome}.json: ${dados.length} registros`);
};
salvar("assuntos", mapa.assuntos);
salvar("unidades", mapa.unidades);
salvar("orgaos", mapa.orgaos);
salvar("motivos-advogado", mapa.motivos);
salvar("frases-teste", mapa.frases);
