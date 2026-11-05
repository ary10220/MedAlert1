import { useEffect, useState } from 'react'
import { signedUrl } from '../lib/storage'

/** Logo del hospital desde el bucket privado hospital-logos; si no hay, iniciales sobre círculo. */
export default function HospitalLogo({ nombre, logoPath, size = 40 }: { nombre: string; logoPath?: string | null; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (logoPath) signedUrl('hospital-logos', logoPath).then((u) => !cancelled && setUrl(u))
    return () => {
      cancelled = true
    }
  }, [logoPath])

  if (url && !failed) {
    return <img src={url} alt="" onError={() => setFailed(true)} className="shrink-0 rounded-full bg-white object-cover" style={{ width: size, height: size }} />
  }
  const initials = nombre
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-mint/15 font-display font-semibold text-mint ring-1 ring-mint/40"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}
