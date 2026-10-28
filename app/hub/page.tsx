import type { Metadata } from "next";
import { AbasServicos, type Servico } from "./abas-servicos";
import { AtendimentoHub } from "./atendimento";
import { AvisoCookies, BarraAcessibilidade } from "./barra-acessibilidade";
import "./hub.css";

export const metadata: Metadata = {
  title: "Hub de atendimento · TJPA (protótipo)",
  description: "Protótipo visual do hub de links do TJPA com o atendimento ByteMe embutido.",
};

// Links oficiais conferidos na página inicial do portal do TJPA (www.tjpa.jus.br/PortalExterno) em 27/10/2026.
const PARA_TODOS: Servico[] = [
  { nome: "Consulta de processos", para: "Ver como está um processo pelo número ou pelo nome", url: "https://consultas.tjpa.jus.br/consultaunificada/consulta/principal" },
  { nome: "Balcão Virtual", para: "Falar por vídeo com a secretaria da vara no horário de expediente", url: "https://www.tjpa.jus.br/PortalExterno/institucional/Balcao-Virtual-e-Contatos/785286-atendimento-tjpa.xhtml" },
  { nome: "Agendamento online", para: "Marcar atendimento presencial", url: "https://www.tjpa.jus.br/PortalExterno/institucional/Balcao-Virtual-e-Contatos/844288-agendamento-online.xhtml" },
  { nome: "Certidões", para: "Tirar certidão cível ou criminal de graça e conferir se uma certidão é verdadeira", url: "https://portal-certidao.tjpa.jus.br/" },
];
const PARA_CIDADAOS: Servico[] = [
  { nome: "Juizados Especiais (primeiro atendimento)", para: "Entrar com uma ação sem advogado em causas menores", url: "https://www.tjpa.jus.br/PortalExterno/institucional/Juizados-Especiais/1146301-primeiro-atendimento-juizado-especiais.xhtml" },
  { nome: "Mediadores certificados", para: "Encontrar um mediador para resolver o conflito por acordo", url: "https://sisgemec.tjpa.jus.br/publico/mediadores" },
  { nome: "Consumidor.gov.br", para: "Reclamar de uma empresa antes de ir à Justiça", url: "https://www.consumidor.gov.br/" },
  { nome: "Lista de contatos das unidades", para: "Telefone e e-mail de varas, fóruns e secretarias", url: "https://contatos.tjpa.jus.br/" },
  { nome: "Ouvidoria", para: "Reclamar, elogiar ou sugerir algo sobre o atendimento do Tribunal", url: "https://apps.tjpa.jus.br/ouvidoria/externo/cadastro.do" },
];
const PARA_ADVOGADOS: Servico[] = [
  { nome: "Portal PJe", para: "Peticionar e acompanhar processos eletrônicos (precisa de certificado digital)", url: "https://www.tjpa.jus.br/PortalExterno/institucional/Portal-PJE/942-Apresentacao.xhtml" },
  { nome: "Diário de Justiça Eletrônico", para: "Publicações e intimações", url: "https://dje.tjpa.jus.br/ClientDJEletronico/app/home.html" },
  { nome: "Emissão de custas", para: "Gerar a guia de custas processuais", url: "https://apps.tjpa.jus.br/custas/" },
  { nome: "Push · Agenda do advogado", para: "Receber aviso de andamento dos seus processos", url: "https://consultas.tjpa.jus.br/push/login" },
  { nome: "Depósitos judiciais", para: "Consultar e gerar depósitos judiciais", url: "https://apps.tjpa.jus.br/DepositosJudiciaisOnline/" },
  { nome: "Jurisprudência", para: "Pesquisar decisões do Tribunal", url: "https://www.tjpa.jus.br/PortalExterno/hotsite/jurisprudencia/" },
  { nome: "Manuais e vídeos do PJe", para: "Passo a passo do PJe para advogados", url: "https://www.tjpa.jus.br/PortalExterno/institucional/Manuais-e-videos---PJe-(externo)/1087291-advogados.xhtml" },
];


