import { body, caller, db, hospitalScope, HttpError, reply, requiredText, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const client = db()
  const actor = await caller(req, client, ['admin', 'hospital_staff'])
  const hospitalId = hospitalScope(actor, input.hospital_id)
  const changes: Record<string, unknown> = {}
  for (const key of ['nombre', 'direccion', 'telefono_despacho'] as const) {
    if (input[key] !== undefined) changes[key] = requiredText(input[key], key, 300)
  }
  if (input.logo_url !== undefined) {
    if (input.logo_url !== null && (typeof input.logo_url !== 'string' ||
        !input.logo_url.startsWith(`${hospitalId}/`) || input.logo_url.includes('..'))) {
      throw new HttpError(400, 'logo_url must be a hospital-logos object path')
    }
    changes.logo_url = input.logo_url
  }
  if (input.horario_atencion !== undefined) {
    if (input.horario_atencion !== null && (typeof input.horario_atencion !== 'object' ||
        Array.isArray(input.horario_atencion))) {
      throw new HttpError(400, 'Invalid horario_atencion')
    }
    changes.horario_atencion = input.horario_atencion
  }
  if (input.notas_internas !== undefined) {
    if (actor.rol !== 'admin') throw new HttpError(403, 'Only admin can edit internal notes')
    changes.notas_internas = input.notas_internas == null ? null :
      requiredText(input.notas_internas, 'notas_internas', 3000)
  }
  if (!Object.keys(changes).length) throw new HttpError(400, 'No changes provided')
  const { data: hospital, error } = await client.from('hospitals').update(changes)
    .eq('id', hospitalId).select('id').maybeSingle()
  if (error) throw error
  if (!hospital) throw new HttpError(404, 'Hospital not found')
  const { error: auditError } = await client.from('audit_log').insert({
    actor_id: actor.id, action: 'hospital_profile_updated', entity: 'hospital',
    entity_id: hospitalId, payload: { fields: Object.keys(changes) },
  })
  if (auditError) throw auditError
  return reply({ hospital_id: hospitalId, updated_fields: Object.keys(changes) })
})
