import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'

export type Role = 'testigo' | 'hospital_staff' | 'admin'
export type Caller = { id: string; rol: Role; hospital_id: string | null }
export const uuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing server secret: ${name}`)
  return value
}
export function db(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
export function reply(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
export async function body(req: Request): Promise<Record<string, unknown>> {
  if (req.method !== 'POST') throw new HttpError(405, 'POST required')
  if (!req.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'JSON required')
  const raw = await req.text()
  if (raw.length > 32_768) throw new HttpError(413, 'Request too large')
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  } catch { /* handled below */ }
  throw new HttpError(400, 'Invalid JSON body')
}
export function requiredUuid(value: unknown, name: string): string {
  if (!uuid(value)) throw new HttpError(400, `Invalid ${name}`)
  return value
}
export function requiredText(value: unknown, name: string, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, `Invalid ${name}`)
  return value.trim()
}
export async function caller(req: Request, client: SupabaseClient, roles: Role[]): Promise<Caller> {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) throw new HttpError(401, 'Authentication required')
  const { data: auth, error: authError } = await client.auth.getUser(token)
  if (authError || !auth.user) throw new HttpError(401, 'Invalid session')
  const { data: profile, error } = await client.from('profiles')
    .select('id,rol,hospital_id,activo').eq('id', auth.user.id).single()
  if (error || !profile || !profile.activo || !roles.includes(profile.rol)) throw new HttpError(403, 'Forbidden')
  return { id: profile.id, rol: profile.rol, hospital_id: profile.hospital_id }
}
export function serve(handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    try { return await handler(req) }
    catch (error) {
      if (error instanceof HttpError) return reply({ error: error.message }, error.status)
      console.error(error)
      return reply({ error: 'Internal server error' }, 500)
    }
  })
}
export async function audit(client: SupabaseClient, actorId: string | null, action: string,
  incidentId: string, payload: Record<string, unknown> = {}): Promise<void> {
  const { error } = await client.from('audit_log').insert({
    actor_id: actorId, action, entity: 'incident', entity_id: incidentId, payload,
  })
  if (error) throw error
}
export async function notifyBestEffort(userIds: string[], title: string, message: string,
  data: Record<string, string>): Promise<void> {
  if (!userIds.length) return
  try {
    const response = await fetch(`${env('SUPABASE_URL')}/functions/v1/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ user_ids: [...new Set(userIds)], title, body: message, data }),
    })
    if (!response.ok) console.error('notify failed', response.status, await response.text())
  } catch (error) { console.error('notify failed', error) }
}
export async function reporterId(client: SupabaseClient, incidentId: string): Promise<string | null> {
  const { data, error } = await client.from('incidents').select('reporter_id').eq('id', incidentId).single()
  if (error) throw error
  return data.reporter_id
}
