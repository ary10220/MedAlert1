import { body, caller, db, HttpError, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const injured = input.cantidad_heridos_confirmada === null ? null :
    input.cantidad_heridos_confirmada
  if (injured !== null && (!Number.isInteger(injured) || (injured as number) < 0 ||
      (injured as number) > 100)) throw new HttpError(400, 'Invalid cantidad_heridos_confirmada')
  const reference = input.referencia === null ? null : requiredText(input.referencia, 'referencia', 500)
  const client = db()
  const actor = await caller(req, client, ['hospital_staff'])
  const { data: result, error } = await client.rpc('update_incident_details_atomic', {
    p_incident_id: incidentId, p_actor_id: actor.id, p_injured: injured, p_reference: reference,
  })
  if (error) throw error
  if (result !== 'updated') throw new HttpError(result === 'not_found' ? 404 :
    result === 'forbidden' ? 403 : 409, result ?? 'Could not update incident')
  return reply({ incident_id: incidentId, updated: true })
})
