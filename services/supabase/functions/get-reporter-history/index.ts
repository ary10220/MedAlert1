import { body, caller, db, HttpError, reply, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const reporterId = requiredUuid(input.reporter_id, 'reporter_id')
  const client = db()
  await caller(req, client, ['admin'])
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,nombre,ci,telefono,activo').eq('id', reporterId).maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new HttpError(404, 'Reporter not found')
  const { data: authUser } = await client.auth.admin.getUserById(reporterId)
  const { data: incidents, error: incidentError } = await client.from('incidents')
    .select('id,estado,tipo_accidente,cantidad_heridos,created_at')
    .eq('reporter_id', reporterId).order('created_at', { ascending: false }).limit(100)
  if (incidentError) throw incidentError
  const ids = (incidents ?? []).map((incident: { id: string }) => incident.id)
  const reports = ids.length
    ? await client.from('false_alarm_reports')
      .select('id,incident_id,status,created_at,reviewed_at')
      .in('incident_id', ids)
    : { data: [], error: null }
  if (reports.error) throw reports.error
  const { data: confirmedCount, error: countError } = await client.rpc('count_confirmed_false_alarms', {
    p_reporter_id: reporterId,
  })
  if (countError) throw countError
  return reply({
    reporter: { ...profile, email: authUser?.user?.email ?? null },
    incidents: incidents ?? [],
    false_alarm_reports: reports.data ?? [],
    confirmed_false_alarms: confirmedCount ?? 0,
    history_limited_to: 100,
  })
})
