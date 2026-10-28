// Simulador da IA, para demonstrar o fluxo (pitch) enquanto a IA de verdade não está ligada.
// Faz o mesmo papel do llmMontaFicha: lê a conversa e devolve a FICHA. Quem decide continua sendo regras.ts.
// Como lê: pistas por assunto, os exemplos "Como o cidadão costuma falar" da planilha (data/assuntos.json)
// e expressões para valor, cidade, porte da empresa e risco. Não é IA: relato muito diferente do previsto cai no atendente.
// Ligado quando não há chave de IA, ou sempre com MODO_IA=simulador (veja modoSimulador em config.ts).
import { CIDADES, MAX_PERGUNTAS, slug } from "./config";
import { ASSUNTOS, assuntoPorId } from "./dados";
import type { Ficha, ResultadoLLM } from "./llm";
import { camposFaltando, normalizarFicha, PERGUNTA_PADRAO } from "./regras";
import { riscoPorPalavras } from "./risco";
import type { Mensagem } from "./tipos";

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Pistas por assunto. Cada expressão que aparece vale 1 ponto; ganha o assunto com mais pontos.
// No empate vale a ordem da lista: o mais específico primeiro (trabalho antes de dívida, pensão antes de dívida etc.).
const PISTAS: [string, RegExp[]][] = [
  ["intimacao_recebida", [/intima(c|d)|citacao|fui citad|mandado(?! embora)|oficial de justica/, /(papel|carta|documento|notificacao) d[oa] (forum|justica|tribunal|juiz)|(juiz|forum|tribunal|justica)\b.{0,25}(mandou|mandaram|enviou)|notificac/, /audiencia/]],
  ["trabalhista", [/rescisao|justa causa|verbas? (rescisori|trabalhist)|\bverbas?\b/, /carteira assinada|sem carteira|\bfgts\b|seguro.desemprego|decimo terceiro|horas? extras?/, /demiti|demissao|mandad[oa] embora|mandou embora|mandaram embora/, /\bpatra(o|oa)\b|\bchefe\b|trabalhei|trabalhava|trabalho (de|como)|diarista|empregada domestica|acidente (de|no) trabalho|acidente trabalhando|justica do trabalho/]],
  ["inss_beneficio", [/\binss\b|previdencia/, /aposentadoria|aposentar|auxilio.(doenca|acidente)|beneficio por incapacidade|\bloas\b|\bbpc\b|salario.maternidade|pensao por morte|pericia/]],
  ["plano_de_saude_negativa", [/plano de saude|plano medico|convenio|operadora de saude|unimed|hapvida|\bamil\b|\bo plano (nao|negou|recusou)/, /(negou|nao (quer )?(libera|liberar|cobre|cobrir|autoriza|autorizar))\b.{0,40}(cirurgia|exame|tratamento|terapia|internacao|remedio|consulta)|mensalidade/]],
  ["reconhecimento_paternidade", [/\bdna\b|paternidade/, /registrar (o|a|meu|minha) (bebe|filh|crianca|menin)|(nao|n) (quis|quer) registrar|nome do pai/]],
  ["guarda_e_visitas", [/\bguarda\b/, /visita|nao deixa (eu )?(ver|visitar|pegar)|ver (o|a|meu|minha) (menin|filh|crianca|net)|dia dos pais|dia das maes|levou (o|a|meu|minha|nosso|nossa) (filh|crianca|menin|bebe)/]],
  ["pensao_alimenticia", [/pensao|alimentos/, /(pai|mae) d[oa]s? (meu|minha|nosso|nossa)s? (filh|bebe|crianca|menin)|nao paga nada|nao ajuda (em|com) nada/]],
  ["divorcio_uniao_estavel", [/divorci|separar|separacao|uniao estavel/, /partilha (dos|de) bens|dividir (a casa|os bens)|casad[oa]s? (no papel|ha)|moramos juntos/]],
  ["inventario_e_heranca", [/inventario|heranca|herdeir|espolio|partilha/, /faleceu|falecid|morreu|obito/, /deixou (uma|um|a|o) (casa|terreno|apartamento|carro|dinheiro|imovel|lote)/]],
  ["aluguel_e_despejo", [/\balug|kitnet|kitinete/, /inquilin|locatari/, /despej|caucao|proprietario|dono (do imovel|da casa)|entrega(r)? a chave|me tirar (da|de) casa/]],
  ["acidente_de_transito", [/bate(ram|u) (no|na|em) (meu|minha|carro|moto|traseira|caminhao|onibus|bicicleta)|\bbatida\b|colisao|colidiu/, /avancou (o sinal|a preferencial|o semaforo|o pare)|acidente de (transito|carro|moto)|(me|fui) atropelad|me atropelou|amassou/, /traseira|motorista|prejuizo do conserto|conserto (do|da) (carro|moto|caminhao)|(carro|moto|caminhao|onibus|bicicleta)\b.{0,40}\bbate(u|ram)\b/]],
  ["nome_sujo_indevido", [/nome (sujo|ta sujo|esta sujo|ficou sujo|negativado|ta restrito|esta restrito)|sujaram|cpf sujo|restricao no (meu )?(nome|cpf)/, /\bserasa\b|\bspc\b|\bscpc\b|negativ(ad|ar|ou|acao)|protest(o|aram|ado)/, /(abriram|fizeram)\b.{0,30}no meu nome|(nunca|nao) (fiz|devi)/]],
  ["cobranca_indevida_servico", [/conta de (luz|energia|agua|telefone|internet|celular|gas)|equatorial|cosanpa|fatura|\b(internet|wi.?fi|telefone fixo|tv a cabo)\b.{0,40}(nao funciona|caiu|cortad|cobr)/, /tarifa|cobrando|cobraram|cobrou|cobram|cobrad[oa]|me cobra|cobranca (indevida|errada|abusiva|a mais|duplicada)/, /descont(ou|aram|ando)|emprestimo\b.{0,50}(nao|nunca|n) (fiz|pedi|contratei)|nao contratei|ja (paguei|estava pag)|conta paga/, /\bbanco\b|\bcartao\b|consignado|cortaram|corte de (luz|agua|energia)/]],
  ["consulta_processo", [/(saber|ver|consultar|consulto|acompanhar|olhar|descobr\w*)\b.{0,40}\b(processo|acao)\b|\b(processo|acao)\b.{0,40}(andamento|como (ele )?(ta|esta)|parad[oa]|saiu)/, /andamento|(numero|n) do (meu )?processo|saiu (a )?sentenca|em que pe|juiz (ja )?(decidiu|julgou|sentenciou)/]],
  ["certidao", [/certid(ao|oes)|antecedentes|folha corrida|nada consta/]],
  ["consumidor_produto_defeito", [/defeito|quebr(ou|ad)|estragou|parou de \w+|(nao|n) (funciona|liga)|veio (com|quebrad|errad|o \w+ errad|a \w+ errad)|trincad|rasgad|riscad|pingando|vazando/, /(nao|n) (quer |querem |quiseram )?(troca|trocar|devolve|devolver)|devolver o dinheiro|reembols|estorno|assistencia|garantia|(nao|n) consert/, /(nunca|nao) (entregaram|entregou|chegou)|atrasou|construtora|na planta/, /\bloja\b|comprei|compra pela internet/]],
  ["cobranca_de_divida", [/me deve|(ficou|ta|esta|estao) (me )?devendo|deixou de pagar|(nao|n) (me )?(pagou|paga|pagaram|devolveu)\b/, /emprest(ei|ado|ada|amos)|calote|fiado|vendi\b|(nao|n) (terminou|acabou) de pagar|parou de pagar|\bclientes?\b|dono da obra|fiz um servico/, /quero cobrar|cobrar (uma|a|essa) divida|\bdivida\b/]],
];

