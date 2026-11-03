-- Revisar y ejecutar manualmente DESPUES de 0002_drivers_and_extras.sql.
-- No ejecutar db push. Esta migracion extiende 0002 sin recrear sus tablas.

alter table ambulances add column codigo text;
alter table drivers add column licencia_documento_url text;
update ambulances set codigo = coalesce(nullif(upper(placa), ''), left(id::text, 8))
  where codigo is null;
create unique index idx_ambulances_hospital_codigo
  on ambulances(hospital_id, lower(codigo)) where codigo is not null;

create table ambulance_types (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  nombre text not null,
  base_tipo text not null check (base_tipo in ('basica','avanzada','uti')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hospital_id, nombre)
);
create index idx_ambulance_types_hospital on ambulance_types(hospital_id);
insert into ambulance_types(hospital_id, nombre, base_tipo)
select h.id, t.nombre, t.base_tipo
from hospitals h cross join (values
  ('Basica','basica'), ('Avanzada','avanzada'), ('UTI','uti')
) t(nombre, base_tipo)
on conflict (hospital_id, nombre) do nothing;
alter table ambulances add column type_id uuid references ambulance_types(id);
update ambulances a set type_id = t.id from ambulance_types t
where t.hospital_id = a.hospital_id and t.base_tipo = a.tipo and t.nombre =
  case a.tipo when 'uti' then 'UTI' when 'avanzada' then 'Avanzada' else 'Basica' end;

create or replace function seed_hospital_ambulance_types() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into ambulance_types(hospital_id, nombre, base_tipo)
  values (new.id,'Basica','basica'), (new.id,'Avanzada','avanzada'), (new.id,'UTI','uti')
  on conflict (hospital_id,nombre) do nothing;
  return new;
end $$;
create trigger seed_ambulance_types_after_hospital
after insert on hospitals for each row execute function seed_hospital_ambulance_types();

create or replace function validate_ambulance_refs() returns trigger
language plpgsql set search_path = public as $$
declare v_base text; v_type_active boolean;
begin
  if new.type_id is not null then
    select base_tipo, activo into v_base, v_type_active from ambulance_types
    where id = new.type_id and hospital_id = new.hospital_id;
    if v_base is null then raise exception 'invalid ambulance type for hospital'; end if;
    if tg_op = 'INSERT' and not v_type_active then
      raise exception 'inactive ambulance type';
    end if;
    if tg_op = 'UPDATE' and new.type_id is distinct from old.type_id and not v_type_active then
      raise exception 'inactive ambulance type';
    end if;
    new.tipo := v_base;
  end if;
  if new.driver_id is not null then
    if not exists (select 1 from drivers where id = new.driver_id and hospital_id = new.hospital_id) then
      raise exception 'invalid driver for hospital';
    end if;
    if tg_op = 'INSERT' and not exists (
      select 1 from drivers where id = new.driver_id and activo = true
    ) then raise exception 'inactive ambulance driver'; end if;
    if tg_op = 'UPDATE' and new.driver_id is distinct from old.driver_id and not exists (
      select 1 from drivers where id = new.driver_id and activo = true
    ) then raise exception 'inactive ambulance driver'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger validate_ambulance_before_write before insert or update on ambulances
for each row execute function validate_ambulance_refs();
create or replace function protect_ambulance_type() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.hospital_id is distinct from old.hospital_id or
    new.base_tipo is distinct from old.base_tipo then
    raise exception 'hospital and base category are immutable';
  end if;
  if old.activo = true and new.activo = false and exists (
    select 1 from ambulances where type_id = old.id and activa = true
  ) then raise exception 'type is used by active ambulances'; end if;
  return new;
end $$;
create trigger protect_ambulance_type_before_update before update on ambulance_types
for each row execute function protect_ambulance_type();

alter table incidents
  add column assigned_driver_id uuid references drivers(id),
  add column cantidad_heridos_confirmada int check (cantidad_heridos_confirmada >= 0),
  add column referencia text;
