import { body, caller, db, HttpError, notifyBestEffort, reply, reporterId, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const status = input.nuevo_estado
  if (!['on_site', 'completed', 'cancelled'].includes(status as string)) {
    throw new HttpError(400, 'Invalid nuevo_estado')
  }
  const client = db()
  const user = await caller(req, client, ['hospital_staff', 'admin'])
  if (input.user_id !== undefined && input.user_id !== user.id) throw new HttpError(403, 'user_id mismatch')
  const { data: result, error } = await client.rpc('update_incident_status_atomic', {
    p_incident_id: incidentId, p_new_status: status, p_actor_id: user.id,
  })
  if (error) throw error
  if (result !== 'updated') {
    throw new HttpError(result === 'not_found' ? 404 : result === 'forbidden' ? 403 : 409,
      result ?? 'Status update failed')
  }
  const reporter = await reporterId(client, incidentId)
  if (reporter) await notifyBestEffort([reporter], 'Actualización de tu alerta',
    status === 'on_site' ? 'La ambulancia llegó al lugar.' :
      status === 'completed' ? 'La atención fue completada.' : 'La alerta fue cancelada.',
    { incident_id: incidentId, type: 'status_updated', status: status as string })
  return reply({ incident_id: incidentId, status })
})
