import type { Mission } from '../data/missions'
import { inspirationCards } from '../data/inspirationCards'
import { DRAWABLE_VOWELS } from './hangul'

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

/** 미션을 뽑을 때 함께 추첨하는 값 (금지 모음, 영감 카드 등) */
export function drawExtraData(mission: Mission): Record<string, unknown> | undefined {
  switch (mission.draw) {
    case 'bannedVowel':
      return { bannedVowel: pick(DRAWABLE_VOWELS) }
    case 'allowedVowel':
      return { allowedVowel: pick(DRAWABLE_VOWELS) }
    case 'inspirationCard':
      return { inspirationCard: pick(inspirationCards) }
    default:
      return undefined
  }
}
