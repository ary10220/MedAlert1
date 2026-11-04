// UC-18 · Choferes del hospital: create-driver / update-driver. La licencia vigente es requisito para despachar.
import { useState, type FormEvent } from 'react'
import { callFunction, errorMessage } from '../../lib/api'
import { licenseValid, type Fleet } from '../../lib/queries'
import { signedUrl, uploadHospitalFile } from '../../lib/storage'
import { useAction } from '../../hooks/useAction'
import { useNow } from '../../hooks/useNow'
import { bumpData } from '../../store/refreshStore'
import { toast } from '../../store/feedbackStore'
import { Badge, Button, Card, EmptyState, ErrorBox, Modal, Table, TextField, Toggle } from '../ui'
import type { Driver } from '../../types'

interface Form {
  nombre: string
  ci: string
  telefono: string
  licencia_numero: string
  licencia_categoria: string
  licencia_vence: string
}
const EMPTY: Form = { nombre: '', ci: '', telefono: '', licencia_numero: '', licencia_categoria: '', licencia_vence: '' }
const MAX_DOC_BYTES = 5 * 1024 * 1024
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/** Payload completo que exige update-driver (todos los campos + activo). */
function driverPayload(d: Driver, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    driver_id: d.id,
    nombre: d.nombre,
    ci: d.ci,
    telefono: d.telefono,
    licencia_numero: d.licencia_numero,
    licencia_categoria: d.licencia_categoria,
    licencia_vence: d.licencia_vence,
    licencia_documento_url: d.licencia_documento_url,
    activo: d.activo,
    ...overrides,
  }
}

function LicenseBadge({ d }: { d: Driver }) {
  const now = useNow(3_600_000)
  if (!d.licencia_vence) return <Badge tone="muted">Sin fecha</Badge>
  if (!licenseValid(d, new Date(now))) return <Badge tone="pulse">Vencida</Badge>
  const days = (new Date(`${d.licencia_vence}T00:00:00`).getTime() - now) / 86_400_000
  return days <= 30 ? <Badge tone="amber">Vence pronto</Badge> : <Badge tone="mint">Vigente</Badge>
}

