-- Activar RLS en todas las tablas sensibles
alter table incidents enable row level security;
alter table profiles enable row level security;
alter table hospitals enable row level security;
alter table ambulances enable row level security;

-- Testigos ven y crean solo sus propios reportes
create policy "testigos ven sus reportes" on incidents
  for select using (reporter_id = auth.uid());

create policy "testigos crean reportes" on incidents
  for insert with check (reporter_id = auth.uid());

-- Staff hospitalario ve incidentes asignados a su hospital
create policy "hospital staff ve sus asignados" on incidents
  for select using (
    assigned_hospital_id = (select hospital_id from profiles where id = auth.uid())
  );

-- Staff hospitalario puede actualizar los suyos (aceptar, despachar, cerrar)
create policy "hospital staff actualiza sus casos" on incidents
  for update using (
    assigned_hospital_id = (select hospital_id from profiles where id = auth.uid())
  );

-- Admin ve todo
create policy "admin ve todo" on incidents
  for all using (
    (select rol from profiles where id = auth.uid()) = 'admin'
  );
