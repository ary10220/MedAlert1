import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useDataStore } from '../store/dataStore'
import { usePendingAlerts } from '../hooks/useHospitalData'

/** Cada cuánto llega una alerta simulada (ficha UC-12: 15 s). */
const SIM_INTERVAL_MS = 15_000

export default function Layout() {
  const liveSim = useDataStore((s) => s.liveSim)
  const simulate = useDataStore((s) => s.simulateIncomingAlert)
  const pendientes = usePendingAlerts().length

  useEffect(() => {
    if (!liveSim) return
    const id = setInterval(simulate, SIM_INTERVAL_MS)
    return () => clearInterval(id)
  }, [liveSim, simulate])

  // Contador en la pestaña para que el operador vea alertas aunque esté en otra pestaña.
  useEffect(() => {
    document.title = pendientes > 0 ? `(${pendientes}) Alertas · MedAlert Hospital` : 'MedAlert Hospital'
  }, [pendientes])

  return (
    <div className="flex min-h-screen flex-col bg-night-800 md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
