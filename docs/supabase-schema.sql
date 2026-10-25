-- Esquema do ByteMe no Supabase. Rodar UMA vez, no SQL Editor do projeto (colar tudo e clicar em Run).
-- O código (lib/store.ts) guarda cada atendimento inteiro em `dados` (JSON) e repete em colunas só o que precisa filtrar.
-- A tabela de assuntos, unidades e órgãos continua nos arquivos data/*.json (gerados da planilha da equipe jurídica).
-- Só dados fictícios (regra eliminatória do edital).

create table if not exists atendimentos (
  protocolo   text primary key,              -- BM-AAAAMMDD-0001
  status      text not null,                 -- em_triagem, aguardando_atendimento, em_atendimento, concluido, emergencia, resolvido_sem_fila
  unidade_id  text,
  criado_em   timestamptz not null,
  dados       jsonb not null                 -- conversa, ficha da IA, decisão e motivo, senha, avaliações, registros de auditoria
);
create index if not exists atendimentos_status_idx on atendimentos (status, criado_em);

-- Contadores de senha ('senha') e de protocolo por dia ('protocolo:AAAAMMDD').
create table if not exists contadores (
  nome   text primary key,
  valor  int not null default 0
);

-- Soma 1 e devolve o novo valor, de forma atômica (dois cidadãos ao mesmo tempo não recebem a mesma senha).
create or replace function proximo_contador(p_nome text) returns int
language sql as $$
  insert into contadores (nome, valor) values (p_nome, 1)
  on conflict (nome) do update set valor = contadores.valor + 1
  returning valor;
$$;

-- Segurança: com RLS ligado e sem nenhuma política, o navegador (chave pública) não lê nem grava nada.
-- Só o servidor do ByteMe acessa, com a chave secreta (service_role / secret), que nunca vai para o GitHub nem para o navegador.
alter table atendimentos enable row level security;
alter table contadores   enable row level security;
revoke all on function proximo_contador(text) from public, anon, authenticated;
grant execute on function proximo_contador(text) to service_role;