update incidents i set assigned_driver_id = a.driver_id
from ambulances a where i.assigned_ambulance_id = a.id and i.assigned_driver_id is null;
create index idx_incidents_driver_active on incidents(assigned_driver_id)
  where estado in ('assigned','on_site');

alter table incident_offers
  add column rejected_at timestamptz,
  add column rejected_by uuid references profiles(id),
  add column rejection_reason text;
create index idx_offers_open on incident_offers(hospital_id,created_at)
  where closed_at is null;

create table staff_shifts (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  staff_id uuid not null references profiles(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  registered_by uuid references profiles(id),
  check (ended_at is null or ended_at >= started_at)
);
create unique index idx_one_open_shift_per_staff on staff_shifts(staff_id)
  where ended_at is null;
create index idx_shifts_hospital_open on staff_shifts(hospital_id) where ended_at is null;

create table false_alarm_reports (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid not null references incidents(id) on delete cascade,
  hospital_id uuid not null references hospitals(id),
  actor_id uuid not null references profiles(id),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id),
  decision_note text,
  unique (incident_id,hospital_id)
);
create index idx_false_alarm_reports_status on false_alarm_reports(status,created_at desc);
insert into false_alarm_reports(incident_id,hospital_id,actor_id,reason,created_at)
select i.id,i.assigned_hospital_id,i.marked_false_by,
  coalesce(nullif(i.false_alarm_reason,''),'Reporte anterior a 0003'),
  coalesce(i.marked_false_at,now())
from incidents i
where i.marked_false_by is not null and i.assigned_hospital_id is not null
on conflict (incident_id,hospital_id) do nothing;
update admin_inbox ai set payload = ai.payload || jsonb_build_object('report_id',fr.id)
from false_alarm_reports fr
where ai.incident_id = fr.incident_id and ai.event_type = 'false_alarm_reported'
  and ai.payload->>'report_id' is null;

alter table ambulance_types enable row level security;
alter table staff_shifts enable row level security;
alter table false_alarm_reports enable row level security;
-- 0001/0002 definieron algunas policies sin activar RLS en estas tablas.
alter table profiles enable row level security;
alter table hospitals enable row level security;
alter table ambulances enable row level security;
alter table incidents enable row level security;
create policy "hospital ve tipos propios" on ambulance_types for select to authenticated
  using (hospital_id = current_hospital_id() or current_profile_role() = 'admin');
create policy "hospital ve turnos propios" on staff_shifts for select to authenticated
  using (hospital_id = current_hospital_id() or current_profile_role() = 'admin');
create policy "hospital ve reportes propios" on false_alarm_reports for select to authenticated
  using (hospital_id = current_hospital_id() or current_profile_role() = 'admin');
create policy "testigo ve sus incidentes" on incidents for select to authenticated
  using (reporter_id = auth.uid());
create policy "hospital ve casos asignados" on incidents for select to authenticated
  using (assigned_hospital_id = current_hospital_id());
create policy "admin ve incidentes" on incidents for select to authenticated
  using (current_profile_role() = 'admin');
drop policy if exists "staff ve incidentes ofrecidos" on incidents;
create policy "staff ve incidentes ofrecidos" on incidents
  for select to authenticated using (
    estado = 'searching' and exists (
      select 1 from incident_offers o where o.incident_id = incidents.id
        and o.hospital_id = current_hospital_id() and o.closed_at is null
    )
  );
drop policy if exists "testigos crean reportes" on incidents;
create policy "testigos activos crean reportes" on incidents
  for insert to authenticated with check (
    reporter_id = auth.uid() and current_profile_role() = 'testigo'
    and estado = 'open'
    and foto_url like auth.uid()::text || '/%'
    and prioridad is null and ia_output is null and ia_suggested_type is null
    and tipo_accidente is null and cantidad_heridos is null
    and cantidad_heridos_confirmada is null and referencia is null
    and assigned_hospital_id is null and assigned_ambulance_id is null
    and assigned_driver_id is null and dispatched_by is null
    and assigned_at is null and on_site_at is null and completed_at is null
    and false_alarm_reason is null and marked_false_by is null
    and marked_false_at is null and reportante_data is null
  );

