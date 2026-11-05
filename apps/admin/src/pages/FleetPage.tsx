// UC-18 · Flota del hospital: ambulancias, choferes y tipos.
import { useSearchParams } from 'react-router-dom'
import { useHospital } from '../hooks/useHospitalData'
import { useFleet } from '../hooks/useLayoutData'
import { Card, ErrorBox, PageHeader, Spinner } from '../components/ui'
import AmbulancesTab from '../components/fleet/AmbulancesTab'
import DriversTab from '../components/fleet/DriversTab'
import TypesTab from '../components/fleet/TypesTab'

const TABS = [
  { id: 'ambulancias', label: 'Ambulancias' },
  { id: 'choferes', label: 'Choferes' },
  { id: 'tipos', label: 'Tipos' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function FleetPage() {
  const hospital = useHospital()
  const fleet = useFleet()
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as Tab) : 'ambulancias'

  return (
    <>
      <PageHeader title="Flota" subtitle={hospital.nombre} />
      <div role="tablist" aria-label="Secciones de flota" className="mb-5 inline-flex rounded-lg border border-line bg-surface p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams(t.id === 'ambulancias' ? {} : { tab: t.id }, { replace: true })}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-wash text-ink' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {fleet.error && <div className="mb-4"><ErrorBox message={fleet.error} onRetry={fleet.refetch} /></div>}
      {!fleet.data ? (
        fleet.loading ? <Card><Spinner label="Cargando flota…" /></Card> : null
      ) : tab === 'ambulancias' ? (
        <AmbulancesTab fleet={fleet.data} />
      ) : tab === 'choferes' ? (
        <DriversTab fleet={fleet.data} hospitalId={hospital.id} />
      ) : (
        <TypesTab fleet={fleet.data} />
      )}
    </>
  )
}
