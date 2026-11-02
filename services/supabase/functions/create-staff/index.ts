import { body, caller, db, HttpError, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const client = db()
  const admin = await caller(req, client, ['admin'])
  const hospitalId = requiredUuid(input.hospital_id, 'hospital_id')
  const email = requiredText(input.email, 'email', 320).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email')
  const nombre = requiredText(input.nombre, 'nombre', 200)
  const ci = requiredText(input.ci, 'ci', 30)
  const telefono = requiredText(input.telefono, 'telefono', 40)
  const { data: hospital, error: hospitalError } = await client.from('hospitals')
    .select('id').eq('id', hospitalId).eq('activo', true).maybeSingle()
  if (hospitalError) throw hospitalError
  if (!hospital) throw new HttpError(404, 'Active hospital not found')
  const { data: invited, error: inviteError } = await client.auth.admin.inviteUserByEmail(email)
  if (inviteError || !invited.user) throw new HttpError(409, inviteError?.message ?? 'Could not invite user')
  const userId = invited.user.id
  const { error: profileError } = await client.from('profiles').insert({
    id: userId, rol: 'hospital_staff', hospital_id: hospitalId, nombre, ci, telefono, activo: true,
  })
  if (profileError) {
    await client.auth.admin.deleteUser(userId)
    throw profileError
  }
  const { error: auditError } = await client.from('audit_log').insert({
    actor_id: admin.id, action: 'staff_created', entity: 'profile', entity_id: userId,
    payload: { hospital_id: hospitalId },
  })
  if (auditError) throw auditError
  return reply({ user_id: userId, hospital_id: hospitalId, invite_sent: true }, 201)
})
