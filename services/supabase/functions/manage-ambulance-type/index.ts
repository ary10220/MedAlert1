import { body, caller, db, hospitalScope, HttpError, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const client = db()
  const actor = await caller(req, client, ['admin', 'hospital_staff'])
  const hospitalId = hospitalScope(actor, input.hospital_id)
  const action = input.action
  if (!['create', 'rename', 'deactivate', 'activate'].includes(action as string)) {
    throw new HttpError(400, 'Invalid action')
  }
  const id = action === 'create' ? null : requiredUuid(input.type_id, 'type_id')
  let typeId: string
  if (action === 'create') {
    const name = requiredText(input.nombre, 'nombre', 80)
    const base = input.base_tipo
    if (!['basica', 'avanzada', 'uti'].includes(base as string)) throw new HttpError(400, 'Invalid base_tipo')
    const { data, error } = await client.from('ambulance_types').insert({
      hospital_id: hospitalId, nombre: name, base_tipo: base, activo: true,
    }).select('id').single()
    if (error) throw new HttpError(error.code === '23505' ? 409 : 500,
      error.code === '23505' ? 'Type already exists' : 'Could not create type')
    typeId = data.id
  } else {
    const { data: current, error: currentError } = await client.from('ambulance_types')
      .select('id').eq('id', id).eq('hospital_id', hospitalId).maybeSingle()
    if (currentError) throw currentError
    if (!current) throw new HttpError(404, 'Type not found')
    if (action === 'deactivate') {
      const { count, error: countError } = await client.from('ambulances')
        .select('id', { count: 'exact', head: true }).eq('type_id', id).eq('activa', true)
      if (countError) throw countError
      if (count) throw new HttpError(409, 'Type is used by active ambulances')
    }
    const values = action === 'rename' ? { nombre: requiredText(input.nombre, 'nombre', 80) }
      : { activo: action === 'activate' }
    const { error } = await client.from('ambulance_types').update(values).eq('id', id)
    if (error) throw new HttpError(error.code === '23505' ? 409 : 500,
      error.code === '23505' ? 'Type name already exists' : 'Could not update type')
    typeId = id!
  }
  const { error: auditError } = await client.from('audit_log').insert({
    actor_id: actor.id, action: `ambulance_type_${action}`, entity: 'ambulance_type',
    entity_id: typeId, payload: { hospital_id: hospitalId },
  })
  if (auditError) throw auditError
  return reply({ type_id: typeId, hospital_id: hospitalId, action }, action === 'create' ? 201 : 200)
})
