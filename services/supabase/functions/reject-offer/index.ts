import { body, caller, db, HttpError, notifyBestEffort, reply, requiredText, requiredUuid, serve, staffToNotify } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const reason = input.reason == null ? 'no_capacity' : requiredText(input.reason, 'reason', 500)
  const client = db()
  const user = await caller(req, client, ['hospital_staff'])
  const { data: result, error } = await client.rpc('reject_offer_atomic', {
    p_incident_id: incidentId, p_actor_id: user.id, p_reason: reason,
  })
  if (error) throw error
  if (result?.error) throw new HttpError(
    result.error === 'not_found' ? 404 : result.error === 'forbidden' ? 403 : 409, result.error)
  if (!result || !Array.isArray(result.new_hospitals)) throw new HttpError(500, 'Invalid rejection result')
  if (result.new_hospitals.length) {
    try {
      await notifyBestEffort(await staffToNotify(client,
        result.new_hospitals.map((hospital: { id: string }) => hospital.id)),
        'Nueva alerta MedAlert', 'Hay un incidente para revisión y despacho.',
        { incident_id: incidentId, type: 'incident_offer' })
    } catch (notifyError) { console.error('replacement offer notification failed', notifyError) }
  }
  return reply(result)
})
