import { audit, body, caller, db, HttpError, reply, requiredUuid, serve } from '../_shared/core.ts'

function storagePath(value: string, projectUrl: string, reporterId: string): string {
  let path = value
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value)
    if (url.origin !== new URL(projectUrl).origin) throw new HttpError(400, 'Photo must be in project storage')
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/incident-photos\/(.+)$/)
    if (!match) throw new HttpError(400, 'Invalid photo URL')
    path = decodeURIComponent(match[1])
  }
  path = path.replace(/^incident-photos\//, '')
  if (!path.startsWith(`${reporterId}/`) || path.includes('..')) throw new HttpError(403, 'Photo path is not owned by reporter')
  return path
}
function encodeBase64(bytes: Uint8Array): string {
  let output = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    output += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(output)
}

serve(async (req) => {
  const input = await body(req)
  const incidentId = requiredUuid(input.incident_id, 'incident_id')
  const client = db()
  const user = await caller(req, client, ['testigo', 'admin'])
  const { data: incident, error } = await client.from('incidents')
    .select('id,reporter_id,foto_url,estado').eq('id', incidentId).single()
  if (error || !incident) throw new HttpError(404, 'Incident not found')
  if (user.rol !== 'admin' && incident.reporter_id !== user.id) throw new HttpError(403, 'Forbidden')
  if (!['open', 'searching'].includes(incident.estado)) throw new HttpError(409, 'Incident cannot be triaged now')
  if (typeof input.photo_url !== 'string' || input.photo_url !== incident.foto_url) {
    throw new HttpError(400, 'photo_url must match the incident')
  }
  if (!incident.reporter_id) throw new HttpError(400, 'Incident has no reporter')
  const path = storagePath(input.photo_url, Deno.env.get('SUPABASE_URL') ?? '', incident.reporter_id)
  const { data: photo, error: photoError } = await client.storage.from('incident-photos').download(path)
  if (photoError || !photo) throw new HttpError(404, 'Photo not found')
  if (photo.size > 5 * 1024 * 1024) throw new HttpError(413, 'Photo exceeds 5 MB')
  const mime = photo.type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new HttpError(415, 'Unsupported image')
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new HttpError(503, 'Gemini not configured')
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Describe solo lo visible en la escena. No hagas diagnóstico médico. Devuelve JSON: priority (P1/P2/P3), scene_description, tipo_accidente, cantidad_heridos_estimada (entero >= 0), suggested_unit (basica/avanzada/uti), confidence (0 a 1). Si hay incertidumbre, indícala en la descripción. La clasificación es una sugerencia que revisará un operador humano.' },
          { inline_data: { mime_type: mime, data: encodeBase64(new Uint8Array(await photo.arrayBuffer())) } },
        ] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  )
  if (!response.ok) throw new HttpError(502, 'Gemini request failed')
  const gemini = await response.json()
  const text = gemini?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text
  let result: Record<string, unknown>
  try { result = JSON.parse(text) } catch { throw new HttpError(502, 'Invalid Gemini response') }
  if (!['P1', 'P2', 'P3'].includes(result.priority as string) ||
      !['basica', 'avanzada', 'uti'].includes(result.suggested_unit as string) ||
      typeof result.scene_description !== 'string' ||
      typeof result.tipo_accidente !== 'string' ||
      !Number.isInteger(result.cantidad_heridos_estimada) ||
      (result.cantidad_heridos_estimada as number) < 0 ||
      typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    throw new HttpError(502, 'Incomplete Gemini response')
  }
  const { data: updated, error: updateError } = await client.from('incidents').update({
    prioridad: result.priority,
    ia_output: result,
    tipo_accidente: result.tipo_accidente,
    cantidad_heridos: result.cantidad_heridos_estimada,
    ia_suggested_type: result.suggested_unit,
  }).eq('id', incidentId).eq('foto_url', incident.foto_url).select('id').maybeSingle()
  if (updateError) throw updateError
  if (!updated) throw new HttpError(409, 'Incident changed during triage')
  await audit(client, user.id, 'incident_triaged', incidentId, { model, priority: result.priority })
  return reply({ incident_id: incidentId, ...result })
})
