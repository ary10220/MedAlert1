// UC-18 · Ambulancias: manage-ambulance (create/update/activate/deactivate/maintenance_on/maintenance_off).
import { useMemo, useState, type FormEvent } from 'react'
import { callFunction, errorMessage } from '../../lib/api'
import { bumpData } from '../../store/refreshStore'
import { toast } from '../../store/feedbackStore'
import type { Fleet } from '../../lib/queries'
import { useAction } from '../../hooks/useAction'
import { Badge, Button, Card, EmptyState, ErrorBox, Modal, SelectField, Table, TextField, Toggle } from '../ui'
import { ESTADO_AMBULANCIA } from '../../lib/format'
import type { Ambulance } from '../../types'

// Mismo formato que valida manage-ambulance: 3-4 dígitos + 3 letras, con o sin guion.
const PLACA_RE = /^\d{3,4}-?[A-Z]{3}$/

interface Form {
  codigo: string
  placa: string
  type_id: string
  driver_id: string
}

export default function AmbulancesTab({ fleet }: { fleet: Fleet }) {
  const { run, pending } = useAction()
  const [editing, setEditing] = useState<Ambulance | 'new' | null>(null)
  const [form, setForm] = useState<Form>({ codigo: '', placa: '', type_id: '', driver_id: '' })
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const activeTypes = fleet.types.filter((t) => t.activo)
  const activeDrivers = fleet.drivers.filter((d) => d.activo)
  const typeName = (a: Ambulance) => fleet.types.find((t) => t.id === a.type_id)?.nombre ?? '—'
  const driverName = (a: Ambulance) => fleet.drivers.find((d) => d.id === a.driver_id)?.nombre ?? 'Sin titular'

  const resumen = useMemo(() => {
    const act = fleet.ambulances.filter((a) => a.activa)
    return {
      disponible: act.filter((a) => a.estado === 'disponible').length,
      en_servicio: act.filter((a) => a.estado === 'en_servicio').length,
      mantenimiento: act.filter((a) => a.estado === 'mantenimiento').length,
    }
  }, [fleet.ambulances])

  const errors: Partial<Record<keyof Form, string>> = {}
  if (!form.codigo.trim()) errors.codigo = 'Requerido (ej. UTI-3)'
  if (!PLACA_RE.test(form.placa.trim().toUpperCase())) errors.placa = 'Formato 1234-SCZ'
  if (!form.type_id) errors.type_id = 'Elegí un tipo'
  const show = (k: keyof Form) => (submitted ? errors[k] : undefined)

  const open = (a: Ambulance | 'new') => {
    setForm(
      a === 'new'
        ? { codigo: '', placa: '', type_id: activeTypes[0]?.id ?? '', driver_id: '' }
        : { codigo: a.codigo ?? '', placa: a.placa ?? '', type_id: a.type_id ?? '', driver_id: a.driver_id ?? '' },
    )
    setSubmitted(false)
    setFormError(null)
    setEditing(a)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length || !editing) return
    setSaving(true)
    setFormError(null)
    try {
      await callFunction('manage-ambulance', {
        action: editing === 'new' ? 'create' : 'update',
        ...(editing !== 'new' && { ambulance_id: editing.id }),
        codigo: form.codigo.trim().toUpperCase(),
        placa: form.placa.trim().toUpperCase(),
        type_id: form.type_id,
        driver_id: form.driver_id || null,
      })
      toast.success(editing === 'new' ? `Ambulancia ${form.codigo.trim().toUpperCase()} agregada.` : 'Cambios guardados.')
      setEditing(null)
      bumpData()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const MSG = {
    activate: 'activada',
    deactivate: 'desactivada: ya no aparece para despachar',
    maintenance_on: 'en mantenimiento',
    maintenance_off: 'disponible otra vez',
  } as const
  const action = (a: Ambulance, act: keyof typeof MSG) =>
    run(`${a.id}:${act}`, () => callFunction('manage-ambulance', { action: act, ambulance_id: a.id }), `${a.codigo ?? a.placa} ${MSG[act]}.`)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/55">
          {resumen.disponible} disponibles · {resumen.en_servicio} en servicio · {resumen.mantenimiento} en mantenimiento
        </p>
        <Button onClick={() => open('new')} disabled={activeTypes.length === 0}>+ Agregar ambulancia</Button>
      </div>
      {activeTypes.length === 0 && <div className="mb-4"><ErrorBox message="Primero creá o activá un tipo de ambulancia en la pestaña Tipos." /></div>}

      <Card>
        {fleet.ambulances.length === 0 ? (
          <EmptyState>No hay ambulancias registradas.</EmptyState>
        ) : (
          <Table head={['Unidad', 'Placa', 'Tipo', 'Chofer titular', 'Estado', 'Mantenimiento', 'Activa', '']}>
            {fleet.ambulances.map((a) => {
              const enServicio = a.estado === 'en_servicio'
              return (
                <tr key={a.id} className={a.activa ? '' : 'opacity-55'}>
                  <td className="px-5 py-3 font-display text-base font-semibold">{a.codigo ?? '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-white/80">{a.placa ?? '—'}</td>
                  <td className="px-5 py-3">{typeName(a)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-white/80">{driverName(a)}</td>
                  <td className="px-5 py-3"><Badge tone={ESTADO_AMBULANCIA[a.estado].tone}>{ESTADO_AMBULANCIA[a.estado].label}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2" title={enServicio ? 'No se puede cambiar mientras atiende un caso' : undefined}>
                      <Toggle
                        checked={a.estado === 'mantenimiento'}
                        disabled={enServicio || !a.activa || pending !== null}
                        onChange={(v) => action(a, v ? 'maintenance_on' : 'maintenance_off')}
                        label={`Mantenimiento de ${a.codigo ?? a.placa}`}
                      />
                      {enServicio && <span className="text-[11px] text-white/40">en caso</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Toggle
                      checked={a.activa}
                      disabled={enServicio || pending !== null}
                      onChange={(v) => action(a, v ? 'activate' : 'deactivate')}
                      label={`${a.activa ? 'Desactivar' : 'Activar'} ${a.codigo ?? a.placa}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <Button variant="ghost" className="px-2 py-1" disabled={enServicio} onClick={() => open(a)}>Editar</Button>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-white/40">Las unidades no se borran: desactivarlas las saca del despacho y conserva el historial.</p>

      <Modal open={editing !== null} title={editing === 'new' ? 'Nueva ambulancia' : `Editar ${editing?.codigo ?? ''}`} onClose={() => setEditing(null)}>
        <form onSubmit={save} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Código" placeholder="UTI-3" value={form.codigo} maxLength={40} onChange={(e) => setForm({ ...form, codigo: e.target.value })} error={show('codigo')} autoFocus />
            <TextField label="Placa" placeholder="1234-SCZ" value={form.placa} maxLength={20} onChange={(e) => setForm({ ...form, placa: e.target.value })} error={show('placa')} />
          </div>
          <SelectField label="Tipo" value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })}>
            <option value="">Seleccionar…</option>
            {fleet.types.filter((t) => t.activo || t.id === form.type_id).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </SelectField>
          {show('type_id') && <p className="-mt-2 text-xs text-red-300">{show('type_id')}</p>}
          <SelectField label="Chofer titular (opcional)" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
            <option value="">Sin titular</option>
            {activeDrivers.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </SelectField>
          {formError && <ErrorBox message={formError} />}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : editing === 'new' ? 'Agregar' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