-- La búsqueda de hospitales pasa por la función de despacho autenticada.
revoke all on function find_hospitals_in_radius(double precision,double precision,integer) from public;
grant execute on function find_hospitals_in_radius(double precision,double precision,integer) to service_role;

-- Un rechazo cierra solo la oferta de ese hospital. Si no quedan ofertas,
-- se busca a otros hospitales hasta 20 km sin repetir los ya contactados.
create or replace function reject_offer_atomic(
  p_incident_id uuid, p_actor_id uuid, p_reason text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_hospital uuid;
  v_incident incidents%rowtype;
  v_offer incident_offers%rowtype;
  v_new jsonb := '[]'::jsonb;
  v_lat double precision;
  v_lon double precision;
begin
  select hospital_id into v_hospital from profiles
    where id = p_actor_id and rol = 'hospital_staff' and activo = true;
  if v_hospital is null then return jsonb_build_object('error','forbidden'); end if;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_incident.estado <> 'searching' then return jsonb_build_object('error','not_searching'); end if;
  select * into v_offer from incident_offers
    where incident_id = p_incident_id and hospital_id = v_hospital for update;
  if not found or v_offer.closed_at is not null then
    return jsonb_build_object('error','offer_unavailable');
  end if;
  update incident_offers set closed_at = now(), rejected_at = now(),
    rejected_by = p_actor_id, rejection_reason = p_reason
    where incident_id = p_incident_id and hospital_id = v_hospital;
  if not exists (
    select 1 from incident_offers where incident_id = p_incident_id and closed_at is null
  ) then
    v_lat := st_y(v_incident.ubicacion::geometry);
    v_lon := st_x(v_incident.ubicacion::geometry);
    with inserted as (
      insert into incident_offers(incident_id,hospital_id,radius_km,distance_km)
      select p_incident_id,h.id,20,h.distancia_km
      from find_hospitals_in_radius(v_lat,v_lon,20) h
      where not exists (
        select 1 from incident_offers old
        where old.incident_id = p_incident_id and old.hospital_id = h.id
      )
      returning hospital_id
    )
    select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'nombre',h.nombre)), '[]'::jsonb)
      into v_new from inserted n join hospitals h on h.id = n.hospital_id;
  end if;
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'offer_rejected','incident',p_incident_id,
      jsonb_build_object('hospital_id',v_hospital,'reason',p_reason));
  return jsonb_build_object('incident_id',p_incident_id,'status','rejected',
    'new_hospitals',v_new);
end $$;
revoke all on function reject_offer_atomic(uuid,uuid,text) from public;
grant execute on function reject_offer_atomic(uuid,uuid,text) to service_role;

