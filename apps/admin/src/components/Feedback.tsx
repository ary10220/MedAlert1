// Contenedores de avisos (toasts) y del diálogo de confirmación. Se montan una sola vez en App.
import { useFeedback, type ToastTone } from '../store/feedbackStore'
import { Button, Modal } from './ui'
import Icon from './Icon'

const TOAST_STYLE: Record<ToastTone, string> = {
  success: 'border-mint/50 bg-[#123228] text-emerald-50',
  error: 'border-pulse/60 bg-[#3a1418] text-red-50',
  info: 'border-white/15 bg-night-600 text-white',
}
const TOAST_ICON = { success: 'check', error: 'alert', info: 'info' } as const

export function Toaster() {
  const toasts = useFeedback((s) => s.toasts)
  const dismiss = useFeedback((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[1000] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${TOAST_STYLE[t.tone]}`}
        >
          <Icon name={TOAST_ICON[t.tone]} className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span className="flex-1">{t.text}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="-m-1 rounded p-1 opacity-60 hover:opacity-100">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function ConfirmHost() {
  const req = useFeedback((s) => s.confirm)
  const answer = useFeedback((s) => s.answer)
  return (
    <Modal open={!!req} title={req?.title ?? ''} onClose={() => answer(false)}>
      {req && (
        <div className="flex flex-col gap-5">
          {req.body && <p className="text-sm leading-relaxed text-white/70">{req.body}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => answer(false)}>Volver</Button>
            <Button variant={req.tone === 'danger' ? 'danger' : 'primary'} onClick={() => answer(true)} autoFocus>
              {req.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
