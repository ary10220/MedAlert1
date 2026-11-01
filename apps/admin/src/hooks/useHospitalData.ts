import { useMemo } from 'react'
import { useDataStore } from '../store/dataStore'
import { RADIO_ALERTAS_KM, distanceToHospital } from '../lib/hospital'

const PRIO_ORDER = { P1: 0, P2: 1, P3: 2 } as const

/** Alertas entrantes para este hospital: buscando ambulancia, dentro del radio y no rechazadas. P1 primero. */
export function usePendingAlerts() {
  const { incidents, hospital, rejectedIds } = useDataStore()
  return useMemo(
    () =>
      incidents
        .filter((i) => i.estado === 'searching' && !rejectedIds.includes(i.id) && distanceToHospital(i, hospital) <= RADIO_ALERTAS_KM)
        .sort((a, b) => PRIO_ORDER[a.prioridad ?? 'P3'] - PRIO_ORDER[b.prioridad ?? 'P3'] || b.created_at.localeCompare(a.created_at)),
    [incidents, hospital, rejectedIds],
  )
}

/** Casos que este hospital está atendiendo ahora (en ruta o en el lugar). */
export function useActiveCases() {
  const { incidents, hospital } = useDataStore()
  return useMemo(
    () =>
      incidents
        .filter((i) => i.assigned_hospital_id === hospital.id && (i.estado === 'assigned' || i.estado === 'on_site'))
        .sort((a, b) => (a.assigned_at ?? '').localeCompare(b.assigned_at ?? '')),
    [incidents, hospital],
  )
}
