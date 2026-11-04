import { body, caller, db, HttpError, reply, requiredDate, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const driverId = requiredUuid(input.driver_id, 'driver_id')
  const nombre = requiredText(input.nombre, 'nombre', 200)
  const ci = requiredText(input.ci, 'ci', 30)
  const licenciaNumero = input.licencia_numero == null ? null :
    requiredText(input.licencia_numero, 'licencia_numero', 80)
  const licenciaCategoria = input.licencia_categoria == null ? null :
    requiredText(input.licencia_categoria, 'licencia_categoria', 30)
  const licenciaVence = input.licencia_vence == null ? null :
    requiredDate(input.licencia_vence, 'licencia_vence')
  const telefono = input.telefono == null ? null : requiredText(input.telefono, 'telefono', 40)
  if (typeof input.activo !== 'boolean') throw new HttpError(400, 'activo must be boolean')
  const client = db()
  const actor = await caller(req, client, ['admin', 'hospital_staff'])
  const { data: existing, error: existingError } = await client.from('drivers')
    .select('hospital_id').eq('id', driverId).maybeSingle()
  if (existingError) throw existingError
  if (!existing) throw new HttpError(404, 'Driver not found')
  const documento = input.licencia_documento_url == null ? null :
    requiredText(input.licencia_documento_url, 'licencia_documento_url', 500)
  if (documento && (!documento.startsWith(`${existing.hospital_id}/`) || documento.includes('..'))) {
    throw new HttpError(400, 'Invalid driver license object path')
  }
  const { data: result, error } = await client.rpc('update_driver_atomic', {
    p_actor_id: actor.id, p_driver_id: driverId, p_nombre: nombre, p_ci: ci,
    p_licencia_numero: licenciaNumero, p_licencia_categoria: licenciaCategoria,
    p_licencia_vence: licenciaVence, p_telefono: telefono,
    p_documento_url: documento, p_activo: input.activo,
  })
  if (error) throw new HttpError(error.code === '23505' ? 409 : 500,
    error.code === '23505' ? 'Driver CI already exists' : 'Could not update driver')
  if (result !== 'updated') throw new HttpError(
    result === 'not_found' ? 404 : result === 'forbidden' ? 403 : 409, result ?? 'Driver update failed')
  return reply({ driver_id: driverId, updated: true })
})
