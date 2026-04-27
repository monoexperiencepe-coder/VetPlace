-- Ejecutar en Supabase Dashboard → SQL Editor
-- Agrega campos extra al perfil del cliente

alter table clients
  add column if not exists email    text,
  add column if not exists address  text,
  add column if not exists notes    text,
  add column if not exists updated_at timestamptz default now();

-- Trigger updated_at automático
create or replace trigger set_clients_updated_at
  before update on clients
  for each row execute function update_updated_at_column();
