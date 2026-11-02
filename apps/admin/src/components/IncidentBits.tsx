import { useState } from 'react'
import type { Prioridad } from '../types'

const PRIO_STYLE: Record<Prioridad, string> = {
  P1: 'bg-pulse text-white',
  P2: 'bg-amber text-night',
  P3: 'bg-mint text-night',
}
const PRIO_TEXT: Record<Prioridad, string> = { P1: 'Crítica', P2: 'Urgente', P3: 'Leve' }

/** Badge de prioridad grande (UC-12): P1 rojo, P2 ámbar, P3 verde. Siempre con texto, nunca solo color. */
export function PriorityBadge({ prioridad, size = 'lg' }: { prioridad: Prioridad | null; size?: 'lg' | 'sm' }) {
  if (!prioridad) return <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/60">Sin triage</span>
  return size === 'lg' ? (
    <span className={`inline-flex flex-col items-center justify-center rounded-lg px-3 py-1.5 leading-none ${PRIO_STYLE[prioridad]}`}>
      <span className="font-display text-xl font-bold">{prioridad}</span>
      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider opacity-90">{PRIO_TEXT[prioridad]}</span>
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${PRIO_STYLE[prioridad]}`}>
      {prioridad} <span className="font-semibold opacity-90">· {PRIO_TEXT[prioridad]}</span>
    </span>
  )
}

/** Foto del incidente con respaldo si no carga. */
export function IncidentPhoto({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <div className={`flex items-center justify-center bg-night-600 text-xs text-white/40 ${className}`}>Foto no disponible</div>
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} loading="lazy" className={`bg-night-600 object-cover ${className}`} />
}
