import { useEffect, useState } from 'react'
import { signedUrls } from '../lib/storage'

/** Firma en lote las fotos (bucket privado incident-photos) de una lista de incidentes. */
export function useSignedPhotos(paths: (string | null | undefined)[]): Record<string, string> {
  const key = paths.filter(Boolean).sort().join('|')
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!key) return
    let cancelled = false
    signedUrls('incident-photos', key.split('|'))
      .then((m) => !cancelled && setUrls(m))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [key])
  return urls
}
