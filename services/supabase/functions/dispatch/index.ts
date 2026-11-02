import { body, caller, db, HttpError, notifyBestEffort, reply, requiredUuid, serve } from '../_shared/core.ts'

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
    const { data: staff, error: staffError } = await client.from('profiles')
      .select('id').eq('rol', 'hospital_staff').eq('activo', true).in('hospital_id', ids)
    if (staffError) throw staffError
    await notifyBestEffort((staff ?? []).map((profile: { id: string }) => profile.id),
      'Nueva alerta MedAlert', 'Hay un incidente para revisión y despacho.',
      { incident_id: incidentId, type: 'incident_offer' })
  }
  return reply(result)
})
