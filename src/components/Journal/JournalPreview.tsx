import type { JournalEntry } from '../../db/indexedDB'
import type { Mission } from '../../data/missions'
import { isPromptAnswers } from '../../lib/prompts'
import { splitGraphemes } from '../../lib/text'
import { isSafeImageDataUrl } from '../../utils/importData'

/** 목록에서 보여 줄 짧은 미리보기 */
export function JournalSnippet({ entry, mission }: { entry: JournalEntry; mission?: Mission }) {
  if (entry.type === 'trash') return <p className="text-sm text-muted">파쇄한 일기</p>
  if (entry.type === 'canvas') return <p className="text-sm text-muted">그림 일기</p>

  const answers = entry.extraData?.answers
  if (isPromptAnswers(answers)) {
    const first = answers.find((a) => a.value.trim())
    if (!first) return <p className="text-sm text-muted">아직 빈 칸이에요</p>
    return (
      <p className="line-clamp-2 text-sm leading-relaxed text-ink-mid">
        <span className="text-muted">{first.label} · </span>
        {first.value}
      </p>
    )
  }

  if (!entry.content) return <p className="text-sm text-muted">아직 쓴 내용이 없어요</p>
  if (mission?.editorType === 'emoji-only') {
    return <p className="truncate text-xl">{splitGraphemes(entry.content).slice(0, 24).join('')}</p>
  }
  return <p className="line-clamp-2 text-sm leading-relaxed text-ink-mid">{entry.content.slice(0, 160)}</p>
}

export function JournalThumb({ entry }: { entry: JournalEntry }) {
  if (entry.type !== 'canvas' || !isSafeImageDataUrl(entry.content)) return null
  return (
    <img
      src={entry.content}
      alt=""
      className="h-14 w-[4.7rem] shrink-0 rounded-lg border border-line bg-card object-cover"
      loading="lazy"
    />
  )
}
