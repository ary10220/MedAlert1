import { body, caller, db, hospitalScope, HttpError, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

const actions = ['create', 'update', 'activate', 'deactivate', 'maintenance_on', 'maintenance_off']
serve(async (req) => {
  const input = await body(req)
  const client = db()
  const actor = await caller(req, client, ['admin', 'hospital_staff'])
  const hospitalId = hospitalScope(actor, input.hospital_id)
  const action = input.action
  if (typeof action !== 'string' || !actions.includes(action)) throw new HttpError(400, 'Invalid action')
  const ambulanceId = action === 'create' ? null : requiredUuid(input.ambulance_id, 'ambulance_id')
  let codigo: string | null = null
  let placa: string | null = null
  let typeId: string | null = null
  let driverId: string | null = null
  if (action === 'create' || action === 'update') {
    codigo = requiredText(input.codigo, 'codigo', 40).toUpperCase()
    placa = requiredText(input.placa, 'placa', 20).toUpperCase()
    if (!/^\d{3,4}-?[A-Z]{3}$/.test(placa)) throw new HttpError(400, 'Invalid placa')
    typeId = requiredUuid(input.type_id, 'type_id')
    driverId = input.driver_id == null ? null : requiredUuid(input.driver_id, 'driver_id')
  }
  const { data: result, error } = await client.rpc('manage_ambulance_atomic', {
    p_actor_id: actor.id, p_hospital_id: hospitalId, p_ambulance_id: ambulanceId,
    p_action: action, p_codigo: codigo, p_placa: placa, p_type_id: typeId, p_driver_id: driverId,
  })
  if (error) throw new HttpError(error.code === '23505' ? 409 : 500,
    error.code === '23505' ? 'Ambulance code or plate already exists' : 'Could not save ambulance')
  if (result?.error) throw new HttpError(
    result.error === 'forbidden' ? 403 : result.error === 'not_found' ||
      result.error === 'hospital_unavailable' ? 404 : 409, result.error)
  if (!result?.ambulance_id) throw new HttpError(500, 'Invalid ambulance result')
  return reply(result, action === 'create' ? 201 : 200)
})
