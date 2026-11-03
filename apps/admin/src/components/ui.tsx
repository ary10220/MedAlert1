import { useEffect, useId, useRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import type { Tone } from '../lib/format'

const TONE: Record<Tone, string> = {
  pulse: 'bg-pulse/15 text-red-200 ring-pulse/40',
  amber: 'bg-amber/15 text-amber-100 ring-amber/40',
  mint: 'bg-mint/15 text-emerald-100 ring-mint/40',
  sky: 'bg-sky-400/15 text-sky-100 ring-sky-400/40',
  neutral: 'bg-white/10 text-white/80 ring-white/20',
  muted: 'bg-white/5 text-white/50 ring-white/10',
}
const DOT: Record<Tone, string> = {
  pulse: 'bg-pulse', amber: 'bg-amber', mint: 'bg-mint', sky: 'bg-sky-400', neutral: 'bg-white/60', muted: 'bg-white/30',
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-white/10 bg-night-700 ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <h2 className="text-sm font-semibold text-white/90">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: ReactNode; accent?: Tone }) {
  return (
    <div className="rounded-xl border border-white/10 bg-night-700 px-5 py-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/50">
        {accent && <span className={`h-2 w-2 rounded-full ${DOT[accent]}`} aria-hidden />}
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-white/45">{hint}</div>}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const BTN: Record<ButtonVariant, string> = {
  primary: 'bg-pulse text-white hover:bg-pulse-dark',
  secondary: 'bg-white/10 text-white hover:bg-white/15',
  ghost: 'text-white/60 hover:bg-white/5 hover:text-white',
  danger: 'bg-transparent text-red-300 ring-1 ring-inset ring-pulse/50 hover:bg-pulse/10',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
    />
  )
}

const FIELD = 'w-full rounded-lg border border-white/10 bg-night-800 px-3 py-2 text-sm text-white placeholder-white/25 transition-colors focus:border-pulse/60 focus:outline-none'

export function TextField({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-white/60">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} className={`${FIELD} ${error ? 'border-pulse/70' : ''}`} />
      {error && <p id={`${id}-err`} className="text-xs text-red-300">{error}</p>}
    </div>
  )
}

export function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-white/60">{label}</label>
      <select id={id} {...props} className={FIELD}>{children}</select>
    </div>
  )
}

/** Filtro compacto para barras de filtros (label visible pequeño). */
export function FilterSelect({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-white/50">{label}</label>
      <select id={id} {...props} className="rounded-lg border border-white/10 bg-night-700 px-2.5 py-1.5 text-sm text-white focus:border-pulse/60 focus:outline-none">
        {children}
      </select>
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-mint' : 'bg-white/15'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

/** Modal sobre <dialog> nativo: foco atrapado y Escape gratis. */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-night-700 p-0 text-white backdrop:bg-black/60"
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white">✕</button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-white/40">{children}</div>
}

/** Tabla base con encabezados consistentes. */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            {head.map((h, i) => <th key={i} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  )
}
