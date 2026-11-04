// Definir contraseña tras la invitación de create-staff o un enlace de recuperación.
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { errorMessage } from '../lib/api'
import { Button, TextField } from '../components/ui'

export default function SetPasswordPage() {
  const status = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)
  const setPassword = useAuthStore((s) => s.setPassword)
  const navigate = useNavigate()
  const [password, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (status === 'loading') return null
  if (status !== 'ready') return <Navigate to="/login" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setSaving(true)
    try {
      await setPassword(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-display text-3xl font-semibold tracking-tight">Definí tu contraseña</h1>
        <p className="mb-8 text-center text-sm text-white/45">{profile ? `Hola, ${profile.nombre}.` : ''} La vas a usar para entrar al panel.</p>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-xl border border-white/10 bg-white/5 p-8">
          <TextField label="Nueva contraseña" type="password" autoComplete="new-password" value={password} onChange={(e) => setPw(e.target.value)} />
          <TextField label="Repetir contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p role="alert" className="rounded-lg bg-pulse/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <Button type="submit" disabled={saving} className="py-2.5">{saving ? 'Guardando…' : 'Guardar y entrar'}</Button>
        </form>
      </div>
    </div>
  )
}