// Sinais de risco além das palavras de lib/risco.ts, que o código já checa antes. A IA de verdade também marca estes.
const RISCO = /acabar comigo|sumir comigo|(tocar|botar|por|tacar) fogo|incendiar|me machuc|me empurr|me enforc|me sufoc|me persegu|perseguind|perseguicao|medida protetiva|maria da penha|violencia domestica|tenho medo dele|tenho medo dela|me trancou|carcere|se matar|suicid|tirar (a minha|minha) vida/;
const QUER_HUMANO = /(alguem|pessoa|humano|gente|atendente) de verdade|me passa (pra|para) (alguem|um atendente|uma pessoa|um humano)|quero (falar com )?(um|uma) (atendente|pessoa|humano)|(falar|conversar) com (alguem|uma pessoa|o atendente|um atendente|atendente|um humano)|nao quero (falar com )?(robo|maquina)/;
const VAGO = /^(oi+|ola|opa|bom dia|boa tarde|boa noite|e ai|eai|alo|tudo bem)\b|preciso de (uma )?ajuda|me ajud|quero ajuda|tenho (um|uma) (problema|duvida|questao)|problema com a justica|(preciso|queria|quero) (de )?(uma )?informac|nao sei (o que fazer|como fazer|por onde)|^ajuda/;
const URGENTE = /urgent|urgencia|\bhoje\b|amanha|cortaram|corte de|despejo|audiencia|prazo|remedio|cirurgia|internad|sem comida|passando fome/;

