-- Extensiones
create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- Perfiles (testigos + staff hospitalario + admin)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('testigo','hospital_staff','admin')),
  nombre text not null,
  ci text not null,
  telefono text not null,
  hospital_id uuid, -- FK agregado abajo (circular)
  activo boolean default true,
  created_at timestamptz default now()
);

-- Hospitales suscritos
create table hospitals (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  direccion text,
  ubicacion geography(point) not null, -- PostGIS
  telefono_despacho text,
  tier text default 'basic' check (tier in ('basic','premium')),
  activo boolean default true,
  created_at timestamptz default now()
);
alter table profiles add constraint profiles_hospital_fk
  foreign key (hospital_id) references hospitals(id);

create index idx_hospitals_ubicacion on hospitals using gist(ubicacion);

-- Flota del hospital
create table ambulances (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid references hospitals(id) on delete cascade,
  placa text unique,
  tipo text check (tipo in ('basica','avanzada','uti')),
  estado text default 'disponible'
    check (estado in ('disponible','en_servicio','mantenimiento')),
  activa boolean default true
);

-- Incidentes
create table incidents (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references profiles(id),
  ubicacion geography(point) not null,
  foto_url text,
  estado text not null default 'open'
    check (estado in ('open','searching','assigned','on_site','completed','cancelled')),
  prioridad text check (prioridad in ('P1','P2','P3')),
  ia_output jsonb,                      -- clasificación completa de Claude
  ia_suggested_type text,               -- UTI/avanzada/básica sugerida
  assigned_hospital_id uuid references hospitals(id),
  assigned_ambulance_id uuid references ambulances(id),
  dispatched_by uuid references profiles(id),
  assigned_at timestamptz,
  on_site_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_incidents_ubicacion on incidents using gist(ubicacion);
create index idx_incidents_estado on incidents(estado);
create index idx_incidents_hospital on incidents(assigned_hospital_id);

-- Audit log (quién hizo qué, cuándo)
create table audit_log (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);

-- --- FUNCIÓN CLAVE: buscar hospitales en radio ---
create or replace function find_hospitals_in_radius(
  p_lat double precision,
  p_lon double precision,
  p_radius_km int default 5
) returns table (id uuid, nombre text, distancia_km double precision)
language sql stable as $$
  select
    h.id, h.nombre,
    (st_distance(h.ubicacion, st_makepoint(p_lon, p_lat)::geography) / 1000)
  from hospitals h
  where h.activo = true
    and st_dwithin(h.ubicacion, st_makepoint(p_lon, p_lat)::geography, p_radius_km * 1000)
  order by 3 asc;
$$;
