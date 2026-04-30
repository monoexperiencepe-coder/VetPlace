-- ============================================================
-- Historia Clínica — VetPlace
-- Supabase: SQL Editor → New Query → pegar esto y ejecutar
-- ============================================================

create table if not exists medical_records (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  pet_id      uuid not null references pets(id)    on delete cascade,

  date        date not null default current_date,
  type        text not null default 'consultation'
                check (type in ('consultation','vaccine','deworming','surgery','grooming','other')),

  -- Contenido clínico
  diagnosis   text,
  treatment   text,
  notes       text,

  -- Metadatos del registro
  vet         text,         -- nombre del veterinario / profesional
  weight      numeric(5,2), -- peso en kg al momento de la consulta

  created_at  timestamptz not null default now()
);

-- Índices
create index if not exists idx_medical_records_pet_id    on medical_records(pet_id);
create index if not exists idx_medical_records_clinic_id on medical_records(clinic_id);
create index if not exists idx_medical_records_date      on medical_records(date desc);

-- RLS (la API usa service_role que lo bypasea, pero lo habilitamos igual)
alter table medical_records enable row level security;
