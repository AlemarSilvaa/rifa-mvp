-- ═══════════════════════════════════════════════════════════════
-- RIFA ONLINE — Schema Supabase
-- Execute no SQL Editor do Supabase em ordem
-- ═══════════════════════════════════════════════════════════════

-- ─── EXTENSÕES ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── RIFAS ────────────────────────────────────────────────────
create table rifas (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  titulo       text not null,
  descricao    text,
  foto_url     text,
  valor_numero numeric(10,2) not null,
  total_numeros integer not null default 100,
  data_sorteio timestamptz,
  status       text not null default 'ativa'
               check (status in ('rascunho','ativa','encerrada','sorteada')),
  pix_key      text,
  pix_tipo     text default 'chave' check (pix_tipo in ('chave','cpf','cnpj','telefone','aleatoria')),
  pix_nome     text,
  pix_cidade   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── CLIENTES ────────────────────────────────────────────────
create table clientes (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  cpf       text not null,
  whatsapp  text not null,
  email     text not null,
  created_at timestamptz default now(),
  unique (cpf)
);

-- ─── PEDIDOS ─────────────────────────────────────────────────
create table pedidos (
  id           uuid primary key default gen_random_uuid(),
  rifa_id      uuid not null references rifas(id),
  cliente_id   uuid not null references clientes(id),
  numeros      integer[] not null,
  quantidade   integer not null,
  valor_total  numeric(10,2) not null,
  status       text not null default 'pendente'
               check (status in ('pendente','pago','cancelado')),
  expires_at   timestamptz,
  pago_em      timestamptz,
  confirmado_por text,
  created_at   timestamptz default now()
);

-- ─── NÚMEROS ─────────────────────────────────────────────────
create table numeros (
  id           uuid primary key default gen_random_uuid(),
  rifa_id      uuid not null references rifas(id),
  numero       integer not null,
  status       text not null default 'available'
               check (status in ('available','reserved','paid')),
  reserved_by  uuid references clientes(id),
  pedido_id    uuid references pedidos(id),
  reserved_at  timestamptz,
  expires_at   timestamptz,
  paid_at      timestamptz,
  unique (rifa_id, numero)
);

-- ─── SORTEIOS ────────────────────────────────────────────────
create table sorteios (
  id               uuid primary key default gen_random_uuid(),
  rifa_id          uuid not null references rifas(id) unique,
  numero_sorteado  integer not null,
  cliente_id       uuid not null references clientes(id),
  pedido_id        uuid not null references pedidos(id),
  realizado_em     timestamptz default now(),
  realizado_por    text
);

-- ═══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════
create index idx_numeros_rifa_status on numeros(rifa_id, status);
create index idx_numeros_expires on numeros(expires_at) where status = 'reserved';
create index idx_pedidos_rifa on pedidos(rifa_id);
create index idx_pedidos_cliente on pedidos(cliente_id);
create index idx_pedidos_expires on pedidos(expires_at) where status = 'pendente';

-- ═══════════════════════════════════════════════════════════════
-- FUNÇÃO: RESERVAR NÚMEROS (protegida contra concorrência)
-- ═══════════════════════════════════════════════════════════════
create or replace function reservar_numeros(
  p_rifa_id    uuid,
  p_numeros    integer[],
  p_cliente_id uuid,
  p_pedido_id  uuid,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
as $$
declare
  v_disponivel integer;
  v_atualizado integer;
begin
  -- Trava as linhas e conta disponíveis (FOR UPDATE SKIP LOCKED evita deadlock)
  select count(*) into v_disponivel
  from numeros
  where rifa_id = p_rifa_id
    and numero = any(p_numeros)
    and status = 'available'
  for update skip locked;

  if v_disponivel < array_length(p_numeros, 1) then
    return jsonb_build_object(
      'ok', false,
      'erro', 'Um ou mais números não estão disponíveis'
    );
  end if;

  -- Reserva os números
  update numeros
  set
    status      = 'reserved',
    reserved_by = p_cliente_id,
    pedido_id   = p_pedido_id,
    reserved_at = now(),
    expires_at  = p_expires_at
  where rifa_id = p_rifa_id
    and numero  = any(p_numeros)
    and status  = 'available';

  get diagnostics v_atualizado = row_count;

  if v_atualizado <> array_length(p_numeros, 1) then
    -- Rollback parcial: desfaz a reserva
    update numeros
    set status = 'available', reserved_by = null,
        pedido_id = null, reserved_at = null, expires_at = null
    where rifa_id = p_rifa_id
      and pedido_id = p_pedido_id;

    return jsonb_build_object('ok', false, 'erro', 'Conflito de reserva, tente novamente');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- FUNÇÃO: LIBERAR RESERVAS EXPIRADAS
-- ═══════════════════════════════════════════════════════════════
create or replace function liberar_reservas_expiradas()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  -- Libera números expirados
  update numeros
  set
    status      = 'available',
    reserved_by = null,
    pedido_id   = null,
    reserved_at = null,
    expires_at  = null
  where status     = 'reserved'
    and expires_at < now();

  get diagnostics v_count = row_count;

  -- Cancela pedidos expirados
  update pedidos
  set status = 'cancelado'
  where status     = 'pendente'
    and expires_at < now();

  return v_count;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- FUNÇÃO: CONFIRMAR PAGAMENTO (marca números como paid)
-- ═══════════════════════════════════════════════════════════════
create or replace function confirmar_pagamento(
  p_pedido_id  uuid,
  p_admin_user text
) returns jsonb
language plpgsql
as $$
begin
  -- Atualiza pedido
  update pedidos
  set status = 'pago', pago_em = now(), confirmado_por = p_admin_user
  where id = p_pedido_id and status = 'pendente';

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Pedido não encontrado ou já processado');
  end if;

  -- Marca números como pagos
  update numeros
  set status = 'paid', paid_at = now(), expires_at = null
  where pedido_id = p_pedido_id and status = 'reserved';

  return jsonb_build_object('ok', true);
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- FUNÇÃO: REALIZAR SORTEIO
-- ═══════════════════════════════════════════════════════════════
create or replace function realizar_sorteio(
  p_rifa_id    uuid,
  p_admin_user text
) returns jsonb
language plpgsql
as $$
declare
  v_numero    integer;
  v_cliente   record;
  v_pedido_id uuid;
  v_sorteio   uuid;
begin
  -- Pega apenas números pagos
  select n.numero, p.cliente_id, p.id
  into v_numero, v_cliente, v_pedido_id
  from numeros n
  join pedidos p on p.id = n.pedido_id
  where n.rifa_id = p_rifa_id and n.status = 'paid'
  order by random()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Nenhum número pago encontrado');
  end if;

  -- Salva o sorteio
  insert into sorteios (rifa_id, numero_sorteado, cliente_id, pedido_id, realizado_por)
  values (p_rifa_id, v_numero, v_cliente.cliente_id, v_pedido_id, p_admin_user)
  returning id into v_sorteio;

  -- Encerra a rifa
  update rifas set status = 'sorteada' where id = p_rifa_id;

  -- Busca nome do vencedor
  select * into v_cliente from clientes where id = v_cliente.cliente_id;

  return jsonb_build_object(
    'ok', true,
    'sorteio_id', v_sorteio,
    'numero', v_numero,
    'vencedor', v_cliente.nome,
    'whatsapp', v_cliente.whatsapp
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
alter table rifas enable row level security;
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table numeros enable row level security;
alter table sorteios enable row level security;

-- Leitura pública (rifas e números)
create policy "rifas_public_read" on rifas for select using (true);
create policy "numeros_public_read" on numeros for select using (true);
create policy "sorteios_public_read" on sorteios for select using (true);

-- Escrita requer service_role (via API routes)
create policy "rifas_service_write" on rifas for all using (auth.role() = 'service_role');
create policy "clientes_service_all" on clientes for all using (auth.role() = 'service_role');
create policy "pedidos_service_all" on pedidos for all using (auth.role() = 'service_role');
create policy "numeros_service_write" on numeros for all using (auth.role() = 'service_role');
create policy "sorteios_service_write" on sorteios for all using (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: updated_at nas rifas
-- ═══════════════════════════════════════════════════════════════
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger rifas_updated_at before update on rifas
  for each row execute function set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- REALTIME (necessário para confirmação automática no checkout)
-- ═══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table pedidos;

-- ═══════════════════════════════════════════════════════════════
-- DADOS INICIAIS DE EXEMPLO (opcional)
-- ═══════════════════════════════════════════════════════════════
-- insert into rifas (slug, titulo, descricao, valor_numero, total_numeros, data_sorteio, status, pix_key, pix_nome, pix_cidade)
-- values ('honda-cg-160', 'Honda CG 160 2024', 'Concorra a uma moto 0km emplacada.', 25.00, 500, now() + interval '30 days', 'ativa', 'seu@pix.com', 'Rifa Beneficente', 'Joinville');
