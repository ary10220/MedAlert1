import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button, TextField } from '../components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'

  if (user) return <Navigate to={from} replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-display text-4xl font-semibold tracking-tight">
          Med<span className="text-pulse">Alert</span>
        </h1>
        <p className="mb-8 text-center text-sm text-white/45">Panel de despacho hospitalario</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 rounded-xl border border-white/10 bg-white/5 p-8">
          <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@hospital.bo" required />
          <TextField label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          {error && <p role="alert" className="rounded-lg bg-pulse/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1 py-2.5">
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
          <p className="text-center text-xs text-white/35">Sin registro: las cuentas del staff las crea MedAlert. Modo demo: cualquier credencial entra.</p>
        </form>
      </div>
    </div>
  )
}