// Cidades fora da demonstração mais comuns no Pará e capitais vizinhas. Cidade da lista CIDADES vence.
const OUTRAS_CIDADES = ["belem", "ananindeua", "marituba", "benevides", "santa izabel", "santa isabel", "castanhal", "maraba", "santarem", "parauapebas",
  "abaetetuba", "cameta", "braganca", "altamira", "barcarena", "tucurui", "paragominas", "itaituba", "tailandia", "igarape.miri", "salinopolis",
  "sao felix do xingu", "oriximina", "obidos", "monte alegre", "alenquer", "canaa dos carajas", "xinguara", "conceicao do araguaia", "capanema",
  "tome.acu", "sao miguel do guama", "capitao poco", "soure", "salvaterra", "marajo", "breves", "moju", "macapa", "manaus", "sao luis",
  "fortaleza", "brasilia", "sao paulo", "rio de janeiro"];
// Distritos de Belém que as pessoas citam como cidade.
const DISTRITOS: Record<string, string> = { icoaraci: "belem", mosqueiro: "belem", outeiro: "belem" };

function cidadeNoTrecho(t: string): string | null {
  const achada = OUTRAS_CIDADES.find((c) => new RegExp(`\\b${c}\\b`).test(t))
    ?? Object.keys(DISTRITOS).filter((d) => new RegExp(`\\b${d}\\b`).test(t)).map((d) => DISTRITOS[d])[0];
  const daLista = CIDADES.find((c) => new RegExp(`\\b${norm(c)}\\b`).test(t) || slug(c) === slug(achada));
  if (daLista) return daLista;
  return achada ? "outra" : null;
}

/** Cidade de quem fala: primeiro a que vem depois de "moro em", depois qualquer uma citada. */
function acharCidade(t: string): string | null {
  const ondeMora = t.match(/\b(moro|vivo|resido|sou de|aqui em)\b(.{0,40})/);
  return (ondeMora && cidadeNoTrecho(ondeMora[2])) ?? cidadeNoTrecho(t);
}

// ---------- Valor em reais: "paguei 2500", "R$ 2.500,00", "45 mil", "dois mil e quinhentos", "uns 3 mil" ----------
const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
  quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200,
  trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};
const MOEDA_DEPOIS = /^(reais|real|conto|contos|pila|pilas)$/;
const UNIDADE_DEPOIS = /^(anos?|mes(es)?|dias?|semanas?|h|hs|horas?|minutos?|vezes|x|filhos?|filhas?|funcionarios?|empregados?|colaboradores?|pessoas?|parcelas?|polegadas?|litros?|kg|km|metros?|m2|andares|quartos?|graus|porcento|%)$/;
const PISTA_ANTES = /^(paguei|pagou|pago|pagamos|custou|custa|deu|ficou|valor|valia|vale|deve|devendo|devia|preco|cobrando|cobraram|cobrou|prejuizo|gastei|uns|umas|cerca|quase|aproximadamente|tipo|veio)$/;
const BLOQUEIO_ANTES = /^(dia|n|numero|processo|casa|rua|lote|quadra|apto|bloco|cep|cpf|rg|as|ha|desde|linha|br|km)$/;

