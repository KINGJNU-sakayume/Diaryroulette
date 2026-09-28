import { CATEGORIES, tint, type MissionCategory } from '../../data/categories'
import { useTheme } from '../../theme/theme'

export default function CategoryBadge({ category }: { category: MissionCategory }) {
  const { theme } = useTheme()
  const meta = CATEGORIES[category]
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink-mid"
      style={{ background: tint(meta.color, theme === 'dark' ? 0.2 : 0.11) }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
