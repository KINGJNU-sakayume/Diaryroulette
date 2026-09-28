import type { PromptField } from '../data/missions'

/** 양식 일기의 한 칸. 라벨도 함께 저장해 두어 미션 문구가 바뀌어도 기록은 그대로 보인다. */
export interface PromptAnswer {
  label: string
  value: string
}

export function isPromptAnswers(v: unknown): v is PromptAnswer[] {
  return (
    Array.isArray(v) &&
    v.every(
      (a) =>
        typeof a === 'object' && a !== null && typeof (a as PromptAnswer).label === 'string' &&
        typeof (a as PromptAnswer).value === 'string',
    )
  )
}

/** 보관함·백업에서 읽을 수 있는 평문으로 합친다. */
export function joinAnswers(answers: PromptAnswer[]): string {
  return answers
    .filter((a) => a.value.trim())
    .map((a) => `【${a.label}】\n${a.value.trim()}`)
    .join('\n\n')
}

export function toAnswers(fields: PromptField[], values: string[]): PromptAnswer[] {
  return fields.map((f, i) => ({ label: f.label, value: values[i] ?? '' }))
}

/**
 * 임시저장본에서 칸 값을 복원한다.
 * 예전 버전(칸 없이 글 하나로 쓰던 시절)의 임시저장이면 내용을 가장 넓은 칸에 넣어 준다.
 */
export function restoreValues(fields: PromptField[], saved: unknown, legacyContent: string | null | undefined): string[] {
  if (isPromptAnswers(saved)) {
    return fields.map((f, i) => saved.find((a) => a.label === f.label)?.value ?? saved[i]?.value ?? '')
  }
  const values = fields.map(() => '')
  if (legacyContent) {
    const target = Math.max(0, fields.findIndex((f) => !f.short))
    values[target] = legacyContent
  }
  return values
}
