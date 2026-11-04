import { useOutletContext } from 'react-router-dom'
import type { useActiveCases, useFleetQuery, useOffers } from './useHospitalData'

export type LayoutData = {
  offers: ReturnType<typeof useOffers>
  active: ReturnType<typeof useActiveCases>
  fleet: ReturnType<typeof useFleetQuery>
}

/** Ofertas, casos activos y flota que el Layout consulta una sola vez y comparte con las páginas. */
export function useLayoutData() {
  return useOutletContext<LayoutData>()
}

/** Flota del hospital (ambulancias, tipos, choferes, choferes ocupados). */
export function useFleet() {
  return useOutletContext<LayoutData>().fleet
}
