-- ============================================================
-- VetPlace – Multi-tenant schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. TABLA CLINICS ─────────────────────────────────────────
create table if not exists clinics (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  address     text,
  email       text,
  schedule    text,
  timezone    text default 'America/Argentina/Buenos_Aires',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS clinics
alter table clinics enable row level security;

create policy "Owner puede ver su clínica" on clinics
  for select using (owner_id = auth.uid());

create policy "Owner puede actualizar su clínica" on clinics
  for update using (owner_id = auth.uid());

create policy "Owner puede crear su clínica" on clinics
  for insert with check (owner_id = auth.uid());

-- 2. TABLA CONVERSATIONS (chats por cliente) ───────────────
create table if not exists conversations (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references clinics(id) on delete cascade,
  client_id        uuid references clients(id) on delete set null,
  phone            text not null,
  client_name      text,
  bot_active       boolean default true,
  unread_count     int default 0,
  last_message     text,
  last_message_at  timestamptz,
  created_at       timestamptz default now(),
  unique(clinic_id, phone)
);

-- RLS conversations
alter table conversations enable row level security;

create policy "Clinic ve sus conversations" on conversations
  for all using (
    clinic_id in (select id from clinics where owner_id = auth.uid())
  );

-- 3. TABLA MESSAGES ────────────────────────────────────────
create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  from_type        text not null check (from_type in ('client', 'bot', 'staff')),
  body             text not null,
  created_at       timestamptz default now()
);

-- RLS messages
alter table messages enable row level security;

create policy "Clinic ve sus messages" on messages
  for all using (
    conversation_id in (
      select c.id from conversations c
      join clinics cl on cl.id = c.clinic_id
      where cl.owner_id = auth.uid()
    )
  );

-- 4. RLS EN TABLAS EXISTENTES ─────────────────────────────
-- Asegura que cada clínica solo vea sus propios datos
-- (Solo aplica si usás Supabase directamente desde el front.
--  Si todo pasa por el backend con service_role, no es necesario.)

-- clients
alter table clients enable row level security;
create policy "Clinic ve sus clients" on clients
  for all using (
    clinic_id in (select id from clinics where owner_id = auth.uid())
  );

-- pets
alter table pets enable row level security;
create policy "Clinic ve sus pets" on pets
  for all using (
    clinic_id in (select id from clinics where owner_id = auth.uid())
  );

-- bookings
alter table bookings enable row level security;
create policy "Clinic ve sus bookings" on bookings
  for all using (
    clinic_id in (select id from clinics where owner_id = auth.uid())
  );

-- events
alter table events enable row level security;
create policy "Clinic ve sus events" on events
  for all using (
    clinic_id in (select id from clinics where owner_id = auth.uid())
  );

-- 5. FUNCIÓN: updated_at automático ──────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_clinics_updated_at
  before update on clinics
  for each row execute function update_updated_at_column();

-- 6. ÍNDICES ──────────────────────────────────────────────
create index if not exists idx_conversations_clinic_id on conversations(clinic_id);
create index if not exists idx_conversations_phone on conversations(phone);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_created_at on messages(created_at);
