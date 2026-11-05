// Recomendación de despacho compartida por el detalle (despacho en un clic) y la selección de unidad.
import { licenseValid, type Fleet } from './queries'
import type { Ambulance, BaseTipo, Driver } from '../types'

const TIPO_RANK: Record<BaseTipo, number> = { uti: 3, avanzada: 2, basica: 1 }

/** Chofer asignable: activo, licencia vigente y sin otro caso en curso (mismas reglas que accept_incident_atomic). */
export function driverAvailable(d: Driver, fleet: Fleet): boolean {
  return d.activo && licenseValid(d) && !fleet.busyDriverIds.includes(d.id)
}

export function availableDrivers(fleet: Fleet): Driver[] {
  return fleet.drivers.filter((d) => driverAvailable(d, fleet))
}

/** Primera unidad disponible del tipo sugerido por la IA; si no hay, la disponible de mayor nivel. */
export function recommendUnit(fleet: Fleet, suggested: BaseTipo | null): Ambulance | undefined {
  const libres = fleet.ambulances.filter((a) => a.activa && a.estado === 'disponible')
  return (
    libres.find((a) => a.tipo === suggested) ??
    [...libres].sort((a, b) => (b.tipo ? TIPO_RANK[b.tipo] : 0) - (a.tipo ? TIPO_RANK[a.tipo] : 0))[0]
  )
}

/** Chofer por defecto para una unidad: su titular si está libre; si no, el primer chofer disponible. */
export function defaultDriver(fleet: Fleet, ambulance: Ambulance | undefined): Driver | undefined {
  if (!ambulance) return undefined
  const libres = availableDrivers(fleet)
  return libres.find((d) => d.id === ambulance.driver_id) ?? libres[0]
}

/** ¿La unidad cumple la sugerencia de la IA? (para avisar si se despacha una de menor nivel). */
export function matchesSuggestion(a: Ambulance, suggested: BaseTipo | null): boolean {
  if (!suggested || !a.tipo) return true
  return TIPO_RANK[a.tipo] >= TIPO_RANK[suggested]
}
