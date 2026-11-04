import { body, caller, db, HttpError, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const reporterId = requiredUuid(input.reporter_id, 'reporter_id')
  if (typeof input.activo !== 'boolean') throw new HttpError(400, 'activo must be boolean')
  const reason = requiredText(input.reason, 'reason', 1000)
  const client = db()
  const admin = await caller(req, client, ['admin'])
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,activo').eq('id', reporterId).eq('rol', 'testigo').maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new HttpError(404, 'Reporter not found')
  const { error: updateError } = await client.from('profiles')
    .update({ activo: input.activo }).eq('id', reporterId)
  if (updateError) throw updateError
  const { error: auditError } = await client.from('audit_log').insert({
    actor_id: admin.id, action: input.activo ? 'reporter_reactivated' : 'reporter_suspended',
    entity: 'profile', entity_id: reporterId, payload: { reason },
  })
  if (auditError) throw auditError
  return reply({ reporter_id: reporterId, activo: input.activo })
})
