-- MOSHR — tabelas de pedidos. Cole no Supabase: SQL Editor > New query > Run.
-- Segurança: RLS ligado e permissão SÓ para o servidor (service_role). anon/authenticated não acessam nada.

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,                       -- ex.: MSH-1A2B3C4D (também é o external_reference no Mercado Pago)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','em_processamento','comprado_fornecedor','enviado','entregue','cancelado','expirado')),
  forma_pagamento text not null check (forma_pagamento in ('pix','checkout_pro')),
  gateway_id text,                                   -- id da order (Pix) ou da preferência (Checkout Pro)
  pago_em timestamptz,
  cliente_nome text not null,
  cliente_email text not null,
  cliente_telefone text,
  cep text, endereco text, numero_endereco text, cidade text, uf text,
  subtotal numeric(10,2) not null,
  frete numeric(10,2) not null,
  total numeric(10,2) not null,
  rastreio text,
  observacoes text
);

create table if not exists public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id integer not null,
  nome text not null,
  tamanho text not null,
  cor text not null,
  quantidade integer not null check (quantidade > 0),
  preco_unit numeric(10,2) not null,
  custo_unit numeric(10,2),
  link_fornecedor text
);

create table if not exists public.pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  tipo text not null,
  detalhe jsonb
);

create index if not exists pedidos_status_idx on public.pedidos (status, criado_em desc);
create index if not exists pedido_itens_pedido_idx on public.pedido_itens (pedido_id);
create index if not exists pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id);

create or replace function public.set_atualizado_em() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;
drop trigger if exists pedidos_atualizado on public.pedidos;
create trigger pedidos_atualizado before update on public.pedidos
  for each row execute function public.set_atualizado_em();

-- RLS: ligado, sem nenhuma policy => ninguém com a chave pública lê ou escreve.
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.pedido_eventos enable row level security;

revoke all on public.pedidos, public.pedido_itens, public.pedido_eventos from anon, authenticated;
grant select, insert, update, delete on public.pedidos, public.pedido_itens, public.pedido_eventos to service_role;
