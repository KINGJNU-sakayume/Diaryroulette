import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, Type, Image as ImageIcon, Smile, Trash2 } from 'lucide-react'
import { type Mission, getCategoryColors, CATEGORY_LABELS } from '../../data/missions'
import { useTheme } from '../../contexts/ThemeContext'

interface MissionCardProps {
  mission: Mission
  extraData?: Record<string, unknown>
  date?: string
  isCompleted?: boolean
}

function EditorIcon({ type }: { type: Mission['editorType'] }): ReactNode {
  const cls = 'w-4 h-4'
  switch (type) {
    case 'timed-text': return <Clock className={cls} />
    case 'canvas': return <ImageIcon className={cls} />
    case 'emoji-only': return <Smile className={cls} />
    case 'trash': return <Trash2 className={cls} />
    default: return <Type className={cls} />
  }
}

function EditorTypeLabel(type: Mission['editorType']): string {
  switch (type) {
    case 'timed-text': return '타이머 글쓰기'
    case 'canvas': return '드로잉'
    case 'emoji-only': return '이모티콘'
    case 'trash': return '소각'
    default: return '글쓰기'
  }
}

export default function MissionCard({ mission, extraData, date, isCompleted }: MissionCardProps) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const colors = getCategoryColors(theme)[mission.category]

  // For creative-1, use the persisted inspiration card from extraData
  const inspirationCard =
    mission.id === 'creative-1' && typeof extraData?.inspirationCard === 'string'
      ? extraData.inspirationCard
      : null

  const handleWrite = () => {
    if (isCompleted) {
      navigate('/archive')
    } else if (date) {
      navigate(`/write?date=${date}&missionId=${mission.id}`)
    } else {
      navigate('/write')
    }
  }

  return (
    <div
      className="rounded-2xl border p-6 animate-fadeIn"
      style={{
        background: `linear-gradient(135deg, var(--color-surface), var(--color-card))`,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <span
            className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2"
            style={{ background: colors.bg + '33', color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {CATEGORY_LABELS[mission.category]}
          </span>
          <h2 className="text-xl font-bold font-serif" style={{ color: 'var(--color-text)' }}>{mission.title}</h2>
        </div>
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg shrink-0"
          style={{ background: 'var(--color-card)', color: 'var(--color-muted)' }}
        >
          <EditorIcon type={mission.editorType} />
          <span>{EditorTypeLabel(mission.editorType)}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text)' }}>{mission.description}</p>

      {/* Rules */}
      {mission.rules && mission.rules.length > 0 && (
        <ul className="mb-4 space-y-1">
          {mission.rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-mid)' }}>
              <span style={{ color: colors.text }}>•</span>
              {rule}
            </li>
          ))}
        </ul>
      )}

      {/* Extra data (e.g., bannedVowel for lang-3) */}
      {typeof extraData?.bannedVowel === 'string' && (
        <div
          className="mb-4 p-3 rounded-lg text-sm font-bold"
          style={{ background: colors.bg + '22', color: colors.text, border: `1px solid ${colors.border}` }}
        >
          🚫 오늘 금지 모음: <span className="text-lg">{extraData.bannedVowel}</span>
        </div>
      )}
      {typeof extraData?.allowedVowel === 'string' && (
        <div
          className="mb-4 p-3 rounded-lg text-sm font-bold"
          style={{ background: colors.bg + '22', color: colors.text, border: `1px solid ${colors.border}` }}
        >
          ✅ 오늘 허용 모음: <span className="text-lg">{extraData.allowedVowel}</span>
        </div>
      )}

      {/* Inspiration card for creative-1 */}
      {inspirationCard && (
        <div
          className="mb-4 p-4 rounded-xl text-sm italic"
          style={{ background: 'var(--color-bg)', border: `1px solid ${colors.border}`, color: colors.text }}
        >
          <span className="text-xs not-italic opacity-60 block mb-1">✨ 오늘의 영감 카드</span>
          "{inspirationCard}"
        </div>
      )}

      {/* Char limit info */}
      {mission.charLimit && (
        <div className="mb-4 text-xs" style={{ color: 'var(--color-muted)' }}>
          {mission.charLimit.min && mission.charLimit.max
            ? `목표: ${mission.charLimit.min}–${mission.charLimit.max}자`
            : mission.charLimit.min
            ? `최소 ${mission.charLimit.min}자`
            : `최대 ${mission.charLimit.max}자`}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleWrite}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${colors.bg}, ${colors.border})`, color: '#fff' }}
      >
        {isCompleted ? '보관함에서 보기' : '오늘 일기 쓰러 가기'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
