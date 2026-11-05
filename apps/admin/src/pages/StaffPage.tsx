// NUEVO · Personal de turno: toggle propio, lista de turnos abiertos del hospital y
// formulario para invitar personal nuevo (create-staff, solo para admins MedAlert).
import { useMemo, useState, type FormEvent } from 'react'
import { useHospital } from '../hooks/useHospitalData'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '../hooks/useQuery'
import { fetchOnDuty } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { ApiError, callFunction, errorMessage } from '../lib/api'
import { toast } from '../store/feedbackStore'
import { Button, Card, EmptyState, ErrorBox, PageHeader, Spinner, TextField, Toggle } from '../components/ui'
import Icon from '../components/Icon'
import { fmtDateTime } from '../lib/format'

interface ShiftRow {
  id: string
  staff_id: string
  started_at: string
  registered_by: string | null
}

/** Turnos abiertos del hospital (staff_shifts sin ended_at). */
async function fetchOpenShifts(hospitalId: string): Promise<ShiftRow[]> {
  const { data, error } = await supabase
    .from('staff_shifts')
    .select('id,staff_id,started_at,registered_by')
    .eq('hospital_id', hospitalId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShiftRow[]
}

function MiniAvatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '·'
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
      {initials}
    </span>
  )
}

export default function StaffPage() {
  const hospital = useHospital()
  const profile = useAuthStore((s) => s.profile)!

  const dutySelf = useQuery(() => fetchOnDuty(profile.id), [profile.id], { live: false })
  const shifts = useQuery(() => fetchOpenShifts(hospital.id), [hospital.id])
  const [savingDuty, setSavingDuty] = useState(false)
  const [invite, setInvite] = useState({ nombre: '', email: '', ci: '', telefono: '' })
  const [submitted, setSubmitted] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const errors: Partial<Record<keyof typeof invite, string>> = {}
  if (invite.nombre.trim().length < 3) errors.nombre = 'Nombre completo'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email.trim())) errors.email = 'Email del hospital'
  if (invite.ci.trim().length < 3) errors.ci = 'CI (al menos 3 caracteres)'
  if (!/^\d{7,8}$/.test(invite.telefono.trim())) errors.telefono = '7 u 8 dígitos'
  const show = (k: keyof typeof invite) => (submitted ? errors[k] : undefined)

  const toggleDuty = async (on: boolean) => {
    setSavingDuty(true)
    try {
      await callFunction('set-duty', { on_duty: on })
      dutySelf.refetch()
      shifts.refetch()
      toast.success(on ? 'Turno iniciado.' : 'Turno terminado.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSavingDuty(false)
    }
  }

  const invitar = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) return
    setInviting(true)
    setInviteError(null)
    try {
      await callFunction('create-staff', {
        hospital_id: hospital.id,
        email: invite.email.trim(),
        nombre: invite.nombre.trim(),
        ci: invite.ci.trim(),
        telefono: invite.telefono.trim(),
      })
      toast.success(`Invitación enviada a ${invite.email}. Al abrir el enlace, el usuario definirá su contraseña.`)
      setInvite({ nombre: '', email: '', ci: '', telefono: '' })
      setSubmitted(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      if (code === 'forbidden' || code === 'Forbidden') {
        setInviteError('Solo el administrador de MedAlert puede crear cuentas nuevas. Envía estos datos al equipo MedAlert para que te genere la invitación.')
      } else {
        setInviteError(errorMessage(err))
      }
    } finally {
      setInviting(false)
    }
  }

  const abiertos = shifts.data ?? []
  const soyUnoDeLosAbiertos = useMemo(() => abiertos.some((s) => s.staff_id === profile.id), [abiertos, profile.id])

  return (
    <>
      <PageHeader title="Personal de turno" subtitle={`Gestioná quién está en turno en ${hospital.nombre}. Solo el personal en turno recibe los avisos de alertas.`} />

      {/* Turno propio: el toggle grande que importa en el día a día. */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <MiniAvatar name={profile.nombre} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">{profile.nombre}</div>
            <div className="text-xs text-muted">{profile.telefono ? `tel. ${profile.telefono}` : 'sin teléfono registrado'}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs">
              {dutySelf.data ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-mintBg px-2 py-0.5 font-semibold text-mint ring-1 ring-inset ring-mint/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" /> En turno
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-wash px-2 py-0.5 font-semibold text-muted ring-1 ring-inset ring-line">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted" /> Fuera de turno
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink">{dutySelf.data ? 'Terminar turno' : 'Iniciar turno'}</span>
            <Toggle checked={dutySelf.data ?? false} disabled={dutySelf.data === undefined || savingDuty} onChange={toggleDuty} label="Mi turno" />
          </div>
        </div>
      </Card>

      {/* Lista de turnos abiertos del hospital. */}
      <Card title={`Personal en turno ahora · ${abiertos.length}`} className="mb-5">
        {shifts.error && <div className="p-4"><ErrorBox message={shifts.error} onRetry={shifts.refetch} /></div>}
        {!shifts.data ? (
          shifts.loading ? <Spinner label="Cargando turnos…" /> : null
        ) : abiertos.length === 0 ? (
          <EmptyState icon="users" title="Nadie está en turno todavía">
            Iniciá tu turno con el botón de arriba para empezar a recibir alertas.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/60">
            {abiertos.map((s) => {
              const soyYo = s.staff_id === profile.id
              return (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <MiniAvatar name={soyYo ? profile.nombre : 'Personal'} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">
                      {soyYo ? `${profile.nombre} (yo)` : 'Compañero del hospital'}
                      {!soyYo && <span className="ml-2 font-mono text-[11px] font-normal text-muted">#{s.staff_id.slice(0, 8)}</span>}
                    </div>
                    <div className="text-xs text-muted">Desde {fmtDateTime(s.started_at)}</div>
                  </div>
                  <span className="rounded-full bg-mintBg px-2 py-0.5 text-xs font-semibold text-mint ring-1 ring-inset ring-mint/30">En turno</span>
                </li>
              )
            })}
          </ul>
        )}
        {soyUnoDeLosAbiertos && abiertos.length === 1 && (
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Sos la única persona en turno ahora mismo. Si tenés compañeros, pedíles que inicien su turno para repartir las alertas.
          </p>
        )}
      </Card>

      {/* Alta de nuevo personal (create-staff, requiere rol admin). */}
      <Card title="Invitar nuevo personal">
        <form onSubmit={invitar} noValidate className="flex flex-col gap-4 p-5">
          <p className="text-sm text-muted">
            La persona recibirá un email para definir su contraseña y entrar al panel. Los datos quedan vinculados a <strong className="text-ink">{hospital.nombre}</strong>.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Nombre completo" value={invite.nombre} maxLength={200} onChange={(e) => setInvite({ ...invite, nombre: e.target.value })} error={show('nombre')} placeholder="Dr. Ana Pérez" />
            <TextField label="Email" type="email" value={invite.email} maxLength={320} onChange={(e) => setInvite({ ...invite, email: e.target.value })} error={show('email')} placeholder="ana@hospital.bo" />
            <TextField label="CI" value={invite.ci} maxLength={30} onChange={(e) => setInvite({ ...invite, ci: e.target.value })} error={show('ci')} placeholder="1234567-SC" />
            <TextField label="Teléfono" inputMode="numeric" value={invite.telefono} maxLength={40} onChange={(e) => setInvite({ ...invite, telefono: e.target.value })} error={show('telefono')} placeholder="70000000" />
          </div>
          {inviteError && <ErrorBox message={inviteError} />}
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={inviting}>
              {inviting ? (
                'Enviando…'
              ) : (
                <>
                  <Icon name="plus" className="h-4 w-4" /> Enviar invitación
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
