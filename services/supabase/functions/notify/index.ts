import { body, db, env, HttpError, reply, requiredText, serve, uuid } from '../_shared/core.ts'

type ServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri?: string }
function base64url(bytes: Uint8Array): string {
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function accessToken(account: ServiceAccount): Promise<string> {
  const keyBytes = Uint8Array.from(atob(account.private_key
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')),
    (char) => char.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claims = base64url(new TextEncoder().encode(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: account.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })))
  const unsigned = `${header}.${claims}`
  const signature = base64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(unsigned))))
  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}` }),
  })
  if (!response.ok) throw new HttpError(502, 'Firebase token exchange failed')
  const result = await response.json()
  if (typeof result.access_token !== 'string') throw new HttpError(502, 'Firebase access token missing')
  return result.access_token
}

serve(async (req) => {
  const input = await body(req)
  // Interno: nunca confiar en user_ids enviados por un cliente con JWT de usuario.
  if (req.headers.get('authorization') !== `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`) {
    throw new HttpError(403, 'Service role required')
  }
  if (!Array.isArray(input.user_ids) || input.user_ids.length > 100 ||
      !input.user_ids.every(uuid)) throw new HttpError(400, 'Invalid user_ids')
  const title = requiredText(input.title, 'title', 100)
  const message = requiredText(input.body, 'body', 500)
  if (input.data !== undefined && (typeof input.data !== 'object' || !input.data ||
      Array.isArray(input.data) || Object.values(input.data).some((value) => typeof value !== 'string'))) {
    throw new HttpError(400, 'data must contain string values')
  }
  const data = (input.data ?? {}) as Record<string, string>
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
  if (!raw) {
    console.log('notify skipped: FCM not configured')
    return reply({ skipped: true, reason: 'FCM not configured', results: [] })
  }
  let account: ServiceAccount
  try { account = JSON.parse(raw) } catch { throw new HttpError(500, 'Invalid Firebase service account') }
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new HttpError(500, 'Incomplete Firebase service account')
  }
  const client = db()
  const ids = [...new Set(input.user_ids as string[])]
  if (!ids.length) return reply({ skipped: false, results: [] })
  const { data: tokens, error } = await client.from('fcm_tokens')
    .select('user_id,token').in('user_id', ids)
  if (error) throw error
  if (!tokens?.length) return reply({ skipped: false, results: ids.map((user_id) => ({
    user_id, sent: 0, failed: 0,
  })) })
  const bearer = await accessToken(account)
  const totals = new Map(ids.map((id) => [id, { user_id: id, sent: 0, failed: 0 }]))
  for (const row of tokens) {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { token: row.token, notification: { title, body: message }, data } }),
      },
    )
    const total = totals.get(row.user_id)!
    if (response.ok) total.sent++
    else { total.failed++; console.error('FCM send failed', response.status, await response.text()) }
  }
  return reply({ skipped: false, results: [...totals.values()] })
})
