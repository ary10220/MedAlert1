import type { Hospital, Incident } from '../types'
import { distanceKm } from './geo'

/** Radio de búsqueda de alertas (mismo default que find_hospitals_in_radius). */
export const RADIO_ALERTAS_KM = 5

export const distanceToHospital = (i: Pick<Incident, 'lat' | 'lon'>, h: Hospital) => distanceKm(i.lat, i.lon, h.lat, h.lon)

/**
 * ETA estimada en minutos: distancia en línea recta × 1.4 (factor de calles)
 * a 40 km/h promedio urbano con sirena, + 1 min de salida.
 */
export const etaMinutes = (km: number) => Math.max(2, Math.round(1 + ((km * 1.4) / 40) * 60))

export const fmtKm = (km: number) => `${km.toFixed(1)} km`

/** Duración total del caso (reporte → cierre), en minutos. */
export function totalMinutes(i: Incident): number | null {
  if (!i.completed_at) return null
  return (new Date(i.completed_at).getTime() - new Date(i.created_at).getTime()) / 60_000
}

export function fmtDuration(mins: number | null): string {
  if (mins == null) return '—'
  if (mins < 60) return `${Math.round(mins)} min`
  return `${Math.floor(mins / 60)} h ${Math.round(mins % 60)} min`
}
