import { body, caller, db, HttpError, notifyBestEffort, reply, reporterId, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const ambulanceId = requiredUuid(input.ambulance_id, 'ambulance_id')
  const driverId = requiredUuid(input.driver_id, 'driver_id')
  const client = db()
  const user = await caller(req, client, ['hospital_staff'])
  if (input.user_id !== undefined && input.user_id !== user.id) throw new HttpError(403, 'user_id mismatch')
  const { data: result, error } = await client.rpc('accept_incident_atomic', {
    p_incident_id: incidentId, p_ambulance_id: ambulanceId, p_driver_id: driverId,
    p_actor_id: user.id,
  })
  if (error) throw error
  if (result !== 'accepted') {
    const status = result === 'not_found' ? 404 : result === 'forbidden' || result === 'not_offered' ? 403 : 409
    throw new HttpError(status, result ?? 'Dispatch failed')
  }
  try {
    const reporter = await reporterId(client, incidentId)
    if (reporter) await notifyBestEffort([reporter], 'Ambulancia asignada',
      'Un hospital aceptó tu alerta y asignó una ambulancia.',
      { incident_id: incidentId, type: 'incident_assigned' })
  } catch (notifyError) { console.error('assignment notification failed', notifyError) }
  return reply({ incident_id: incidentId, ambulance_id: ambulanceId,
    driver_id: driverId, status: 'assigned' })
})
