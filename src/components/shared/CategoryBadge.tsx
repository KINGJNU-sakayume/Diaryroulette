import { getCategoryColors, CATEGORY_LABELS, type MissionCategory } from '../../data/missions'
import { useTheme } from '../../contexts/ThemeContext'

interface CategoryBadgeProps {
  category: MissionCategory
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const { theme } = useTheme()
  const colors = getCategoryColors(theme)[category]
  const label = CATEGORY_LABELS[category]

  return (
    <span
      className={`inline-block font-bold rounded-full ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{
        background: colors.bg + '33',
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {label}
    </span>
  )
}
