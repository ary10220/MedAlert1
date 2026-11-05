// Modales de acciones sobre un incidente: rechazar oferta y reportar falsa alarma.
import { useState, type FormEvent } from 'react'
import { callFunction, errorMessage } from '../lib/api'
import { bumpData } from '../store/refreshStore'
import { Button, ErrorBox, Modal, SelectField, TextArea } from './ui'

const MOTIVOS_RECHAZO = [
  { value: 'no_capacity', label: 'Sin unidades o capacidad disponible' },
  { value: 'out_of_coverage', label: 'Fuera de nuestra zona de cobertura' },
  { value: 'specialty_unavailable', label: 'No contamos con la especialidad requerida' },
  { value: 'other', label: 'Otro motivo' },
]

/** reject-offer: cierra solo la oferta de este hospital; el backend busca otros hospitales si no quedan. */
export function RejectOfferModal({ incidentId, open, onClose, onDone }: { incidentId: string; open: boolean; onClose: () => void; onDone: () => void }) {
  const [motivo, setMotivo] = useState('no_capacity')
  const [detalle, setDetalle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const reason = motivo === 'other' ? detalle.trim() || 'other' : detalle.trim() ? `${motivo}: ${detalle.trim()}` : motivo
      await callFunction('reject-offer', { incident_id: incidentId, reason })
      bumpData()
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Rechazar alerta" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-muted">La alerta se ofrecerá a otros hospitales cercanos. Tu hospital ya no la verá.</p>
        <SelectField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          {MOTIVOS_RECHAZO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </SelectField>
        <TextArea label={motivo === 'other' ? 'Detalle (obligatorio)' : 'Detalle (opcional)'} value={detalle} maxLength={400} onChange={(e) => setDetalle(e.target.value)} />
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || (motivo === 'other' && !detalle.trim())}>{saving ? 'Rechazando…' : 'Rechazar alerta'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * report-false-alarm: queda como sospecha para revisión del admin (no suma al historial del testigo
 * hasta que el admin la confirme). Desde una oferta la rechaza; desde un caso asignado cancela el despacho.
 */
export function FalseAlarmModal({ incidentId, assigned, open, onClose, onDone }: { incidentId: string; assigned: boolean; open: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (reason.trim().length < 10) return setError('Describí brevemente por qué parece falsa alarma (mínimo 10 caracteres).')
    setSaving(true)
    setError(null)
    try {
      await callFunction('report-false-alarm', { incident_id: incidentId, reason: reason.trim() })
      bumpData()
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Reportar posible falsa alarma" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {assigned
            ? 'Se cancelará el despacho y la ambulancia quedará disponible.'
            : 'Se rechazará la alerta para tu hospital.'}{' '}
          Un administrador de MedAlert revisará el reporte antes de tomar cualquier medida con el testigo.
        </p>
        <TextArea label="Motivo" value={reason} maxLength={1000} placeholder="Ej.: la foto es de una escena antigua; en el lugar no había ningún accidente." onChange={(e) => setReason(e.target.value)} />
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="danger" disabled={saving}>{saving ? 'Enviando…' : 'Reportar falsa alarma'}</Button>
        </div>
      </form>
    </Modal>
  )
}
