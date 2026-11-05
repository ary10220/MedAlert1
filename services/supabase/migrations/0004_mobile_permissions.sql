-- Ejecutar en el proyecto remoto después de crear las tablas de MedAlert.
-- Las funciones Edge del reporte usan service_role y requieren estos accesos
-- SQL concretos además de BYPASSRLS. El despacho atómico usa una función
-- SECURITY DEFINER, así que no necesita INSERT directo en incident_offers.
grant select on table
  public.profiles,
  public.incidents,
  public.incident_offers,
  public.hospitals,
  public.ambulances,
  public.drivers,
  public.staff_shifts,
  public.fcm_tokens
to service_role;
grant update on table public.incidents to service_role;
grant insert on table public.audit_log to service_role;

-- La app inserta un incidente con INSERT ... RETURNING y luego lo sigue en vivo.
-- El testigo solo puede leer sus propios reportes.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'incidents'
      and policyname = 'testigos ven sus reportes'
  ) then
    create policy "testigos ven sus reportes" on public.incidents
      for select to authenticated using (reporter_id = auth.uid());
  end if;
end $$;
