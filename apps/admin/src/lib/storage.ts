// URLs firmadas para los buckets privados (incident-photos, hospital-logos, driver-licenses).
import { supabase } from './supabase'

type Bucket = 'incident-photos' | 'hospital-logos' | 'driver-licenses'
const TTL_S = 300
const cache = new Map<string, { url: string; expires: number }>()

/** Normaliza lo guardado en la base (ruta relativa o URL de storage) a ruta dentro del bucket. */
function objectPath(bucket: Bucket, value: string): string {
  const m = value.match(new RegExp(`/storage/v1/object/(?:sign|public|authenticated)/${bucket}/([^?]+)`))
  return decodeURIComponent(m ? m[1] : value.replace(new RegExp(`^${bucket}/`), ''))
}

/** Firma varias rutas de una vez; devuelve ruta original → URL (las que fallan quedan fuera). */
export async function signedUrls(bucket: Bucket, values: string[]): Promise<Record<string, string>> {
  const now = Date.now()
  const out: Record<string, string> = {}
  const pending: { value: string; path: string }[] = []
  for (const value of new Set(values.filter(Boolean))) {
    const hit = cache.get(`${bucket}:${value}`)
    if (hit && hit.expires > now + 30_000) out[value] = hit.url
    else pending.push({ value, path: objectPath(bucket, value) })
  }
  if (pending.length) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(pending.map((p) => p.path), TTL_S)
    data?.forEach((row, i) => {
      if (row.signedUrl) {
        out[pending[i].value] = row.signedUrl
        cache.set(`${bucket}:${pending[i].value}`, { url: row.signedUrl, expires: now + TTL_S * 1000 })
      }
    })
  }
  return out
}

export async function signedUrl(bucket: Bucket, value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  return (await signedUrls(bucket, [value]))[value] ?? null
}

/** Sube un archivo a {hospital_id}/{timestamp}-{nombre} y devuelve la ruta del objeto. */
export async function uploadHospitalFile(bucket: 'hospital-logos' | 'driver-licenses', hospitalId: string, file: File): Promise<string> {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60)
  const path = `${hospitalId}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}