const PORTAL = "https://www.tjpa.jus.br/PortalExterno";
const LINKS = {
  transparencia: `${PORTAL}/transparencia/`,
  sic: `${PORTAL}/institucional/SIC---Ouvidoria-Judiciaria/1022292-sic-servico-de-informacao-ao-cidadao.xhtml`,
  licitacoes: `${PORTAL}/institucional/Coordenadoria-de-Convenios-e-Contratos/409290-licitacoes.xhtml`,
  orcamento: `${PORTAL}/hotsite/coordenadoria-de-orcamento/`,
  cartaServicos: `${PORTAL}/institucional/SIC---Ouvidoria-Judiciaria/437267-carta-de-servicos-ao-cidadao.xhtml`,
  contato: `${PORTAL}/institucional/Sobre-o-TJ/273247-Contatos.xhtml`,
  ouvidoria: "https://apps.tjpa.jus.br/ouvidoria/externo/cadastro.do",
  lgpd: `${PORTAL}/institucional/Lei-Geral-de-Protecao-de-Dados---LGPD/1209310-home.xhtml`,
  privacidade: `${PORTAL}/institucional/Lei-Geral-de-Protecao-de-Dados---LGPD/1209309-politica-de-privacidade-de-dados-pessoais.xhtml`,
  privacidadeNavegacao: `${PORTAL}/institucional/Lei-Geral-de-Protecao-de-Dados---LGPD/1209301-politica-de-privacidade-para-navegacao.xhtml`,
  acessibilidade: `${PORTAL}/institucional/Acessibilidade/434261-acessibilidade.xhtml`,
};

