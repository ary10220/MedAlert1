import { body, caller, db, HttpError, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const client = db()
  const admin = await caller(req, client, ['admin'])
  const hospitalId = requiredUuid(input.hospital_id, 'hospital_id')
  const nombre = requiredText(input.nombre, 'nombre', 200)
  const ci = requiredText(input.ci, 'ci', 30)
  const licenciaNumero = input.licencia_numero == null ? null : requiredText(input.licencia_numero, 'licencia_numero', 80)
  const licenciaCategoria = input.licencia_categoria == null ? null : requiredText(input.licencia_categoria, 'licencia_categoria', 30)
  const telefono = input.telefono == null ? null : requiredText(input.telefono, 'telefono', 40)
  const licenciaVence = input.licencia_vence
  if (licenciaVence != null) {
    if (typeof licenciaVence !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(licenciaVence)) {
      throw new HttpError(400, 'Invalid licencia_vence')
    }
    const parsed = new Date(`${licenciaVence}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== licenciaVence) {
      throw new HttpError(400, 'Invalid licencia_vence')
    }
  }
  const { data: hospital, error: hospitalError } = await client.from('hospitals')
    .select('id').eq('id', hospitalId).eq('activo', true).maybeSingle()
  if (hospitalError) throw hospitalError
  if (!hospital) throw new HttpError(404, 'Active hospital not found')
  const { data: driver, error } = await client.from('drivers').insert({
    hospital_id: hospitalId, nombre, ci, licencia_numero: licenciaNumero,
    licencia_categoria: licenciaCategoria, licencia_vence: licenciaVence ?? null,
    telefono, activo: true,
  }).select('id').single()
  if (error) throw new HttpError(error.code === '23505' ? 409 : 500,
    error.code === '23505' ? 'Driver CI already exists for hospital' : 'Could not create driver')
  const { error: auditError } = await client.from('audit_log').insert({
    actor_id: admin.id, action: 'driver_created', entity: 'driver', entity_id: driver.id,
    payload: { hospital_id: hospitalId },
  })
  if (auditError) throw auditError
  return reply({ driver_id: driver.id, hospital_id: hospitalId }, 201)
})
