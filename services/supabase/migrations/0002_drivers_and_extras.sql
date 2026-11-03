-- Ejecutar en SQL Editor después de 20261101000438_init_schema.sql.
-- Este archivo es para revisión manual; no ejecutar db push.

create table drivers (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  nombre text not null,
  ci text not null,
  licencia_numero text,
  licencia_categoria text,
  licencia_vence date,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hospital_id, ci)
);
create index idx_drivers_hospital on drivers(hospital_id);
alter table ambulances add column driver_id uuid references drivers(id);
alter table hospitals
  add column logo_url text,
  add column notas_internas text,
  add column horario_atencion jsonb;
alter table incidents
  add column tipo_accidente text,
  add column cantidad_heridos int check (cantidad_heridos >= 0),
  add column false_alarm_reason text,
  add column marked_false_by uuid references profiles(id),
  add column marked_false_at timestamptz,
  add column reportante_data jsonb;

create table fcm_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  platform text check (platform in ('android','ios','web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fcm_tokens_user on fcm_tokens(user_id);

create table admin_inbox (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid not null references incidents(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);
create index idx_admin_inbox_created on admin_inbox(created_at desc);

-- Ofertas visibles para hospitales cercanos antes de que exista una asignación.
create table incident_offers (
  incident_id uuid not null references incidents(id) on delete cascade,
  hospital_id uuid not null references hospitals(id) on delete cascade,
  radius_km int not null,
  distance_km double precision not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  primary key (incident_id, hospital_id)
);
create index idx_incident_offers_hospital on incident_offers(hospital_id);

-- Evitar que las políticas dependan de una lectura de profiles bloqueada por su propia RLS.
create or replace function current_profile_role() returns text
language sql stable security definer set search_path = public
as $$ select rol from profiles where id = auth.uid() and activo = true $$;
create or replace function current_hospital_id() returns uuid
language sql stable security definer set search_path = public
as $$ select hospital_id from profiles where id = auth.uid() and activo = true $$;
revoke all on function current_profile_role() from public;
revoke all on function current_hospital_id() from public;
grant execute on function current_profile_role() to authenticated;
grant execute on function current_hospital_id() to authenticated;

alter table drivers enable row level security;
alter table fcm_tokens enable row level security;
alter table admin_inbox enable row level security;
alter table incident_offers enable row level security;
alter table audit_log enable row level security;
create policy "staff ve choferes de su hospital" on drivers
  for select to authenticated using (hospital_id = current_hospital_id() or current_profile_role() = 'admin');
create policy "admin gestiona choferes" on drivers
  for all to authenticated using (current_profile_role() = 'admin')
  with check (current_profile_role() = 'admin');
create policy "usuario gestiona sus tokens" on fcm_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin ve inbox" on admin_inbox
  for select to authenticated using (current_profile_role() = 'admin');
create policy "hospital ve sus ofertas" on incident_offers
  for select to authenticated using (
    (hospital_id = current_hospital_id() and closed_at is null)
    or current_profile_role() = 'admin'
  );
create policy "usuario ve su perfil" on profiles
  for select to authenticated using (id = auth.uid());
create policy "admin gestiona perfiles" on profiles
  for all to authenticated using (current_profile_role() = 'admin')
  with check (current_profile_role() = 'admin');
create policy "hospital ve su ficha" on hospitals
  for select to authenticated using (id = current_hospital_id() or current_profile_role() = 'admin');
create policy "admin gestiona hospitales" on hospitals
  for all to authenticated using (current_profile_role() = 'admin')
  with check (current_profile_role() = 'admin');
create policy "staff ve flota propia" on ambulances
  for select to authenticated using (hospital_id = current_hospital_id() or current_profile_role() = 'admin');
create policy "admin gestiona flota" on ambulances
  for all to authenticated using (current_profile_role() = 'admin')
  with check (current_profile_role() = 'admin');
create policy "admin ve auditoria" on audit_log
  for select to authenticated using (current_profile_role() = 'admin');
create policy "staff ve incidentes ofrecidos" on incidents
  for select to authenticated using (
    estado = 'searching' and exists (
      select 1 from incident_offers o
      where o.incident_id = incidents.id and o.hospital_id = current_hospital_id()
    )
  );

-- Estado, ofertas y auditoría se crean juntos o se revierten juntos.
create or replace function dispatch_incident_atomic(p_incident_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_incident incidents%rowtype;
  v_role text;
  v_radius int;
  v_hospitals jsonb := '[]'::jsonb;
  v_lat double precision;
  v_lon double precision;
begin
  select rol into v_role from profiles where id = p_actor_id and activo = true;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if not (v_role = 'admin' or (v_role = 'testigo' and v_incident.reporter_id = p_actor_id)) then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if v_incident.estado <> 'open' then return jsonb_build_object('error', 'already_dispatched'); end if;
  v_lat := st_y(v_incident.ubicacion::geometry);
  v_lon := st_x(v_incident.ubicacion::geometry);
  foreach v_radius in array array[5,10,15,20] loop
    select coalesce(jsonb_agg(to_jsonb(h) order by h.distancia_km), '[]'::jsonb)
      into v_hospitals
      from find_hospitals_in_radius(v_lat, v_lon, v_radius) h;
    exit when jsonb_array_length(v_hospitals) > 0;
  end loop;
  update incidents set estado = 'searching' where id = p_incident_id;
  insert into incident_offers(incident_id, hospital_id, radius_km, distance_km)
    select p_incident_id, h.id, v_radius, h.distancia_km
    from jsonb_to_recordset(v_hospitals) as h(id uuid, nombre text, distancia_km double precision);
  insert into audit_log(actor_id, action, entity, entity_id, payload)
    values (p_actor_id, 'incident_dispatched', 'incident', p_incident_id,
      jsonb_build_object('radius_km', v_radius, 'hospital_count', jsonb_array_length(v_hospitals)));
  return jsonb_build_object('incident_id', p_incident_id, 'status', 'searching',
    'radius_km', v_radius, 'hospitals', v_hospitals);
end $$;
revoke all on function dispatch_incident_atomic(uuid,uuid) from public;
grant execute on function dispatch_incident_atomic(uuid,uuid) to service_role;

-- Una sola transacción para reservar incidente y unidad.
create or replace function accept_incident_atomic(
  p_incident_id uuid, p_ambulance_id uuid, p_actor_id uuid
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_hospital uuid;
  v_incident incidents%rowtype;
  v_ambulance ambulances%rowtype;
begin
  select hospital_id into v_hospital from profiles
    where id = p_actor_id and rol = 'hospital_staff' and activo = true;
  if v_hospital is null then return 'forbidden'; end if;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return 'not_found'; end if;
  if v_incident.estado <> 'searching' then return 'already_taken'; end if;
  if not exists (select 1 from incident_offers where incident_id = p_incident_id and hospital_id = v_hospital) then
    return 'not_offered';
  end if;
  select * into v_ambulance from ambulances where id = p_ambulance_id for update;
  if not found or v_ambulance.hospital_id is distinct from v_hospital
    or v_ambulance.estado is distinct from 'disponible' or v_ambulance.activa is not true then
    return 'ambulance_unavailable';
  end if;
  if v_ambulance.driver_id is null or not exists (
    select 1 from drivers d where d.id = v_ambulance.driver_id and d.hospital_id = v_hospital
      and d.activo = true and (d.licencia_vence is null or d.licencia_vence >= current_date)
  ) then return 'driver_unavailable'; end if;
  update ambulances set estado = 'en_servicio' where id = p_ambulance_id;
  update incidents set estado = 'assigned', assigned_hospital_id = v_hospital,
    assigned_ambulance_id = p_ambulance_id, dispatched_by = p_actor_id, assigned_at = now()
    where id = p_incident_id;
  update incident_offers set closed_at = now() where incident_id = p_incident_id;
  insert into audit_log(actor_id, action, entity, entity_id, payload)
    values (p_actor_id, 'incident_assigned', 'incident', p_incident_id,
      jsonb_build_object('hospital_id', v_hospital, 'ambulance_id', p_ambulance_id));
  return 'accepted';
end $$;
revoke all on function accept_incident_atomic(uuid,uuid,uuid) from public;
grant execute on function accept_incident_atomic(uuid,uuid,uuid) to service_role;

create or replace function update_incident_status_atomic(
  p_incident_id uuid, p_new_status text, p_actor_id uuid
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_incident incidents%rowtype;
  v_role text;
  v_hospital uuid;
begin
  select rol, hospital_id into v_role, v_hospital from profiles
    where id = p_actor_id and activo = true;
  if v_role is null then return 'forbidden'; end if;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return 'not_found'; end if;
  if not (v_role = 'admin' or (v_role = 'hospital_staff' and v_hospital = v_incident.assigned_hospital_id)) then
    return 'forbidden';
  end if;
  if not ((v_incident.estado = 'assigned' and p_new_status = 'on_site' and v_role = 'hospital_staff')
    or (v_incident.estado = 'on_site' and p_new_status = 'completed' and v_role = 'hospital_staff')
    or (p_new_status = 'cancelled' and v_incident.estado in ('open','searching','assigned','on_site')
      and (v_role = 'admin' or v_incident.assigned_hospital_id = v_hospital))) then
    return 'invalid_transition';
  end if;
  update incidents set estado = p_new_status,
    on_site_at = case when p_new_status = 'on_site' then now() else on_site_at end,
    completed_at = case when p_new_status = 'completed' then now() else completed_at end
    where id = p_incident_id;
  if p_new_status = 'cancelled' then
    update incident_offers set closed_at = now() where incident_id = p_incident_id;
  end if;
  if p_new_status in ('completed','cancelled') and v_incident.assigned_ambulance_id is not null then
    update ambulances set estado = 'disponible' where id = v_incident.assigned_ambulance_id;
  end if;
  insert into audit_log(actor_id, action, entity, entity_id, payload)
    values (p_actor_id, 'incident_status_updated', 'incident', p_incident_id,
      jsonb_build_object('from', v_incident.estado, 'to', p_new_status));
  return 'updated';
end $$;
revoke all on function update_incident_status_atomic(uuid,text,uuid) from public;
grant execute on function update_incident_status_atomic(uuid,text,uuid) to service_role;

create or replace function report_false_alarm_atomic(
  p_incident_id uuid, p_reason text, p_actor_id uuid
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_hospital uuid;
  v_incident incidents%rowtype;
begin
  select hospital_id into v_hospital from profiles where id = p_actor_id
    and rol = 'hospital_staff' and activo = true;
  if v_hospital is null then return 'forbidden'; end if;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return 'not_found'; end if;
  if v_incident.assigned_hospital_id is distinct from v_hospital then return 'forbidden'; end if;
  if v_incident.estado not in ('assigned','on_site') then return 'invalid_transition'; end if;
  update incidents set estado = 'cancelled', false_alarm_reason = p_reason,
    marked_false_by = p_actor_id, marked_false_at = now() where id = p_incident_id;
  update incident_offers set closed_at = now() where incident_id = p_incident_id;
  if v_incident.assigned_ambulance_id is not null then
    update ambulances set estado = 'disponible' where id = v_incident.assigned_ambulance_id;
  end if;
  insert into audit_log(actor_id, action, entity, entity_id, payload)
    values (p_actor_id, 'false_alarm_reported', 'incident', p_incident_id,
      jsonb_build_object('reason', p_reason));
  insert into admin_inbox(incident_id, event_type, payload)
    values (p_incident_id, 'false_alarm_reported',
      jsonb_build_object('reason', p_reason, 'actor_id', p_actor_id));
  return 'reported';
end $$;
revoke all on function report_false_alarm_atomic(uuid,text,uuid) from public;
grant execute on function report_false_alarm_atomic(uuid,text,uuid) to service_role;
