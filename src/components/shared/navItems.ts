import { BookOpen, ChartNoAxesColumn, NotebookPen, Sun } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', icon: Sun, label: '오늘' },
  { to: '/archive', icon: BookOpen, label: '기록' },
  { to: '/drafts', icon: NotebookPen, label: '쓰던 글' },
  { to: '/stats', icon: ChartNoAxesColumn, label: '통계' },
] as const
