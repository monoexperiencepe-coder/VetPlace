-- Tabla de pagos / caja de ingresos
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  booking_id  uuid references bookings(id) on delete set null,
  client_id   uuid references clients(id) on delete set null,
  pet_id      uuid references pets(id)  on delete set null,
  amount      numeric(10,2) not null check (amount > 0),
  method      text not null default 'cash'
              check (method in ('cash','transfer','card','yape','other')),
  description text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists idx_payments_clinic_id on payments(clinic_id);
create index if not exists idx_payments_date      on payments(date desc);
create index if not exists idx_payments_booking   on payments(booking_id);

alter table payments enable row level security;