export default function Hub() {
  return (
    <div className="portal">
      <p className="hub-faixa-prototipo">Protótipo da equipe ByteMe para o Hackathon TJPA 2026. Não é o site oficial do Tribunal.</p>
      <BarraAcessibilidade />

      <div className="hub-topbar">
        <ul>
          <li><a href={LINKS.transparencia}>Transparência</a></li>
          <li><a href={LINKS.sic}>Acesso à Informação (SIC)</a></li>
          <li><a href={LINKS.ouvidoria}>Ouvidoria</a></li>
          <li><a href={`${PORTAL}/institucional/Juizados-Especiais/1146301-primeiro-atendimento-juizado-especiais.xhtml`}>Juizados Especiais</a></li>
          <li><a href={LINKS.acessibilidade}>Acessibilidade</a></li>
          <li><a href={LINKS.lgpd}>LGPD</a></li>
        </ul>
      </div>

      <header className="hub-cabecalho">
        <div className="hub-marca">
          <span className="hub-selo" aria-hidden="true">TJ<br />PA</span>
          <span className="hub-marca-nome">Tribunal de Justiça do Estado do Pará</span>
        </div>
        <form className="hub-busca" role="search" action="#">
          <label htmlFor="busca" className="sr-only">Buscar no portal</label>
          <input id="busca" type="search" placeholder="Digite aqui a sua busca" />
          <button type="submit" aria-label="Buscar">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M15 15l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
        </form>
      </header>

      <nav id="menu" className="hub-menu" aria-label="Menu principal">
        <ul>
          <li><a href="#conteudo" aria-current="page">Início</a></li>
          <li><a href="#servicos">Serviços</a></li>
          <li><a href="#atendimento-presencial">Atendimento</a></li>
          <li><a href={LINKS.transparencia}>Transparência</a></li>
          <li><a href={LINKS.cartaServicos}>Carta de Serviços</a></li>
          <li><a href="#rodape">Fale com o Tribunal</a></li>
        </ul>
      </nav>

      <div id="conteudo" className="hub-conteudo" tabIndex={-1}>
        <div className="hub-destaque">
          <section className="hub-atendimento" aria-labelledby="titulo-atendimento">
            <div className="hub-atendimento-topo">
              <h1 id="titulo-atendimento">Como podemos ajudar?</h1>
              <p>Conte seu problema com suas palavras, escrevendo ou falando, ou mande a foto de um papel da Justiça que você recebeu.</p>
            </div>
            <div className="hub-chat">
              <AtendimentoHub />
            </div>
          </section>

          <section className="hub-acesso" aria-labelledby="titulo-acesso">
            <h2 id="titulo-acesso" className="hub-titulo">Acesso rápido</h2>
            <ul className="hub-blocos">
              {PARA_TODOS.map((s) => (
                <li key={s.nome}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    <strong>{s.nome}</strong>
                    <span>{s.para}</span>
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="hub-emergencia">Em caso de violência ou ameaça, ligue <strong>190</strong> (Polícia) ou <strong>180</strong> (Central da Mulher).</p>
          </section>
        </div>

        <section id="servicos" aria-labelledby="titulo-servicos">
          <h2 id="titulo-servicos" className="hub-titulo">Serviços mais procurados</h2>
          <AbasServicos abas={[
            { id: "cidadao", titulo: "Cidadão", itens: PARA_CIDADAOS },
            { id: "advogado", titulo: "Advogado", itens: PARA_ADVOGADOS },
          ]} />
        </section>

        <section id="atendimento-presencial" className="hub-caixa" aria-labelledby="titulo-presencial">
          <h2 id="titulo-presencial" className="hub-titulo">Atendimento presencial</h2>
          <p>Fórum de Ananindeua · endereço e telefone <em>(a confirmar com o TJPA)</em></p>
          <p>Horário de atendimento ao público: <em>(a confirmar)</em>. Veja as{" "}
            <a href={LINKS.contato}>informações sobre atendimento ao público</a> no portal.</p>
        </section>
      </div>

      <footer id="rodape" className="hub-rodape">
        <p className="hub-rodape-mapa">Mapa do site</p>
        <div className="hub-rodape-colunas">
          <div id="transparencia">
            <h2>Transparência</h2>
            <ul>
              <li><a href={LINKS.transparencia}>Portal da Transparência</a></li>
              <li><a href={LINKS.sic}>Acesso à Informação (SIC)</a></li>
              <li><a href={LINKS.orcamento}>Orçamento</a></li>
              <li><a href={LINKS.licitacoes}>Licitações</a></li>
              <li><a href="#">Perguntas frequentes</a></li>
            </ul>
          </div>
          <div id="ouvidoria">
            <h2>Fale com o Tribunal</h2>
            <ul>
              <li><a href={LINKS.ouvidoria}>Ouvidoria</a></li>
              <li><a href={LINKS.cartaServicos}>Carta de Serviços</a></li>
              <li><a href={LINKS.contato}>Contato</a></li>
              <li><a href="https://contatos.tjpa.jus.br/">Lista de contatos das unidades</a></li>
            </ul>
          </div>
          <div id="privacidade">
            <h2>Privacidade</h2>
            <ul>
              <li><a href={LINKS.privacidade}>Política de Privacidade e Proteção de Dados Pessoais</a></li>
              <li><a href={LINKS.privacidadeNavegacao}>Política de Privacidade para Navegação</a></li>
              <li><a href={LINKS.lgpd}>LGPD: encarregado e direitos do titular</a></li>
            </ul>
          </div>
          <div id="acessibilidade">
            <h2>Acessibilidade</h2>
            <ul>
              <li><a href={LINKS.acessibilidade}>Recursos de acessibilidade do portal</a></li>
              <li><a href="#conteudo">Atalhos de teclado: Alt+1 a Alt+4</a></li>
            </ul>
          </div>
        </div>
        <div className="hub-rodape-base">
          <span className="hub-rodape-nome">Tribunal de Justiça<br />do Estado do Pará</span>
          <address>
            <strong>Endereço:</strong> Av. Almirante Barroso, nº 3089, Souza, CEP 66613-710, Belém/PA<br />
            <strong>Telejudiciário:</strong> (91) 3205-2000, das 8h às 14h<br />
            <strong>Central de Serviços:</strong> (91) 3289-7100, das 8h às 20h
          </address>
        </div>
      </footer>

      <AvisoCookies />
    </div>
  );
}