-- Reemplaza la funcion 0002: marcar es una sospecha, no una condena.
-- Desde una oferta abierta se cierra solo esa oferta; desde un caso asignado
-- se cancela el despacho y libera la unidad. En ambos casos se abre revision admin.
drop function if exists report_false_alarm_atomic(uuid,text,uuid);
create or replace function report_false_alarm_atomic(
  p_incident_id uuid, p_reason text, p_actor_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_hospital uuid;
  v_incident incidents%rowtype;
  v_report_id uuid;
  v_offer_result jsonb := '{}'::jsonb;
begin
  select hospital_id into v_hospital from profiles
    where id = p_actor_id and rol = 'hospital_staff' and activo = true;
  if v_hospital is null then return jsonb_build_object('error','forbidden'); end if;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if exists (select 1 from false_alarm_reports where incident_id = p_incident_id and hospital_id = v_hospital) then
    return jsonb_build_object('error','already_reported');
  end if;
  if v_incident.estado = 'searching' then
    v_offer_result := reject_offer_atomic(p_incident_id,p_actor_id,'suspected_false_alarm');
    if v_offer_result ? 'error' then return v_offer_result; end if;
  elsif v_incident.estado in ('assigned','on_site')
      and v_incident.assigned_hospital_id = v_hospital then
    update incidents set estado = 'cancelled' where id = p_incident_id;
    update incident_offers set closed_at = now() where incident_id = p_incident_id;
    if v_incident.assigned_ambulance_id is not null then
      update ambulances set estado = 'disponible' where id = v_incident.assigned_ambulance_id;
    end if;
  else
    return jsonb_build_object('error','invalid_transition');
  end if;
  insert into false_alarm_reports(incident_id,hospital_id,actor_id,reason)
    values (p_incident_id,v_hospital,p_actor_id,p_reason) returning id into v_report_id;
  insert into admin_inbox(incident_id,event_type,payload)
    values (p_incident_id,'false_alarm_reported',
      jsonb_build_object('report_id',v_report_id,'hospital_id',v_hospital,'reason',p_reason));
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'false_alarm_reported','incident',p_incident_id,
      jsonb_build_object('report_id',v_report_id,'hospital_id',v_hospital));
  return jsonb_build_object('incident_id',p_incident_id,'report_id',v_report_id,
    'review','pending','incident_status',
    case when v_incident.estado = 'searching' then 'searching' else 'cancelled' end,
    'new_hospitals',coalesce(v_offer_result->'new_hospitals','[]'::jsonb));
end $$;
revoke all on function report_false_alarm_atomic(uuid,text,uuid) from public;
grant execute on function report_false_alarm_atomic(uuid,text,uuid) to service_role;

create or replace function review_false_alarm_atomic(
  p_report_id uuid, p_actor_id uuid, p_decision text, p_note text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_report false_alarm_reports%rowtype;
begin
  if not exists (select 1 from profiles where id = p_actor_id and rol = 'admin' and activo = true) then
    return jsonb_build_object('error','forbidden');
  end if;
  if p_decision not in ('confirmed','dismissed') then
    return jsonb_build_object('error','invalid_decision');
  end if;
  select * into v_report from false_alarm_reports where id = p_report_id for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_report.status <> 'pending' then return jsonb_build_object('error','already_reviewed'); end if;
  update false_alarm_reports set status = p_decision, reviewed_at = now(),
    reviewed_by = p_actor_id, decision_note = p_note where id = p_report_id;
  update admin_inbox set reviewed_at = now(), reviewed_by = p_actor_id,
    payload = payload || jsonb_build_object('decision',p_decision)
    where payload->>'report_id' = p_report_id::text;
  if p_decision = 'confirmed' then
    update incidents set false_alarm_reason = v_report.reason,
      marked_false_by = v_report.actor_id, marked_false_at = now()
      where id = v_report.incident_id;
  end if;
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'false_alarm_reviewed','incident',v_report.incident_id,
      jsonb_build_object('report_id',p_report_id,'decision',p_decision));
  return jsonb_build_object('report_id',p_report_id,'incident_id',v_report.incident_id,
    'status',p_decision);
end $$;
revoke all on function review_false_alarm_atomic(uuid,uuid,text,text) from public;
grant execute on function review_false_alarm_atomic(uuid,uuid,text,text) to service_role;

