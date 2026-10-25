-- Esquema para quando o ByteMe sair do notebook e for para a Vercel + Supabase.
-- A versão 0 guarda tudo em memória + data/runtime-db.json (lib/store.ts). Este arquivo ainda NÃO é usado pelo código:
-- é o desenho das tabelas para trocar lib/store.ts por chamadas ao Supabase mantendo as mesmas funções.
-- Rodar no SQL Editor do Supabase. Só dados fictícios (regra eliminatória do edital).

-- Tabelas de referência (vêm da planilha da Amyr; hoje ficam em data/*.json).
create table if not exists unidades (
  id          text primary key,            -- ex.: jec_civel_ananindeua
  nome        text not null,
  comarca     text,
  endereco    text,
  horario     text,
  canais      text,
  contato     text,
  status      text
);

create table if not exists orgaos_externos (
  id              text primary key,        -- ex.: trt8, jef_dpu, procon_pa
  nome            text not null,
  quando_indicar  text,
  contato         text,
  link            text,
  status          text
);

create table if not exists assuntos (
  id                    text primary key,  -- ex.: consumidor_produto_defeito
  nome                  text not null,
  exemplos              text[] not null default '{}',
  competencia           text not null,     -- TJPA | Justiça Federal | Justiça do Trabalho | Fora do Judiciário
  unidades              jsonb not null default '{}', -- {"ananindeua": "jec_civel_ananindeua", "belem": "jec_civel_belem"}
  resolve_na_hora       boolean not null default false,
  como_resolve_na_hora  text,
  exige_valor           boolean not null default false,
  regra_advogado        text not null,
  documentos            text[] not null default '{}',
  sempre_humano         boolean not null default false,
  observacoes           text,               -- só a equipe lê
  status                text
);

create table if not exists motivos_advogado (
  id               text primary key,       -- ex.: secretaria, despacho_juiz
  motivo           text not null,
  precisa_horario  boolean not null default false,
  destino          text,
  status           text
);

-- Atendimentos (cidadão e advogado). Um registro por protocolo.
create table if not exists atendimentos (
  protocolo              text primary key, -- BM-AAAAMMDD-0001
  perfil                 text not null check (perfil in ('cidadao', 'advogado')),
  canal                  text not null default 'web',
  status                 text not null check (status in (
                           'em_triagem', 'aguardando_atendimento', 'em_atendimento', 'concluido',
                           'encaminhado_humano', 'emergencia', 'resolvido_sem_fila')),
  perguntas_feitas       int  not null default 0,
  ficha                  jsonb,            -- a ficha que a IA montou (já normalizada pelo código)
  decisao                jsonb,            -- o que as regras decidiram e por quê
  motivo_encaminhamento  text,
  senha                  text,
  unidade_id             text references unidades(id),
  resposta_ao_cidadao    text,
  triagem_correta        boolean,          -- botão "Triagem correta? Sim/Não" do atendente
  satisfacao             int check (satisfacao between 1 and 5),
  advogado               jsonb,            -- {oab, processo, motivoId, horario}
  criado_em              timestamptz not null default now()
);
create index if not exists atendimentos_status_idx on atendimentos (status, criado_em);

-- Conversa, histórico de status e auditoria: uma linha por evento (cada decisão fica gravada com o motivo).
create table if not exists mensagens (
  id          bigint generated always as identity primary key,
  protocolo   text not null references atendimentos(protocolo) on delete cascade,
  papel       text not null check (papel in ('cidadao', 'assistente')),
  texto       text not null,
  em          timestamptz not null default now()
);

create table if not exists historico_status (
  id          bigint generated always as identity primary key,
  protocolo   text not null references atendimentos(protocolo) on delete cascade,
  status      text not null,
  em          timestamptz not null default now()
);

create table if not exists registros (
  id          bigint generated always as identity primary key,
  protocolo   text not null references atendimentos(protocolo) on delete cascade,
  evento      text not null,               -- ficha_ia, pergunta, decisao, erro_ia, menu_advogado...
  detalhe     jsonb,
  em          timestamptz not null default now()
);

-- Contadores de senha (C = cidadão, A = advogado) e de protocolo do dia.
create table if not exists contadores (
  nome   text primary key,                 -- 'senha', 'protocolo:20261025'
  valor  int not null default 0
);

-- Segurança: com RLS ligado e sem políticas, só o servidor (chave service_role, nunca no navegador) lê e grava.
alter table atendimentos      enable row level security;
alter table mensagens         enable row level security;
alter table historico_status  enable row level security;
alter table registros         enable row level security;
alter table contadores        enable row level security;