function numeroDigitos(tok: string): number {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(tok)) return Number(tok.replace(/\./g, "").replace(",", "."));
  if (/^\d+,\d+$/.test(tok)) return Number(tok.replace(",", "."));
  return Number(tok.replace(/[.,]$/, ""));
}

/** Maior valor em reais citado no texto, ou null. Números de anos, meses, funcionários etc. não contam. */
export function acharValor(texto: string): number | null {
  const toks = norm(texto).replace(/r\$/g, " r$ ").match(/r\$|\d[\d.,]*\d|\d|[a-z%]+/g) ?? [];
  const achados: number[] = [];
  let i = 0;
  while (i < toks.length) {
    const ehNumero = (t: string) => /^\d/.test(t) || t in NUMEROS || t === "mil";
    if (!ehNumero(toks[i])) { i++; continue; }
    const ini = i;
    let total = 0, atual = 0, temMil = false, temDigito = false;
    while (i < toks.length && (ehNumero(toks[i]) || (toks[i] === "e" && i + 1 < toks.length && ehNumero(toks[i + 1]) && i > ini))) {
      const t = toks[i];
      if (t === "mil") { total += (atual || 1) * 1000; atual = 0; temMil = true; }
      else if (/^\d/.test(t)) { if (atual) break; atual = numeroDigitos(t); temDigito = true; }
      else if (t !== "e") atual += NUMEROS[t];
      i++;
    }
    const valor = total + atual;
    const antes = toks[ini - 1] ?? "", depois = toks[i] ?? "";
    if (!valor || !Number.isFinite(valor) || /^\d{9,}$/.test(toks[ini]) || BLOQUEIO_ANTES.test(antes) || UNIDADE_DEPOIS.test(depois)) continue;
    const moeda = antes === "r$" || MOEDA_DEPOIS.test(depois);
    const pista = PISTA_ANTES.test(antes);
    const ano = temDigito && !temMil && valor >= 1950 && valor <= 2035 && /^(em|desde|ano)$/.test(antes); // "comprei em 2025"
    const sozinho = ini === 0 && i === toks.length; // resposta só com o número: "2500"
    // Número solto ("a geladeira de 2500"): só de 100 para cima, até 5 dígitos e sem outro número colado (telefone, CPF).
    const solto = temDigito && (sozinho || (valor >= 100 && toks[ini].replace(/\D/g, "").length <= 5 && !/^\d/.test(antes) && !/^\d/.test(depois)));
    if (!ano && (moeda || temMil || (pista && valor >= 10) || solto)) achados.push(valor);
  }
  return achados.length ? Math.max(...achados) : null;
}

function acharTipoAutor(t: string, ultimaPergunta: string, ultimaResposta: string): Ficha["tipo_autor"] {
  // Resposta à pergunta do porte ("é MEI?") vale primeiro.
  if (ultimaPergunta === PERGUNTA_PADRAO.porte_empresa) {
    if (/\bmei\b|micro|pequen/.test(ultimaResposta)) return "mei_me_epp";
    if (/medi[ao]|grande/.test(ultimaResposta)) return "outra_empresa";
  }
  if (/\bmei\b|microempreendedor|micro ?empresa|pequen[oa] (empresa|porte)|\bepp\b/.test(t)) return "mei_me_epp";
  if (/(media|grande) empresa|empresa (media|grande)|(medio|grande) porte/.test(t)) return "outra_empresa";
  const funcionarios = t.match(/(\d+) (funcionarios|empregados|colaboradores)/);
  if (funcionarios) return Number(funcionarios[1]) > 49 ? "outra_empresa" : "mei_me_epp";
  if (/minha empresa|tenho uma empresa|dono de uma empresa|\bcnpj\b/.test(t)) return null; // empresa sem porte: o código pergunta
  return "pessoa_fisica";
}

