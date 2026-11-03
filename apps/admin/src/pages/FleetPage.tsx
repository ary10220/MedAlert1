// UC-18 · Flota del hospital: CRUD de ambulancias + toggle de mantenimiento.
import { useMemo, useState, type FormEvent } from 'react'
import { useDataStore, type AmbulanceInput } from '../store/dataStore'
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SelectField, Table, TextField, Toggle } from '../components/ui'
import { ESTADO_AMBULANCIA, TIPO_AMBULANCIA } from '../lib/format'
import type { Ambulance, TipoAmbulancia } from '../types'

const EMPTY: AmbulanceInput = { codigo: '', placa: '', tipo: 'avanzada', chofer: '' }
// Placas bolivianas: 3-4 dígitos + 3 letras (con o sin guion), p. ej. 1234-SCZ o 4321ABC.
const PLACA_RE = /^\d{3,4}-?[A-Z]{3}$/

export default function FleetPage() {
  const { ambulances, createAmbulance, updateAmbulance, deleteAmbulance, setMaintenance } = useDataStore()
  const [editing, setEditing] = useState<Ambulance | 'new' | null>(null)
  const [form, setForm] = useState<AmbulanceInput>(EMPTY)
  const [submitted, setSubmitted] = useState(false)

  const resumen = useMemo(
    () => ({
      disponible: ambulances.filter((a) => a.estado === 'disponible').length,
      en_servicio: ambulances.filter((a) => a.estado === 'en_servicio').length,
      mantenimiento: ambulances.filter((a) => a.estado === 'mantenimiento').length,
    }),
    [ambulances],
  )

  const errors = useMemo(() => {
    const e: Partial<Record<keyof AmbulanceInput, string>> = {}
    const others = ambulances.filter((a) => editing === 'new' || a.id !== editing?.id)
    if (!form.codigo.trim()) e.codigo = 'Requerido (ej. UTI-3)'
    else if (others.some((a) => a.codigo.toUpperCase() === form.codigo.trim().toUpperCase())) e.codigo = 'Ya existe una unidad con este código'
    if (!PLACA_RE.test(form.placa.trim().toUpperCase())) e.placa = 'Formato 1234-SCZ'
    else if (others.some((a) => a.placa === form.placa.trim().toUpperCase())) e.placa = 'Placa ya registrada'
    if (form.chofer.trim().length < 2) e.chofer = 'Nombre del chofer titular'
    return e
  }, [form, ambulances, editing])
  const showError = (k: keyof AmbulanceInput) => (submitted ? errors[k] : undefined)

  const open = (a: Ambulance | 'new') => {
    setForm(a === 'new' ? EMPTY : { codigo: a.codigo, placa: a.placa, tipo: a.tipo, chofer: a.chofer })
    setSubmitted(false)
    setEditing(a)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) return
    const input: AmbulanceInput = {
      codigo: form.codigo.trim().toUpperCase(),
      placa: form.placa.trim().toUpperCase(),
      tipo: form.tipo,
      chofer: form.chofer.trim(),
    }
    if (editing === 'new') createAmbulance(input)
    else if (editing) updateAmbulance(editing.id, input)
    setEditing(null)
  }

  const eliminar = (a: Ambulance) => {
    if (confirm(`¿Eliminar la unidad ${a.codigo} (${a.placa}) de la flota?`)) deleteAmbulance(a.id)
  }

  return (
    <>
      <PageHeader
        title="Flota"
        subtitle={`${resumen.disponible} disponibles · ${resumen.en_servicio} en servicio · ${resumen.mantenimiento} en mantenimiento`}
        action={<Button onClick={() => open('new')} aria-label="Agregar ambulancia">+ Agregar ambulancia</Button>}
      />

      <Card>
        {ambulances.length === 0 ? (
          <EmptyState>No hay ambulancias registradas.</EmptyState>
        ) : (
          <Table head={['Unidad', 'Placa', 'Tipo', 'Chofer titular', 'Estado', 'Mantenimiento', '']}>
            {ambulances.map((a) => {
              const enServicio = a.estado === 'en_servicio'
              return (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-display text-base font-semibold">{a.codigo}</td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-white/80">{a.placa}</td>
                  <td className="px-5 py-3">{TIPO_AMBULANCIA[a.tipo]}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-white/80">{a.chofer}</td>
                  <td className="px-5 py-3"><Badge tone={ESTADO_AMBULANCIA[a.estado].tone}>{ESTADO_AMBULANCIA[a.estado].label}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2" title={enServicio ? 'No se puede pasar a mantenimiento mientras atiende un caso' : undefined}>
                      <Toggle
                        checked={a.estado === 'mantenimiento'}
                        onChange={(v) => setMaintenance(a.id, v)}
                        disabled={enServicio}
                        label={`Mantenimiento de ${a.codigo}`}
                      />
                      {enServicio && <span className="text-[11px] text-white/40">en caso</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <Button variant="ghost" className="px-2 py-1" onClick={() => open(a)}>Editar</Button>
                    <Button variant="ghost" className="px-2 py-1 hover:text-red-300" disabled={enServicio} onClick={() => eliminar(a)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      <Modal open={editing !== null} title={editing === 'new' ? 'Nueva ambulancia' : `Editar ${editing?.codigo ?? ''}`} onClose={() => setEditing(null)}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Código" placeholder="UTI-3" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} error={showError('codigo')} autoFocus />
            <TextField label="Placa" placeholder="1234-SCZ" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} error={showError('placa')} />
          </div>
          <SelectField label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoAmbulancia })}>
            <option value="uti">UTI</option>
            <option value="avanzada">Avanzada</option>
            <option value="basica">Básica</option>
          </SelectField>
          <TextField label="Chofer titular" placeholder="Lic. Rojas" value={form.chofer} onChange={(e) => setForm({ ...form, chofer: e.target.value })} error={showError('chofer')} />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit">{editing === 'new' ? 'Agregar' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
