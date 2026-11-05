// UC-18 · Tipos de ambulancia configurables por hospital (manage-ambulance-type).
// Cada tipo conserva una categoría base (básica/avanzada/UTI) que usa la IA para recomendar.
import { useState, type FormEvent } from 'react'
import { callFunction, errorMessage } from '../../lib/api'
import type { Fleet } from '../../lib/queries'
import { useAction } from '../../hooks/useAction'
import { bumpData } from '../../store/refreshStore'
import { toast } from '../../store/feedbackStore'
import { Button, Card, EmptyState, ErrorBox, Modal, SelectField, Table, TextField, Toggle } from '../ui'
import { TIPO_AMBULANCIA } from '../../lib/format'
import type { AmbulanceType, BaseTipo } from '../../types'

export default function TypesTab({ fleet }: { fleet: Fleet }) {
  const { run, pending } = useAction()
  const [editing, setEditing] = useState<AmbulanceType | 'new' | null>(null)
  const [nombre, setNombre] = useState('')
  const [base, setBase] = useState<BaseTipo>('avanzada')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const inUse = (t: AmbulanceType) => fleet.ambulances.some((a) => a.type_id === t.id && a.activa)

  const open = (t: AmbulanceType | 'new') => {
    setNombre(t === 'new' ? '' : t.nombre)
    setBase(t === 'new' ? 'avanzada' : t.base_tipo)
    setFormError(null)
    setEditing(t)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (nombre.trim().length < 2) return setFormError('Escribí un nombre (mínimo 2 caracteres).')
    setSaving(true)
    setFormError(null)
    try {
      if (editing === 'new') await callFunction('manage-ambulance-type', { action: 'create', nombre: nombre.trim(), base_tipo: base })
      else await callFunction('manage-ambulance-type', { action: 'rename', type_id: editing.id, nombre: nombre.trim() })
      toast.success(editing === 'new' ? `Tipo “${nombre.trim()}” creado.` : 'Tipo renombrado.')
      setEditing(null)
      bumpData()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Nombrá los tipos como los usa tu hospital. La categoría base no se puede cambiar después.</p>
        <Button onClick={() => open('new')}>+ Agregar tipo</Button>
      </div>
      <Card>
        {fleet.types.length === 0 ? (
          <EmptyState>No hay tipos configurados.</EmptyState>
        ) : (
          <Table head={['Nombre', 'Categoría base', 'Unidades activas', 'Activo', '']}>
            {fleet.types.map((t) => {
              const n = fleet.ambulances.filter((a) => a.type_id === t.id && a.activa).length
              return (
                <tr key={t.id} className={t.activo ? '' : 'opacity-55'}>
                  <td className="px-5 py-3 font-semibold">{t.nombre}</td>
                  <td className="px-5 py-3 text-ink/80">{TIPO_AMBULANCIA[t.base_tipo]}</td>
                  <td className="px-5 py-3 tabular-nums">{n}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2" title={t.activo && inUse(t) ? 'En uso por ambulancias activas' : undefined}>
                      <Toggle
                        checked={t.activo}
                        disabled={pending !== null || (t.activo && inUse(t))}
                        onChange={(v) => run(t.id, () => callFunction('manage-ambulance-type', { action: v ? 'activate' : 'deactivate', type_id: t.id }), `Tipo ${t.nombre} ${v ? 'activado' : 'desactivado'}.`)}
                        label={`${t.activo ? 'Desactivar' : 'Activar'} tipo ${t.nombre}`}
                      />
                      {t.activo && inUse(t) && <span className="text-[11px] text-muted">en uso</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" className="px-2 py-1" onClick={() => open(t)}>Renombrar</Button>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      <Modal open={editing !== null} title={editing === 'new' ? 'Nuevo tipo de ambulancia' : 'Renombrar tipo'} onClose={() => setEditing(null)}>
        <form onSubmit={save} noValidate className="flex flex-col gap-4">
          <TextField label="Nombre" placeholder="UTI pediátrica" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} autoFocus />
          <SelectField label="Categoría base" value={base} disabled={editing !== 'new'} onChange={(e) => setBase(e.target.value as BaseTipo)}>
            <option value="basica">Básica</option>
            <option value="avanzada">Avanzada</option>
            <option value="uti">UTI</option>
          </SelectField>
          {formError && <ErrorBox message={formError} />}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : editing === 'new' ? 'Agregar' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