const CONTRA_QUEM: [RegExp, string][] = [
  [/\bloja\b/, "loja"], [/construtora/, "construtora"], [/plano de saude|convenio|operadora de saude/, "plano de saúde"],
  [/\binss\b/, "INSS"], [/conta de (luz|energia)|equatorial/, "empresa de energia"], [/conta de agua|cosanpa/, "empresa de água"],
  [/\bbanco\b|emprestimo/, "banco"], [/inquilin/, "inquilino"], [/proprietario|dono do imovel/, "proprietário do imóvel"],
  [/\bclientes?\b/, "cliente"], [/\bpatra(o|oa)\b|\bchefe\b|mandou embora|demitiu/, "empregador"], [/pai d[oa]s? (meu|minha|nosso|nossa)/, "pai da criança"],
  [/mae d[oa]s? (meu|minha|nosso|nossa)/, "mãe da criança"], [/\bmarido\b|\bex\b|ex.marido|ex.mulher|companheir|esposa/, "companheiro(a) ou ex"],
  [/vizinh/, "vizinho"], [/motorista|um carro|uma moto/, "outro motorista"],
];

// Pergunta do valor no jeito de cada assunto, como a IA faria ("Quanto você pagou pela geladeira?").
const PRODUTOS: [RegExp, string][] = [
  [/geladeir|gelader/, "pela geladeira"], [/celular/, "pelo celular"], [/televis|\btv\b/, "pela TV"], [/fogao/, "pelo fogão"],
  [/maquina de lavar/, "pela máquina de lavar"], [/notebook|computador/, "pelo computador"], [/\bcarro\b/, "pelo carro"], [/\bmoto\b/, "pela moto"],
  [/sofa/, "pelo sofá"], [/ar.condicionado/, "pelo ar-condicionado"], [/apartamento/, "pelo apartamento"], [/movel|moveis|guarda.roupa/, "pelo móvel"],
];
function perguntaDoValor(assunto: string, t: string): string {
  switch (assunto) {
    case "consumidor_produto_defeito":
      return `Quanto você pagou ${PRODUTOS.find(([re]) => re.test(t))?.[1] ?? "pelo produto"}, mais ou menos?`;
    case "cobranca_indevida_servico":
      return /emprestimo/.test(t) ? "Qual o valor do empréstimo que estão descontando, mais ou menos?"
        : /conta de/.test(t) ? "De quanto veio a conta, mais ou menos?" : "Qual o valor cobrado, mais ou menos?";
    case "nome_sujo_indevido": return "Qual o valor da dívida que colocaram no seu nome, mais ou menos?";
    case "plano_de_saude_negativa": return "Quanto custa o tratamento que o plano negou, mais ou menos?";
    case "cobranca_de_divida": return "Quanto a pessoa te deve, mais ou menos?";
    case "acidente_de_transito": return "Quanto ficou o prejuízo ou o conserto, mais ou menos?";
    default: return PERGUNTA_PADRAO.valor;
  }
}

// ---------- Exemplos da planilha: usados quando nenhuma pista bate ----------
const PARADAS = new Set("a o as os um uma uns umas de do da dos das no na nos nas em e que eu me meu minha meus minhas ele ela eles elas se pra para por com sem nao ja mas foi ta esta tem ter quero estou to isso esse essa la lhe nem mais muito".split(" "));
const raizes = (t: string) => new Set(norm(t).split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !PARADAS.has(p)).map((p) => p.slice(0, 5)));
const EXEMPLOS = ASSUNTOS.flatMap((a) => a.exemplos.map((e) => ({ id: a.id, raizes: raizes(e) })));

/** Assunto mais parecido com um exemplo da planilha: fração das palavras do exemplo que aparecem no relato. */
function parecidoComExemplo(texto: string): { id: string; semelhanca: number } | null {
  const r = raizes(texto);
  let melhor: { id: string; semelhanca: number } | null = null;
  for (const ex of EXEMPLOS) {
    if (!ex.raizes.size) continue;
    const s = [...ex.raizes].filter((p) => r.has(p)).length / ex.raizes.size;
    if (!melhor || s > melhor.semelhanca) melhor = { id: ex.id, semelhanca: s };
  }
  return melhor && melhor.semelhanca >= 0.5 ? melhor : null;
}

