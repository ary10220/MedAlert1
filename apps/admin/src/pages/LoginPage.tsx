// UC-11 · Login del staff hospitalario (Supabase Auth, sin registro).
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabaseConfigError } from '../lib/supabase'
import { errorMessage } from '../lib/api'
import { Button, TextField } from '../components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const status = useAuthStore((s) => s.status)
  const blocked = useAuthStore((s) => s.blocked)
  const needsPassword = useAuthStore((s) => s.needsPassword)
  const login = useAuthStore((s) => s.login)
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'

  if (status === 'ready') return <Navigate to={needsPassword ? '/set-password' : from} replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!email.includes('@') || !password) {
      setError('Ingresá tu email y contraseña.')
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const forgot = async () => {
    setError(null)
    setInfo(null)
    if (!email.includes('@')) {
      setError('Escribí tu email arriba y volvé a tocar “¿Olvidaste tu contraseña?”.')
      return
    }
    try {
      await requestPasswordReset(email.trim())
      setInfo('Si el email está registrado, te llegará un enlace para definir una nueva contraseña.')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const shownError = error ?? blocked ?? supabaseConfigError

  return (
    <div className="flex min-h-screen items-center justify-center bg-wash px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-display text-4xl font-semibold tracking-tight text-navy">
          Med<span className="text-pulse">Alert</span>
        </h1>
        <p className="mb-8 text-center text-sm text-muted">Panel de despacho hospitalario</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-8 shadow-card">
          <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@hospital.bo" required />
          <TextField label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          {shownError && <p role="alert" className="rounded-lg border border-pulse/40 bg-rose px-3 py-2 text-sm text-pulse-dark">{shownError}</p>}
          {info && <p role="status" className="rounded-lg border border-mint/40 bg-mintBg px-3 py-2 text-sm text-mint">{info}</p>}
          <Button type="submit" disabled={loading || !!supabaseConfigError || status === 'loading'} className="mt-1 py-2.5">
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
          <button type="button" onClick={forgot} className="text-center text-xs font-semibold text-muted hover:text-ink">
            ¿Olvidaste tu contraseña?
          </button>
          <p className="text-center text-xs text-muted">Sin registro: las cuentas del personal las crea el administrador de MedAlert.</p>
        </form>
      </div>
    </div>
  )
}
