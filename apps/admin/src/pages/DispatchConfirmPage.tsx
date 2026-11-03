// UC-15 · Confirmación de despacho: transición de 2 s y luego el check con unidad, chofer y ETA.
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { distanceToHospital, etaMinutes } from '../lib/hospital'
import { TIPO_AMBULANCIA } from '../lib/format'

export default function DispatchConfirmPage() {
  const { id } = useParams()
  const { incidents, ambulances, hospital } = useDataStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2000)
    return () => clearTimeout(t)
  }, [])

  const incident = incidents.find((i) => i.id === id)
  const ambulance = ambulances.find((a) => a.id === incident?.assigned_ambulance_id)
  if (!incident || !ambulance) return <Navigate to="/" replace />

  const eta = etaMinutes(distanceToHospital(incident, hospital))

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md text-center" role="status" aria-live="polite">
        {!ready ? (
          <>
            <div className="mx-auto h-20 w-20 animate-spin rounded-full border-4 border-white/10 border-t-pulse" aria-hidden />
            <p className="mt-6 text-lg font-semibold">Despachando {ambulance.codigo}…</p>
            <p className="mt-1 text-sm text-white/50">Notificando al chofer y al testigo</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-mint/15 ring-2 ring-mint" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-mint" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <h1 className="mt-6 font-display text-3xl font-semibold">Ambulancia {ambulance.codigo} despachada</h1>
            <dl className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border border-white/10 bg-night-700 px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-white/45">Chofer</dt>
                <dd className="mt-1 font-semibold">{ambulance.chofer}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-night-700 px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-white/45">ETA</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{eta} min</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-white/50">
              {TIPO_AMBULANCIA[ambulance.tipo]} · {ambulance.placa} → {incident.referencia}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to={`/active#${incident.id}`} className="rounded-lg bg-pulse px-6 py-3 text-sm font-bold text-white hover:bg-pulse-dark">
                Ver seguimiento
              </Link>
              <Link to="/" className="rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Volver al dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
