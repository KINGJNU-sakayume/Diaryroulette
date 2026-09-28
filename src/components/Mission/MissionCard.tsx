import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clock3, Flame, LayoutList, Palette, PenLine, Smile } from 'lucide-react'
import { editorLabel, missionMeta, type Mission } from '../../data/missions'
import CategoryBadge from '../shared/CategoryBadge'
import MissionExtras from './MissionExtras'

interface MissionCardProps {
  mission: Mission
  extraData?: Record<string, unknown>
  action?: { label: string; to: string }
}

function EditorIcon({ mission }: { mission: Mission }) {
  const cls = 'h-3.5 w-3.5'
  switch (mission.editorType) {
    case 'timed-text':
      return <Clock3 className={cls} />
    case 'canvas':
      return <Palette className={cls} />
    case 'emoji-only':
      return <Smile className={cls} />
    case 'trash':
      return <Flame className={cls} />
    case 'prompts':
      return <LayoutList className={cls} />
    default:
      return <PenLine className={cls} />
  }
}

export default function MissionCard({ mission, extraData, action }: MissionCardProps) {
  const meta = missionMeta(mission)
  return (
    <article className="panel p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={mission.category} />
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <EditorIcon mission={mission} />
          {editorLabel(mission)}
          {meta && <> · {meta}</>}
        </span>
      </div>

      <h2 className="mb-2 font-serif text-[22px] font-bold leading-snug text-ink">{mission.title}</h2>
      <p className="text-[15px] leading-relaxed text-ink-mid">{mission.description}</p>

      {mission.rules && mission.rules.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {mission.rules.map((rule) => (
            <li key={rule} className="flex gap-2 text-sm text-ink-mid">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              {rule}
            </li>
          ))}
        </ul>
      )}

      {extraData && (
        <div className="mt-4">
          <MissionExtras extraData={extraData} />
        </div>
      )}

      {action && (
        <Link to={action.to} className="btn-primary mt-5 w-full py-3">
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </article>
  )
}