export default function DriversTab({ fleet, hospitalId }: { fleet: Fleet; hospitalId: string }) {
  const { run, pending } = useAction()
  const [editing, setEditing] = useState<Driver | 'new' | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const errors: Partial<Record<keyof Form | 'file', string>> = {}
  if (form.nombre.trim().length < 3) errors.nombre = 'Nombre completo'
  if (!/^\d{5,10}(-?[A-Z0-9]{1,3})?$/i.test(form.ci.trim())) errors.ci = 'CI numérico (con extensión opcional)'
  if (form.telefono && !/^\d{7,8}$/.test(form.telefono.trim())) errors.telefono = '7 u 8 dígitos'
  if (file && (file.size > MAX_DOC_BYTES || !DOC_TYPES.includes(file.type))) errors.file = 'PDF o imagen de hasta 5 MB'
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : undefined)

  const open = (d: Driver | 'new') => {
    setForm(
      d === 'new'
        ? EMPTY
        : {
            nombre: d.nombre,
            ci: d.ci,
            telefono: d.telefono ?? '',
            licencia_numero: d.licencia_numero ?? '',
            licencia_categoria: d.licencia_categoria ?? '',
            licencia_vence: d.licencia_vence ?? '',
          },
    )
    setFile(null)
    setSubmitted(false)
    setFormError(null)
    setEditing(d)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length || !editing) return
    setSaving(true)
    setFormError(null)
    try {
      const documento = file ? await uploadHospitalFile('driver-licenses', hospitalId, file) : editing === 'new' ? null : editing.licencia_documento_url
      const fields = {
        nombre: form.nombre.trim(),
        ci: form.ci.trim().toUpperCase(),
        telefono: form.telefono.trim() || null,
        licencia_numero: form.licencia_numero.trim() || null,
        licencia_categoria: form.licencia_categoria.trim().toUpperCase() || null,
        licencia_vence: form.licencia_vence || null,
        licencia_documento_url: documento,
      }
      if (editing === 'new') await callFunction('create-driver', fields)
      else await callFunction('update-driver', driverPayload(editing, fields))
      toast.success(editing === 'new' ? `Chofer ${fields.nombre} agregado.` : 'Datos del chofer guardados.')
      setEditing(null)
      bumpData()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const verDocumento = async (d: Driver) => {
    const url = await signedUrl('driver-licenses', d.licencia_documento_url)
    if (url) window.open(url, '_blank', 'noopener')
  }

  const busy = (d: Driver) => fleet.busyDriverIds.includes(d.id)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/55">Solo choferes activos, con licencia vigente y sin otro caso pueden asignarse a un despacho.</p>
        <Button onClick={() => open('new')}>+ Agregar chofer</Button>
      </div>

      <Card>
        {fleet.drivers.length === 0 ? (
          <EmptyState>No hay choferes registrados. Sin choferes no se puede despachar.</EmptyState>
        ) : (
          <Table head={['Chofer', 'Teléfono', 'Licencia', 'Vence', 'Estado', 'Activo', '']}>
            {fleet.drivers.map((d) => (
              <tr key={d.id} className={d.activo ? '' : 'opacity-55'}>
                <td className="px-5 py-3">
                  <div className="font-semibold">{d.nombre}</div>
                  <div className="text-xs text-white/45">CI {d.ci}</div>
                </td>
                <td className="whitespace-nowrap px-5 py-3 tabular-nums text-white/75">{d.telefono ?? '—'}</td>
                <td className="px-5 py-3 text-white/75">
                  {d.licencia_numero ?? '—'}
                  {d.licencia_categoria && <span className="text-white/45"> · cat. {d.licencia_categoria}</span>}
                  {d.licencia_documento_url && (
                    <button type="button" onClick={() => verDocumento(d)} className="ml-2 text-xs font-semibold underline underline-offset-2">Ver doc.</button>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2"><LicenseBadge d={d} /><span className="text-xs tabular-nums text-white/45">{d.licencia_vence ?? ''}</span></div>
                </td>
                <td className="px-5 py-3">{busy(d) ? <Badge tone="amber">En caso</Badge> : <Badge tone="neutral">Libre</Badge>}</td>
                <td className="px-5 py-3">
                  <Toggle
                    checked={d.activo}
                    disabled={pending !== null || (d.activo && busy(d))}
                    onChange={(v) => run(d.id, () => callFunction('update-driver', driverPayload(d, { activo: v })), `${d.nombre} ${v ? 'activado' : 'desactivado'}.`)}
                    label={`${d.activo ? 'Desactivar' : 'Activar'} a ${d.nombre}`}
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" className="px-2 py-1" onClick={() => open(d)}>Editar</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={editing !== null} title={editing === 'new' ? 'Nuevo chofer' : 'Editar chofer'} onClose={() => setEditing(null)}>
        <form onSubmit={save} noValidate className="flex flex-col gap-4">
          <TextField label="Nombre completo" value={form.nombre} maxLength={200} onChange={(e) => setForm({ ...form, nombre: e.target.value })} error={show('nombre')} autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="CI" value={form.ci} maxLength={30} onChange={(e) => setForm({ ...form, ci: e.target.value })} error={show('ci')} />
            <TextField label="Teléfono" inputMode="numeric" value={form.telefono} maxLength={40} onChange={(e) => setForm({ ...form, telefono: e.target.value })} error={show('telefono')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <TextField label="N.º licencia" value={form.licencia_numero} maxLength={80} onChange={(e) => setForm({ ...form, licencia_numero: e.target.value })} />
            <TextField label="Categoría" placeholder="C" value={form.licencia_categoria} maxLength={30} onChange={(e) => setForm({ ...form, licencia_categoria: e.target.value })} />
            <TextField label="Vence" type="date" value={form.licencia_vence} onChange={(e) => setForm({ ...form, licencia_vence: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="licencia-doc" className="text-xs font-medium uppercase tracking-wider text-white/60">Documento de licencia (opcional)</label>
            <input id="licencia-doc" type="file" accept={DOC_TYPES.join(',')} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
            {show('file') && <p className="text-xs text-red-300">{show('file')}</p>}
            {editing !== 'new' && editing?.licencia_documento_url && !file && <p className="text-[11px] text-white/40">Ya tiene un documento cargado; elegí otro solo si querés reemplazarlo.</p>}
          </div>
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
