import { Quote } from 'lucide-react'
import { vowelFamily } from '../../lib/hangul'

/** 미션과 함께 추첨된 값(금지 모음, 허용 모음, 영감 카드)을 보여 준다. */
export default function MissionExtras({ extraData }: { extraData?: Record<string, unknown> }) {
  const banned = typeof extraData?.bannedVowel === 'string' ? extraData.bannedVowel : null
  const allowed = typeof extraData?.allowedVowel === 'string' ? extraData.allowedVowel : null
  const card = typeof extraData?.inspirationCard === 'string' ? extraData.inspirationCard : null
  if (!banned && !allowed && !card) return null

  const bannedFamily = banned ? vowelFamily(banned).filter((v) => v !== banned) : []

  return (
    <div className="space-y-2">
      {banned && (
        <VowelBox label="오늘의 금지 모음" vowel={banned}>
          {bannedFamily.length > 0 && <>겹모음 {bannedFamily.join('·')}도 함께 금지</>}
        </VowelBox>
      )}
      {allowed && <VowelBox label="오늘 쓸 수 있는 모음" vowel={allowed}>이 모음이 든 글자만 쓸 수 있어요</VowelBox>}
      {card && (
        <figure className="rounded-xl border border-line bg-page px-4 py-3">
          <figcaption className="mb-1 flex items-center gap-1.5 text-xs text-muted">
            <Quote className="h-3.5 w-3.5" aria-hidden="true" />
            오늘의 영감 카드
          </figcaption>
          <blockquote className="font-serif text-[15px] leading-relaxed text-ink">{card}</blockquote>
        </figure>
      )}
    </div>
  )
}

function VowelBox({ label, vowel, children }: { label: string; vowel: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-page px-4 py-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-card font-serif text-2xl font-bold text-ink">
        {vowel}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {children && <p className="text-xs text-muted">{children}</p>}
      </div>
    </div>
  )
}