-- La reserva simultanea de incidente, unidad y chofer conserva el chofer
-- en incidents aunque luego cambie el conductor titular de la ambulancia.
drop function if exists accept_incident_atomic(uuid,uuid,uuid);
create or replace function accept_incident_atomic(
  p_incident_id uuid, p_ambulance_id uuid, p_driver_id uuid, p_actor_id uuid
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_hospital uuid;
  v_incident incidents%rowtype;
  v_ambulance ambulances%rowtype;
  v_driver drivers%rowtype;
begin
  select hospital_id into v_hospital from profiles
    where id = p_actor_id and rol = 'hospital_staff' and activo = true;
  if v_hospital is null then return 'forbidden'; end if;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return 'not_found'; end if;
  if v_incident.estado <> 'searching' then return 'already_taken'; end if;
  if not exists (select 1 from incident_offers where incident_id = p_incident_id
    and hospital_id = v_hospital and closed_at is null) then return 'not_offered'; end if;
  select * into v_ambulance from ambulances where id = p_ambulance_id for update;
  if not found or v_ambulance.hospital_id is distinct from v_hospital or
    v_ambulance.estado is distinct from 'disponible' or v_ambulance.activa is not true then
    return 'ambulance_unavailable';
  end if;
  select * into v_driver from drivers where id = p_driver_id for update;
  if not found or v_driver.hospital_id is distinct from v_hospital or v_driver.activo is not true
    or (v_driver.licencia_vence is not null and v_driver.licencia_vence < current_date) then
    return 'driver_unavailable';
  end if;
  if exists (select 1 from incidents where assigned_driver_id = p_driver_id
    and estado in ('assigned','on_site')) then return 'driver_busy'; end if;
  update ambulances set estado = 'en_servicio', driver_id = p_driver_id where id = p_ambulance_id;
  update incidents set estado = 'assigned', assigned_hospital_id = v_hospital,
    assigned_ambulance_id = p_ambulance_id, assigned_driver_id = p_driver_id,
    dispatched_by = p_actor_id, assigned_at = now() where id = p_incident_id;
  update incident_offers set closed_at = now() where incident_id = p_incident_id;
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'incident_assigned','incident',p_incident_id,
      jsonb_build_object('hospital_id',v_hospital,'ambulance_id',p_ambulance_id,
        'driver_id',p_driver_id));
  return 'accepted';
end $$;
revoke all on function accept_incident_atomic(uuid,uuid,uuid,uuid) from public;
grant execute on function accept_incident_atomic(uuid,uuid,uuid,uuid) to service_role;

create or replace function set_staff_shift_atomic(
  p_actor_id uuid, p_staff_id uuid, p_on_duty boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare v_actor profiles%rowtype; v_staff profiles%rowtype;
begin
  select * into v_actor from profiles where id = p_actor_id and activo = true;
  select * into v_staff from profiles where id = p_staff_id and rol = 'hospital_staff'
    and activo = true;
  if v_actor.id is null or v_staff.id is null or not (
    v_actor.rol = 'admin' or
    (v_actor.rol = 'hospital_staff' and v_actor.hospital_id = v_staff.hospital_id)
  ) then return 'forbidden'; end if;
  if p_on_duty then
    insert into staff_shifts(hospital_id,staff_id,registered_by)
    values (v_staff.hospital_id,p_staff_id,p_actor_id)
    on conflict (staff_id) where ended_at is null do nothing;
  else
    update staff_shifts set ended_at = now()
      where staff_id = p_staff_id and ended_at is null;
  end if;
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'staff_shift_updated','profile',p_staff_id,
      jsonb_build_object('on_duty',p_on_duty));
  return 'updated';
end $$;
revoke all on function set_staff_shift_atomic(uuid,uuid,boolean) from public;
grant execute on function set_staff_shift_atomic(uuid,uuid,boolean) to service_role;

