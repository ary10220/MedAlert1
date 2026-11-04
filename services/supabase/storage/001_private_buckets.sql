-- Revisar y ejecutar manualmente en Supabase SQL Editor DESPUES de 0003.
-- No ejecutar db push. Las rutas de objeto son relativas al bucket.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('incident-photos','incident-photos',false,5242880,
    array['image/jpeg','image/png','image/webp']),
  ('hospital-logos','hospital-logos',false,5242880,
    array['image/jpeg','image/png','image/webp']),
  ('driver-licenses','driver-licenses',false,5242880,
    array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "reportante sube foto propia" on storage.objects;
drop policy if exists "reportante y operadores leen foto de incidente" on storage.objects;
create policy "reportante sube foto propia" on storage.objects
for insert to authenticated with check (
  bucket_id = 'incident-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_profile_role() = 'testigo'
);
create policy "reportante y operadores leen foto de incidente" on storage.objects
for select to authenticated using (
  bucket_id = 'incident-photos'
  and (
    ((storage.foldername(name))[1] = auth.uid()::text
      and public.current_profile_role() = 'testigo')
    or exists (
      select 1 from public.incidents i
      where i.foto_url = name
        and (
          public.current_profile_role() = 'admin'
          or i.assigned_hospital_id = public.current_hospital_id()
          or exists (
            select 1 from public.incident_offers o
            where o.incident_id = i.id
              and o.hospital_id = public.current_hospital_id()
              and o.closed_at is null and i.estado = 'searching'
          )
        )
    )
  )
);

drop policy if exists "hospital sube logo propio" on storage.objects;
drop policy if exists "hospital lee logo propio" on storage.objects;
create policy "hospital sube logo propio" on storage.objects
for insert to authenticated with check (
  bucket_id = 'hospital-logos'
  and (
    (storage.foldername(name))[1] = public.current_hospital_id()::text
    or public.current_profile_role() = 'admin'
  )
);
create policy "hospital lee logo propio" on storage.objects
for select to authenticated using (
  bucket_id = 'hospital-logos'
  and (
    (storage.foldername(name))[1] = public.current_hospital_id()::text
    or public.current_profile_role() = 'admin'
  )
);

drop policy if exists "hospital sube licencia propia" on storage.objects;
drop policy if exists "hospital lee licencia propia" on storage.objects;
create policy "hospital sube licencia propia" on storage.objects
for insert to authenticated with check (
  bucket_id = 'driver-licenses'
  and (
    (storage.foldername(name))[1] = public.current_hospital_id()::text
    or public.current_profile_role() = 'admin'
  )
);
create policy "hospital lee licencia propia" on storage.objects
for select to authenticated using (
  bucket_id = 'driver-licenses'
  and (
    (storage.foldername(name))[1] = public.current_hospital_id()::text
    or public.current_profile_role() = 'admin'
  )
);
