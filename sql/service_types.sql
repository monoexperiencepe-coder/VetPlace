-- Catálogo de servicios por clínica
create table if not exists service_types (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete cascade,
  name       text not null,
  price      numeric(10,2),
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_service_types_clinic on service_types(clinic_id);
alter table service_types enable row level security;

-- Precio en bookings (nullable — no todos los bookings tienen precio asignado)
alter table bookings add column if not exists price            numeric(10,2);
alter table bookings add column if not exists service_type_id uuid references service_types(id) on delete set null;

-- Precio default por mascota (precio habitual de su servicio)
alter table pets add column if not exists default_price numeric(10,2);
