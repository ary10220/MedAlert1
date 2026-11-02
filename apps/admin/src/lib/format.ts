import type { EstadoAmbulancia, EstadoIncidente, Prioridad, Tier, TipoAmbulancia } from '../types'

export const ESTADO_INCIDENTE: Record<EstadoIncidente, { label: string; tone: Tone }> = {
  open: { label: 'Reportado', tone: 'pulse' },
  searching: { label: 'Nueva alerta', tone: 'amber' },
  assigned: { label: 'En ruta', tone: 'mint' },
  on_site: { label: 'En el lugar', tone: 'sky' },
  completed: { label: 'Completado', tone: 'neutral' },
  cancelled: { label: 'Cancelado', tone: 'muted' },
}

export const ESTADOS_ACTIVOS: EstadoIncidente[] = ['open', 'searching', 'assigned', 'on_site']

export const PRIORIDAD: Record<Prioridad, { label: string; tone: Tone }> = {
  P1: { label: 'P1 · Crítica', tone: 'pulse' },
  P2: { label: 'P2 · Urgente', tone: 'amber' },
  P3: { label: 'P3 · Leve', tone: 'mint' },
}

export const TIPO_AMBULANCIA: Record<TipoAmbulancia, string> = { uti: 'UTI', avanzada: 'Avanzada', basica: 'Básica' }

export const ESTADO_AMBULANCIA: Record<EstadoAmbulancia, { label: string; tone: Tone }> = {
  disponible: { label: 'Disponible', tone: 'mint' },
  en_servicio: { label: 'En servicio', tone: 'amber' },
  mantenimiento: { label: 'Mantenimiento', tone: 'muted' },
}

export const TIER: Record<Tier, string> = { basic: 'Basic', premium: 'Premium' }

export type Tone = 'pulse' | 'amber' | 'mint' | 'sky' | 'neutral' | 'muted'

const dateFmt = new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' })

export const fmtDate = (iso: string) => dateFmt.format(new Date(iso))
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso))
export const fmtDateTime = (iso: string) => `${fmtDate(iso)} · ${fmtTime(iso)}`

export function fmtAgo(iso: string, now = Date.now()): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

/** Minutos entre dos timestamps ISO, o null si falta alguno. */
export function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  return (new Date(to).getTime() - new Date(from).getTime()) / 60_000
}

export const fmtMinutes = (m: number | null) => (m == null ? '—' : `${m.toFixed(1)} min`)

export function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}
