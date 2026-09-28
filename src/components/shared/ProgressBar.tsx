interface ProgressBarProps {
  value: number
  max: number
  color?: string
  label?: string
}

export default function ProgressBar({ value, max, color = 'var(--color-accent)', label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-card"
      role="progressbar"
      aria-valuenow={Math.min(value, max)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
