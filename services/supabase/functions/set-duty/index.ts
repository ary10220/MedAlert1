import { body, caller, db, HttpError, reply, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  if (typeof input.on_duty !== 'boolean') throw new HttpError(400, 'on_duty must be boolean')
  const client = db()
  const actor = await caller(req, client, ['admin', 'hospital_staff'])
  const staffId = input.staff_id === undefined && actor.rol === 'hospital_staff'
    ? actor.id : requiredUuid(input.staff_id, 'staff_id')
  const { data: result, error } = await client.rpc('set_staff_shift_atomic', {
    p_actor_id: actor.id, p_staff_id: staffId, p_on_duty: input.on_duty,
  })
  if (error) throw error
  if (result !== 'updated') throw new HttpError(403, result ?? 'Could not update shift')
  return reply({ staff_id: staffId, on_duty: input.on_duty })
})
