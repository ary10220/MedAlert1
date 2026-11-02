/** Logo mock del hospital: iniciales sobre círculo. Reemplazar por una imagen real cuando exista en el schema. */
export default function HospitalLogo({ nombre, size = 40 }: { nombre: string; size?: number }) {
  const initials = nombre
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-mint/15 font-display font-semibold text-mint ring-1 ring-mint/40"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}
