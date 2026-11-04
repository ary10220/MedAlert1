import { body, caller, db, HttpError, reply, requiredText, requiredUuid, serve } from '../_shared/core.ts'

serve(async (req) => {
  const input = await body(req)
  const reportId = requiredUuid(input.report_id, 'report_id')
  const decision = input.decision
  if (decision !== 'confirmed' && decision !== 'dismissed') {
    throw new HttpError(400, 'decision must be confirmed or dismissed')
  }
  const note = requiredText(input.note, 'note', 1000)
  const client = db()
  const admin = await caller(req, client, ['admin'])
  const { data: result, error } = await client.rpc('review_false_alarm_atomic', {
    p_report_id: reportId, p_actor_id: admin.id, p_decision: decision, p_note: note,
  })
  if (error) throw error
  if (result?.error) throw new HttpError(
    result.error === 'not_found' ? 404 : result.error === 'forbidden' ? 403 : 409, result.error)
  if (!result?.report_id) throw new HttpError(500, 'Invalid review result')
  return reply(result)
})
