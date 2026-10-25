export type Assunto = {
  id: string;
  nome: string;
  exemplos: string[];
  competencia: "TJPA" | "Justiça Federal" | "Justiça do Trabalho" | "Fora do Judiciário" | string;
  unidades: Record<string, string | null>;
  resolveNaHora: boolean;
  comoResolveNaHora: string | null;
  exigeValor: boolean;
  regraAdvogado: string;
  documentos: string[];
  sempreHumano: boolean;
  observacoes: string | null;
  status: string | null;
};

export type Unidade = {
  id: string; nome: string; comarca: string | null; endereco: string | null;
  horario: string | null; canais: string | null; contato: string | null; status: string | null;
};

export type Orgao = {
  id: string; nome: string; quandoIndicar: string | null; contato: string | null; link: string | null; status: string | null;
};

export type MotivoAdvogado = {
  id: string; motivo: string; precisaHorario: boolean; destino: string | null; status: string | null;
};

export type Mensagem = { papel: "cidadao" | "assistente"; texto: string; em: string };

export type Status =
  | "em_triagem"
  | "aguardando_atendimento"
  | "em_atendimento"
  | "concluido"
  | "encaminhado_humano"
  | "emergencia"
  | "resolvido_sem_fila";

export type Atendimento = {
  protocolo: string;
  perfil: "cidadao" | "advogado";
  canal: string;
  status: Status;
  historicoStatus: { status: Status; em: string }[];
  historico: Mensagem[];
  perguntasFeitas: number;
  ficha: Record<string, unknown> | null;
  decisao: Record<string, unknown> | null;
  motivoEncaminhamento: string | null;
  senha: string | null;
  unidadeId: string | null;
  respostaAoCidadao: string | null;
  triagemCorreta: boolean | null;
  satisfacao: number | null;
  advogado?: { oab: string; processo: string | null; motivoId: string; horario: string | null };
  registros: { em: string; evento: string; detalhe?: unknown }[];
  criadoEm: string;
};
