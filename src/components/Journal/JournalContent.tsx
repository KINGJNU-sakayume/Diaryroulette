import { ImageOff, Scissors } from 'lucide-react'
import type { JournalEntry } from '../../db/indexedDB'
import type { Mission } from '../../data/missions'
import { isPromptAnswers } from '../../lib/prompts'
import { isSafeImageDataUrl } from '../../utils/importData'

/** 일기 한 편의 본문 */
export default function JournalContent({ entry, mission }: { entry: JournalEntry; mission?: Mission }) {
  if (entry.type === 'trash') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-4 py-10 text-center">
        <Scissors className="h-8 w-8 text-muted" aria-hidden="true" />
        <p className="font-semibold text-ink">파쇄한 일기예요</p>
        <p className="text-sm text-muted">쓴 날의 기록만 남기고 내용은 지웠어요.</p>
      </div>
    )
  }

  if (entry.type === 'canvas') {
    if (!isSafeImageDataUrl(entry.content)) {
      return (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-4 py-10 text-center">
          <ImageOff className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">그림을 불러올 수 없어요.</p>
        </div>
      )
    }
    // 예전 버전의 그림은 배경이 투명해서 카드색 위에 얹는다
    return <img src={entry.content} alt={`${mission?.title ?? ''} 그림`} className="w-full rounded-xl border border-line bg-card" />
  }

  const answers = entry.extraData?.answers
  if (isPromptAnswers(answers)) {
    return (
      <dl className="space-y-4">
        {answers.map((a) => (
          <div key={a.label}>
            <dt className="mb-1 text-sm font-semibold text-muted">{a.label}</dt>
            <dd className="whitespace-pre-wrap font-serif text-[16px] leading-[1.8] text-ink">
              {a.value.trim() || <span className="text-muted">—</span>}
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  if (!entry.content) return <p className="text-sm text-muted">내용이 없어요.</p>

  if (mission?.editorType === 'emoji-only') {
    return <p className="whitespace-pre-wrap rounded-xl bg-card p-4 text-[32px] leading-relaxed">{entry.content}</p>
  }

  return <p className="whitespace-pre-wrap font-serif text-[16px] leading-[1.9] text-ink">{entry.content}</p>
}
