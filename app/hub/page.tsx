import type { Metadata } from "next";
import { ChatTriagem } from "../chat";
import { AvisoCookies, BarraAcessibilidade } from "./barra-acessibilidade";
import "./hub.css";

export const metadata: Metadata = {
  title: "Hub de atendimento · TJPA (protótipo)",
  description: "Protótipo visual do hub de links do TJPA com o atendimento ByteMe embutido.",
};

type Servico = { nome: string; para: string; url: string };

// Links oficiais conferidos no "Acesso Rápido" do portal do TJPA em 27/10/2026.
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
  { nome: "Ouvidoria", para: "Reclamar, elogiar ou sugerir algo sobre o atendimento do Tribunal", url: "https://apps.tjpa.jus.br/ouvidoria/externo/cadastro.do" },
];
const PARA_ADVOGADOS: Servico[] = [
  { nome: "PJe", para: "Peticionar e acompanhar processos eletrônicos (precisa de certificado digital)", url: "https://pje.tjpa.jus.br/" },
  { nome: "Diário de Justiça Eletrônico", para: "Publicações e intimações", url: "https://dje.tjpa.jus.br/ClientDJEletronico/app/home.html" },
  { nome: "Emissão de custas", para: "Gerar a guia de custas processuais", url: "https://apps.tjpa.jus.br/custas/" },
  { nome: "Push · Agenda do advogado", para: "Receber aviso de andamento dos seus processos", url: "https://consultas.tjpa.jus.br/push/login" },
  { nome: "Depósitos judiciais", para: "Consultar e gerar depósitos judiciais", url: "https://apps.tjpa.jus.br/DepositosJudiciaisOnline/" },
  { nome: "Jurisprudência", para: "Pesquisar decisões do Tribunal", url: "https://www.tjpa.jus.br/PortalExterno/hotsite/jurisprudencia/" },
];

function ListaServicos({ itens }: { itens: Servico[] }) {
  return (
    <ul className="hub-servicos">
      {itens.map((s) => (
        <li key={s.nome}>
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            <strong>{s.nome}</strong>
            <span>{s.para}</span>
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function Hub() {
  return (
    <div className="portal">
      <p className="hub-faixa-prototipo">Protótipo da equipe ByteMe para o Hackathon TJPA 2026. Não é o site oficial do Tribunal.</p>
      <BarraAcessibilidade />

      <header className="hub-cabecalho">
        <div className="hub-marca">
          <span className="hub-selo" aria-hidden="true">TJPA</span>
          <span>Poder Judiciário<br /><strong>Tribunal de Justiça do Estado do Pará</strong></span>
        </div>
        <form className="hub-busca" role="search" action="#">
          <label htmlFor="busca" className="sr-only">Buscar no portal</label>
          <input id="busca" type="search" placeholder="Buscar no portal" />
          <button type="submit">Buscar</button>
        </form>
      </header>

      <nav id="menu" className="hub-menu" aria-label="Menu principal">
        <ul>
          <li><a href="#">Institucional</a></li>
          <li><a href="#servicos">Serviços</a></li>
          <li><a href="#transparencia">Transparência</a></li>
          <li><a href="#ouvidoria">Ouvidoria</a></li>
          <li><a href="#">Imprensa</a></li>
          <li><a href="#privacidade">LGPD</a></li>
        </ul>
      </nav>

      <div id="conteudo" className="hub-conteudo" tabIndex={-1}>
        <section className="hub-atendimento" aria-labelledby="titulo-atendimento">
          <div className="hub-atendimento-texto">
            <h1 id="titulo-atendimento">Como podemos ajudar?</h1>
            <p>Conte seu problema com suas palavras. A gente diz para onde ir, o que levar e se você precisa de advogado.</p>
            <p className="hub-pequeno">Em caso de violência ou ameaça, ligue <strong>190</strong> (Polícia) ou <strong>180</strong> (Central da Mulher).</p>
          </div>
          <div className="hub-chat">
            <ChatTriagem />
          </div>
        </section>

        <section id="servicos" aria-labelledby="titulo-servicos">
          <h2 id="titulo-servicos">Serviços mais procurados</h2>
          <ListaServicos itens={PARA_TODOS} />
          <div className="hub-colunas">
            <div>
              <h3>Para cidadãos</h3>
              <ListaServicos itens={PARA_CIDADAOS} />
            </div>
            <div>
              <h3>Para advogados</h3>
              <ListaServicos itens={PARA_ADVOGADOS} />
            </div>
          </div>
        </section>

        <section id="atendimento-presencial" className="hub-caixa" aria-labelledby="titulo-presencial">
          <h2 id="titulo-presencial">Atendimento presencial</h2>
          <p>Fórum de Ananindeua · endereço e telefone <em>(a confirmar com o TJPA)</em></p>
          <p>Horário de atendimento ao público: <em>(a confirmar)</em></p>
        </section>
      </div>

      <footer id="rodape" className="hub-rodape">
        <div className="hub-rodape-colunas">
          <div id="transparencia">
            <h2>Transparência</h2>
            <ul>
              <li><a href="#">Acesso à Informação (LAI)</a></li>
              <li><a href="#">Pedido de informação (SIC)</a></li>
              <li><a href="#">Estrutura, competências e contatos</a></li>
              <li><a href="#">Orçamento, licitações e contratos</a></li>
              <li><a href="#">Perguntas frequentes</a></li>
            </ul>
          </div>
          <div id="ouvidoria">
            <h2>Fale com o Tribunal</h2>
            <ul>
              <li><a href="https://apps.tjpa.jus.br/ouvidoria/externo/cadastro.do">Ouvidoria</a></li>
              <li><a href="#">Carta de Serviços ao Usuário</a></li>
              <li><a href="#">Telefones e endereços das unidades</a></li>
            </ul>
          </div>
          <div id="privacidade">
            <h2>Privacidade</h2>
            <ul>
              <li><a href="https://www.tjpa.jus.br/PortalExterno/institucional/Lei-Geral-de-Protecao-de-Dados---LGPD/1209309-politica-de-privacidade-de-dados-pessoais.xhtml">Política de Privacidade e Proteção de Dados</a></li>
              <li><a href="#">Encarregado de dados (LGPD)</a></li>
              <li><a href="#">Seus direitos como titular de dados</a></li>
            </ul>
          </div>
          <div id="acessibilidade">
            <h2>Acessibilidade</h2>
            <ul>
              <li><a href="#">Recursos de acessibilidade do portal</a></li>
              <li><a href="#">Atalhos de teclado</a></li>
              <li><a href="#">Mapa do site</a></li>
            </ul>
          </div>
        </div>
        <p className="hub-pequeno">Tribunal de Justiça do Estado do Pará · Belém/PA · endereço e telefone <em>(a confirmar)</em></p>
      </footer>

      <AvisoCookies />
    </div>
  );
}
