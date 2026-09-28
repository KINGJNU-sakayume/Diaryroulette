export type MissionCategory = 'lang' | 'view' | 'time' | 'visual' | 'creative' | 'form'

export interface CategoryMeta {
  label: string
  /** 카테고리 한 줄 소개 */
  blurb: string
  /**
   * 점·막대에 쓰는 대표색. 라이트(#fffdf9)·다크(#24211d) 표면 모두에서
   * 대비 3:1 이상, 색각이상 시뮬레이션에서도 이웃한 카테고리끼리 구분되도록 검증한 값.
   * 글자에는 쓰지 않는다(글자는 본문 색, 색은 옆의 점이 담당).
   */
  color: string
}

/** 화면에 보여 줄 순서 */
export const CATEGORY_ORDER: MissionCategory[] = ['lang', 'view', 'time', 'visual', 'creative', 'form']

export const CATEGORIES: Record<MissionCategory, CategoryMeta> = {
  lang: {
    label: '언어',
    blurb: '단어와 글자에 규칙을 걸어 익숙한 문장을 낯설게',
    color: '#5A6BD6',
  },
  view: {
    label: '시점',
    blurb: '내가 아닌 다른 눈으로 오늘을 다시 보기',
    color: '#009688',
  },
  time: {
    label: '시간·분량',
    blurb: '시간이나 글자 수를 정해 두고 쓰기',
    color: '#BD7E00',
  },
  visual: {
    label: '그림',
    blurb: '글 대신 선, 색, 이모지로 남기기',
    color: '#D2467A',
  },
  creative: {
    label: '상상',
    blurb: '엉뚱한 설정 속에서 오늘을 비틀어 보기',
    color: '#3F8A2A',
  },
  form: {
    label: '양식',
    blurb: '정해진 칸을 채우다 보면 완성되는 일기',
    color: '#8E5BB0',
  },
}

/** '#RRGGBB' → 'rgba(r, g, b, a)' */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
