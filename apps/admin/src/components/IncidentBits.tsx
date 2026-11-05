import { useState } from 'react'
import type { Prioridad } from '../types'

// Etiquetas pedidas por el hospital: "TRIAJE" para las clasificadas por la IA
// y "PENDIENTE" para las que todavía no tienen triage.
const PRIO_STYLE: Record<Prioridad, string> = {
  P1: 'bg-pulse text-white',
  P2: 'bg-amber text-white',
  P3: 'bg-mint text-white',
}
const PRIO_LEVEL: Record<Prioridad, string> = { P1: 'Crítica', P2: 'Urgente', P3: 'Leve' }

/** Badge de triage (UC-12): muestra "TRIAJE" + nivel (crítica/urgente/leve), o "PENDIENTE" si todavía no hay. */
export function PriorityBadge({ prioridad, size = 'lg' }: { prioridad: Prioridad | null; size?: 'lg' | 'sm' }) {
  if (!prioridad) {
    return size === 'lg' ? (
      <span className="inline-flex flex-col items-center justify-center rounded-lg bg-amberBg px-3 py-1.5 leading-none text-amber ring-1 ring-inset ring-amber/30">
        <span className="font-display text-sm font-bold uppercase tracking-wider">Pendiente</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">Sin triage</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-md bg-amberBg px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber ring-1 ring-inset ring-amber/30">
        Pendiente
      </span>
    )
  }
  return size === 'lg' ? (
    <span className={`inline-flex flex-col items-center justify-center rounded-lg px-3 py-1.5 leading-none shadow-sm ${PRIO_STYLE[prioridad]}`}>
      <span className="font-display text-sm font-bold uppercase tracking-wider">Triaje</span>
      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider opacity-95">{PRIO_LEVEL[prioridad]}</span>
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${PRIO_STYLE[prioridad]}`}>
      Triaje <span className="font-semibold opacity-90">· {PRIO_LEVEL[prioridad]}</span>
    </span>
  )
}

/** Foto del incidente con respaldo si no carga. */
export function IncidentPhoto({ src, alt, className = '' }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return <div className={`flex items-center justify-center bg-line text-xs text-muted ${className}`}>{src ? 'Foto no disponible' : 'Sin foto'}</div>
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} loading="lazy" className={`bg-line object-cover ${className}`} />
}