function acharAssunto(t: string): { id: string; confianca: number; pistas: string[] } {
  let melhor = { id: "indefinido", pontos: 0, pistas: [] as string[] };
  for (const [id, lista] of PISTAS) {
    const pistas = lista.map((re) => t.match(re)?.[0]).filter((p): p is string => !!p);
    if (pistas.length > melhor.pontos) melhor = { id, pontos: pistas.length, pistas };
  }
  if (melhor.pontos) return { id: melhor.id, confianca: melhor.pontos >= 2 ? 0.92 : 0.85, pistas: melhor.pistas };
  const ex = parecidoComExemplo(t);
  if (ex) return { id: ex.id, confianca: Math.min(0.9, 0.6 + 0.3 * ex.semelhanca), pistas: [`exemplo da planilha (${Math.round(ex.semelhanca * 100)}%)`] };
  return { id: "indefinido", confianca: 0.2, pistas: [] };
}

const resumir = (t: string, palavras: number) => { const p = t.split(/\s+/); return p.length > palavras ? `${p.slice(0, palavras).join(" ")}…` : t; };

/** Monta a ficha a partir da conversa, sem IA. Mesmo formato e mesmas regras do prompt (lib/prompt.ts). */
export function simularFicha(historico: Mensagem[], perguntasFeitas: number): ResultadoLLM {
  const t0 = Date.now();
  const falas = historico.filter((m) => m.papel === "cidadao").map((m) => m.texto);
  const tudo = norm(falas.join(". "));
  const ultima = norm(falas.at(-1) ?? "");
  const ultimaPergunta = [...historico].reverse().find((m) => m.papel === "assistente")?.texto ?? "";

  const risco = RISCO.test(tudo) || riscoPorPalavras(falas.join(". "));
  const assunto = risco ? { id: "violencia_domestica", confianca: 0.9, pistas: [tudo.match(RISCO)?.[0] ?? "palavra de risco"] } : acharAssunto(tudo);
  // Valor: vale a fala mais recente que cita um (a pessoa pode corrigir: "na verdade foi 3 mil").
  const valor = [...falas].reverse().map(acharValor).find((v) => v != null) ?? null;
  // Resposta à pergunta da cidade com uma cidade que o simulador não conhece: é de fora da demonstração.
  const cidade = acharCidade(tudo) ?? (ultimaPergunta === PERGUNTA_PADRAO.cidade && /[a-z]{3}/.test(ultima) ? "outra" : null);
  const a = assuntoPorId(assunto.id);

  const ficha: Ficha = {
    risco_imediato: risco,
    quer_humano: QUER_HUMANO.test(ultima),
    assunto_id: assunto.id,
    confianca: assunto.confianca,
    cidade,
    contra_quem: CONTRA_QUEM.find(([re]) => re.test(tudo))?.[1] ?? null,
    valor_estimado_reais: valor,
    urgencia: risco || URGENTE.test(tudo) ? "alta" : a && ["cobranca_indevida_servico", "nome_sujo_indevido", "plano_de_saude_negativa", "pensao_alimenticia", "consumidor_produto_defeito", "aluguel_e_despejo"].includes(a.id) ? "media" : "baixa",
    tipo_autor: acharTipoAutor(tudo, ultimaPergunta, ultima),
    // Para o atendente ler rápido. Assunto, cidade e valor já aparecem em campos próprios no painel.
    resumo: `Relato do cidadão: "${resumir(falas.join(" / "), 40)}"`,
    pergunta_pendente: null,
  };

  // Pergunta no jeito da IA (regra 9 do prompt). Cidade e porte usam a pergunta padrão do código.
  if (perguntasFeitas < MAX_PERGUNTAS && !risco && !ficha.quer_humano) {
    if (ficha.assunto_id === "indefinido") {
      if (VAGO.test(ultima) || ultima.split(" ").length <= 3) {
        ficha.pergunta_pendente = perguntasFeitas === 0
          ? "Claro, estou aqui para ajudar. Pode me contar com suas palavras o que aconteceu?"
          : "Pode me dar um pouco mais de detalhe? Por exemplo: uma compra, uma conta, uma dívida, um assunto de família ou um papel da Justiça.";
      }
    } else if (camposFaltando(normalizarFicha(ficha))[0] === "valor") {
      ficha.pergunta_pendente = perguntaDoValor(ficha.assunto_id, tudo);
    }
  }

  const bruto = JSON.stringify({ ...ficha, _simulador: { pistas: assunto.pistas } });
  return { ficha, provedor: "simulador", bruto, ms: Date.now() - t0 };
}
