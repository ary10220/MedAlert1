import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Dashboard' },
  { to: '/hospitals', label: 'Hospitales' },
  { to: '/staff', label: 'Staff' },
  { to: '/incidents', label: 'Incidentes' },
  { to: '/metrics', label: 'Métricas' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-[#0C1420] flex flex-col py-8 px-4">
      <div className="text-white font-bold text-xl mb-10 px-2 tracking-tight">
        Med<span className="text-[#E63946]">Alert</span>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