create or replace function manage_ambulance_atomic(
  p_actor_id uuid, p_hospital_id uuid, p_ambulance_id uuid,
  p_action text, p_codigo text, p_placa text, p_type_id uuid, p_driver_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor profiles%rowtype;
  v_ambulance ambulances%rowtype;
  v_id uuid;
begin
  select * into v_actor from profiles where id = p_actor_id and activo = true;
  if v_actor.id is null or not (
    v_actor.rol = 'admin' or
    (v_actor.rol = 'hospital_staff' and v_actor.hospital_id = p_hospital_id)
  ) then return jsonb_build_object('error','forbidden'); end if;
  if not exists (select 1 from hospitals where id = p_hospital_id and activo = true) then
    return jsonb_build_object('error','hospital_unavailable');
  end if;
  if p_action in ('create','update') then
    if nullif(trim(p_codigo),'') is null or nullif(trim(p_placa),'') is null or p_type_id is null then
      return jsonb_build_object('error','missing_fields');
    end if;
    if not exists (select 1 from ambulance_types where id = p_type_id
      and hospital_id = p_hospital_id and activo = true) then
      return jsonb_build_object('error','invalid_type');
    end if;
    if p_driver_id is not null and not exists (
      select 1 from drivers where id = p_driver_id and hospital_id = p_hospital_id and activo = true
    ) then return jsonb_build_object('error','invalid_driver'); end if;
  end if;
  if p_action = 'create' then
    insert into ambulances(hospital_id,codigo,placa,type_id,driver_id,estado,activa,tipo)
      values (p_hospital_id,upper(trim(p_codigo)),upper(trim(p_placa)),
        p_type_id,p_driver_id,'disponible',true,'basica')
      returning id into v_id;
  elsif p_action in ('update','activate','deactivate','maintenance_on','maintenance_off') then
    select * into v_ambulance from ambulances where id = p_ambulance_id for update;
    if not found or v_ambulance.hospital_id is distinct from p_hospital_id then
      return jsonb_build_object('error','not_found');
    end if;
    if v_ambulance.estado = 'en_servicio' or exists (
      select 1 from incidents where assigned_ambulance_id = p_ambulance_id
        and estado in ('assigned','on_site')
    ) then return jsonb_build_object('error','ambulance_busy'); end if;
    if p_action = 'update' then
      update ambulances set codigo = upper(trim(p_codigo)), placa = upper(trim(p_placa)),
        type_id = p_type_id, driver_id = p_driver_id
        where id = p_ambulance_id;
    elsif p_action = 'activate' then
      update ambulances set activa = true where id = p_ambulance_id;
    elsif p_action = 'deactivate' then
      update ambulances set activa = false where id = p_ambulance_id;
    elsif p_action = 'maintenance_on' then
      update ambulances set estado = 'mantenimiento' where id = p_ambulance_id;
    else
      update ambulances set estado = 'disponible' where id = p_ambulance_id;
    end if;
    v_id := p_ambulance_id;
  else
    return jsonb_build_object('error','invalid_action');
  end if;
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'ambulance_' || p_action,'ambulance',v_id,
      jsonb_build_object('hospital_id',p_hospital_id));
  return jsonb_build_object('ambulance_id',v_id,'action',p_action);
end $$;
revoke all on function manage_ambulance_atomic(uuid,uuid,uuid,text,text,text,uuid,uuid) from public;
grant execute on function manage_ambulance_atomic(uuid,uuid,uuid,text,text,text,uuid,uuid) to service_role;

create or replace function update_driver_atomic(
  p_actor_id uuid, p_driver_id uuid, p_nombre text, p_ci text,
  p_licencia_numero text, p_licencia_categoria text,
  p_licencia_vence date, p_telefono text, p_documento_url text, p_activo boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare v_actor profiles%rowtype; v_driver drivers%rowtype;
begin
  select * into v_actor from profiles where id = p_actor_id and activo = true;
  select * into v_driver from drivers where id = p_driver_id for update;
  if not found then return 'not_found'; end if;
  if v_actor.id is null or not (
    v_actor.rol = 'admin' or
    (v_actor.rol = 'hospital_staff' and v_actor.hospital_id = v_driver.hospital_id)
  ) then return 'forbidden'; end if;
  if p_activo = false and exists (
    select 1 from incidents where assigned_driver_id = p_driver_id
      and estado in ('assigned','on_site')
  ) then return 'driver_busy'; end if;
  update drivers set nombre = p_nombre, ci = p_ci,
    licencia_numero = p_licencia_numero, licencia_categoria = p_licencia_categoria,
    licencia_vence = p_licencia_vence, telefono = p_telefono,
    licencia_documento_url = p_documento_url,
    activo = p_activo where id = p_driver_id;
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'driver_updated','driver',p_driver_id,
      jsonb_build_object('hospital_id',v_driver.hospital_id,'activo',p_activo));
  return 'updated';
