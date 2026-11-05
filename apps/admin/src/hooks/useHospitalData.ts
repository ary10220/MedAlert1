import { useAuthStore } from '../store/authStore'
import { fetchActiveCases, fetchFleet, fetchOffers } from '../lib/queries'
import { useQuery } from './useQuery'
import type { Hospital } from '../types'

const PRIO_ORDER = { P1: 0, P2: 1, P3: 2 } as const

/** Hospital del operador logueado (ProtectedRoute garantiza que existe). */
export function useHospital(): Hospital {
  return useAuthStore((s) => s.hospital)!
}

/** UC-12 · Ofertas abiertas, P1 primero y luego las más recientes. */
export function useOffers() {
  const hospital = useHospital()
  const q = useQuery(() => fetchOffers(hospital.id), [hospital.id])
  const sorted = q.data
    ? [...q.data].sort(
        (a, b) =>
          PRIO_ORDER[a.incident.prioridad ?? 'P3'] - PRIO_ORDER[b.incident.prioridad ?? 'P3'] || b.created_at.localeCompare(a.created_at),
      )
    : undefined
  return { ...q, data: sorted }
}

/** UC-16 · Casos en curso del hospital. */
export function useActiveCases() {
  const hospital = useHospital()
  return useQuery(() => fetchActiveCases(hospital.id), [hospital.id])
}

/** UC-14 / UC-18 · Flota, tipos y choferes (la consulta la hace el Layout; las páginas usan useFleet de useLayoutData). */
export function useFleetQuery() {
  const hospital = useHospital()
  return useQuery(() => fetchFleet(hospital.id), [hospital.id])
}
