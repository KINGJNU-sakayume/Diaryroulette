interface ProgressBarProps {
  value: number      // 0–100 percentage OR current value
  max?: number       // if provided, value/max is used
  color?: string
  height?: number
  label?: string
  showText?: boolean
}

export default function ProgressBar({
  value,
  max,
  color = '#7c3aed',
  height = 8,
  label,
  showText = false,
}: ProgressBarProps) {
  const pct = max !== undefined ? Math.min((value / max) * 100, 100) : Math.min(value, 100)

  return (
    <div className="w-full">
      {(label || showText) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showText && (
            <span className="text-xs text-slate-400">
              {max !== undefined ? `${value} / ${max}` : `${Math.round(pct)}%`}
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: '#21262d' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