end $$;
revoke all on function update_driver_atomic(uuid,uuid,text,text,text,text,date,text,text,boolean) from public;
grant execute on function update_driver_atomic(uuid,uuid,text,text,text,text,date,text,text,boolean) to service_role;

-- El operador confirma los datos visibles del caso sin sobrescribir la IA.
create or replace function update_incident_details_atomic(
  p_incident_id uuid, p_actor_id uuid, p_injured int, p_reference text
) returns text
language plpgsql security definer set search_path = public as $$
declare v_hospital uuid; v_incident incidents%rowtype;
begin
  select hospital_id into v_hospital from profiles
    where id = p_actor_id and rol = 'hospital_staff' and activo = true;
  if v_hospital is null then return 'forbidden'; end if;
  if p_injured is not null and (p_injured < 0 or p_injured > 100) then return 'invalid_injured'; end if;
  select * into v_incident from incidents where id = p_incident_id for update;
  if not found then return 'not_found'; end if;
  if v_incident.estado not in ('searching','assigned','on_site') then return 'invalid_transition'; end if;
  if v_incident.assigned_hospital_id is distinct from v_hospital and not (
    v_incident.estado = 'searching' and exists (
      select 1 from incident_offers where incident_id = p_incident_id
        and hospital_id = v_hospital and closed_at is null
    )
  ) then return 'forbidden'; end if;
  update incidents set cantidad_heridos_confirmada = p_injured, referencia = p_reference
    where id = p_incident_id;
  insert into audit_log(actor_id,action,entity,entity_id,payload)
    values (p_actor_id,'incident_details_updated','incident',p_incident_id,
      jsonb_build_object('cantidad_heridos_confirmada',p_injured,'referencia',p_reference));
  return 'updated';
end $$;
revoke all on function update_incident_details_atomic(uuid,uuid,integer,text) from public;
grant execute on function update_incident_details_atomic(uuid,uuid,integer,text) to service_role;

create or replace function incident_location(p_incident_id uuid)
returns table(lat double precision, lon double precision)
language sql stable security definer set search_path = public as $$
  select st_y(ubicacion::geometry), st_x(ubicacion::geometry)
  from incidents where id = p_incident_id
$$;
revoke all on function incident_location(uuid) from public;
grant execute on function incident_location(uuid) to service_role;
create or replace function hospital_location(p_hospital_id uuid)
returns table(lat double precision, lon double precision)
language sql stable security definer set search_path = public as $$
  select st_y(ubicacion::geometry), st_x(ubicacion::geometry)
  from hospitals where id = p_hospital_id
$$;
revoke all on function hospital_location(uuid) from public;
grant execute on function hospital_location(uuid) to service_role;
create or replace function count_confirmed_false_alarms(p_reporter_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(distinct i.id)::int from incidents i
  join false_alarm_reports f on f.incident_id = i.id and f.status = 'confirmed'
  where i.reporter_id = p_reporter_id
$$;
revoke all on function count_confirmed_false_alarms(uuid) from public;
grant execute on function count_confirmed_false_alarms(uuid) to service_role;

-- Realtime usa las mismas RLS para cada suscriptor.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'incidents') then
      alter publication supabase_realtime add table incidents;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'incident_offers') then
      alter publication supabase_realtime add table incident_offers;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'false_alarm_reports') then
      alter publication supabase_realtime add table false_alarm_reports;
    end if;
  end if;
end $$;
