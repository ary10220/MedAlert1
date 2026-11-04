import { body, caller, db, HttpError, notifyBestEffort, reply, requiredUuid, serve, staffToNotify } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const client = db()
  const user = await caller(req, client, ['testigo', 'admin'])
  const { data: result, error } = await client.rpc('dispatch_incident_atomic', {
    p_incident_id: incidentId, p_actor_id: user.id,
  })
  if (error) throw error
  if (result?.error) {
    throw new HttpError(result.error === 'not_found' ? 404 : result.error === 'forbidden' ? 403 : 409,
      result.error)
  }
  if (!result || !Array.isArray(result.hospitals)) throw new HttpError(500, 'Invalid dispatch result')
  const ids: string[] = result.hospitals.map((hospital: { id: string }) => hospital.id)
  if (ids.length) {
    try {
      await notifyBestEffort(await staffToNotify(client, ids),
        'Nueva alerta MedAlert', 'Hay un incidente para revisión y despacho.',
        { incident_id: incidentId, type: 'incident_offer' })
    } catch (notifyError) { console.error('dispatch notification failed', notifyError) }
  }
  return reply(result)
})
