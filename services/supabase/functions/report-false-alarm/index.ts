import { body, caller, db, HttpError, notifyBestEffort, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const reason = requiredText(input.reason, 'reason', 1000)
  const client = db()
  const user = await caller(req, client, ['hospital_staff'])
  if (input.user_id !== undefined && input.user_id !== user.id) throw new HttpError(403, 'user_id mismatch')
  const { data: result, error } = await client.rpc('report_false_alarm_atomic', {
    p_incident_id: incidentId, p_reason: reason, p_actor_id: user.id,
  })
  if (error) throw error
  if (result !== 'reported') {
    throw new HttpError(result === 'not_found' ? 404 : result === 'forbidden' ? 403 : 409,
      result ?? 'False alarm report failed')
  }
  const { data: admins, error: adminsError } = await client.from('profiles')
    .select('id').eq('rol', 'admin').eq('activo', true)
  if (adminsError) throw adminsError
  await notifyBestEffort((admins ?? []).map((admin: { id: string }) => admin.id),
    'Falsa alarma para revisión', 'Un hospital marcó un incidente como falsa alarma.',
    { incident_id: incidentId, type: 'false_alarm_reported' })
  return reply({ incident_id: incidentId, status: 'cancelled', admin_review: 'pending' })
})
