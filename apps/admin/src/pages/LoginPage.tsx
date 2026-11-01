import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // auth logic coming soon
  }

  return (
    <div className="min-h-screen bg-[#0C1420] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold mb-2 text-center tracking-tight">
          Med<span className="text-[#E63946]">Alert</span>
        </h1>
        <p className="text-white/40 text-sm text-center mb-8">Panel de administración</p>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@medalert.bo"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#E63946]/60 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#E63946]/60 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            className="bg-[#E63946] hover:bg-[#c62f3b] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}
