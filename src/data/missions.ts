import type { MissionCategory } from './categories'

export type { MissionCategory } from './categories'

export type EditorType = 'text' | 'timed-text' | 'canvas' | 'emoji-only' | 'trash' | 'prompts'

/** 자동으로 규칙 위반을 표시해 주는 검사기 종류 (구현: lib/rules.ts) */
export type CheckId =
  | 'no-noun'
  | 'no-copula'
  | 'banned-vowel'
  | 'single-vowel'
  | 'no-modifier'
  | 'sentence-choseong'
  | 'word-choseong'
  | 'three-syllables'
  | 'questions-only'
  | 'dialogue-only'
  | 'sentence-prefix'
  | 'third-person'

/** 미션을 뽑을 때 함께 추첨하는 값 */
export type DrawKind = 'bannedVowel' | 'allowedVowel' | 'inspirationCard'

export type CanvasMode = 'free' | 'emotion' | 'mono' | 'shapes'

export interface PromptField {
  label: string
  placeholder?: string
  /** 한 줄짜리 칸이면 true */
  short?: boolean
}

export interface Mission {
  /** 저장된 일기와 연결되는 영구 키. 절대 바꾸지 말 것 (접두어가 카테고리와 달라도 된다). */
  id: string
  category: MissionCategory
  title: string
  description: string
  editorType: EditorType
  /** 미션 카드에 보여 줄 규칙 목록 */
  rules?: string[]
  check?: CheckId
  /** check가 'sentence-prefix'일 때 문장 첫머리에 와야 하는 말 */
  sentencePrefix?: string
  draw?: DrawKind
  charLimit?: { min?: number; max?: number }
  /** 카운트다운(초). 첫 입력에서 시작하고, 끝나면 더 쓸 수 없다. */
  timerSeconds?: number
  /** 지우기(백스페이스·삭제·잘라내기) 금지 */
  noDelete?: boolean
  /** 쓰는 동안 글자가 보이지 않음 */
  blackout?: boolean
  /** 한글 입력을 막음 */
  noHangul?: boolean
  canvasMode?: CanvasMode
  /** 캔버스에 미리 그려 둘 밑그림 */
  canvasGuide?: 'body'
  /** 'prompts' 양식의 칸들 */
  prompts?: PromptField[]
  placeholder?: string
}

export const missions: Mission[] = [
  // ── 언어 ──────────────────────────────────────────────────────────────────
  {
    id: 'lang-1',
    category: 'lang',
    title: '명사 없이 쓰기',
    description: '사물, 장소, 사람 이름 없이 움직임과 느낌만으로 오늘을 그려 보세요.',
    editorType: 'text',
    check: 'no-noun',
    rules: ['명사(이름 붙은 것들)는 쓰지 않기', '동사·형용사·부사로만 묘사하기'],
  },
  {
    id: 'lang-2',
    category: 'lang',
    title: '이다·있다·없다 없이 쓰기',
    description: '"이다", "있다", "없다"와 그 활용형(입니다, 있어서, 없는…)을 쓰지 않고 하루를 적어 보세요.',
    editorType: 'text',
    check: 'no-copula',
    rules: ['이다·있다·없다와 모든 활용형 쓰지 않기', '재미있다·맛없다처럼 붙어 있는 말도 포함'],
  },
  {
    id: 'lang-3',
    category: 'lang',
    title: '모음 하나 압수',
    description: '오늘 뽑힌 모음이 들어간 글자는 쓸 수 없어요. 다른 말로 돌려 가며 써 보세요.',
    editorType: 'text',
    check: 'banned-vowel',
    draw: 'bannedVowel',
    rules: ['금지 모음이 들어간 글자 쓰지 않기', '그 모음이 섞인 겹모음도 금지 (예: ㅗ → ㅘ·ㅙ·ㅚ)'],
  },
  {
    id: 'lang-4',
    category: 'lang',
    title: '한 모음으로만 쓰기',
    description: '오늘 뽑힌 모음 하나만 들어간 글자로 써 보세요. 어려우니 짧아도 괜찮아요.',
    editorType: 'text',
    check: 'single-vowel',
    draw: 'allowedVowel',
    rules: ['한글은 허용 모음이 든 글자만', '영어·숫자·문장부호는 자유'],
  },
  {
    id: 'lang-5',
    category: 'lang',
    title: '꾸밈말 빼고 쓰기',
    description: '형용사와 부사를 모두 덜어 내고 명사와 동사만으로 오늘을 기록하세요.',
    editorType: 'text',
    check: 'no-modifier',
    rules: ['형용사·부사 쓰지 않기', '명사와 동사만 쓰기'],
  },
  {
    id: 'lang-6',
    category: 'lang',
    title: '가나다 문장 일기',
    description: '문장의 첫 글자를 ㄱ, ㄴ, ㄷ, ㄹ, ㅁ… 순서로 시작하며 이어 가세요.',
    editorType: 'text',
    check: 'sentence-choseong',
    rules: [
      '문장 첫 글자의 자음이 ㄱ→ㄴ→ㄷ→… 순서 (ㅎ 다음은 다시 ㄱ)',
      '마침표·물음표·느낌표·줄바꿈에서 문장이 끝나요',
      'ㄲ·ㄸ 같은 된소리는 ㄱ·ㄷ으로 쳐요',
    ],
  },
  {
    id: 'lang-7',
    category: 'lang',
    title: '외국어로만 쓰기',
    description: '오늘 하루를 한국어가 아닌 말로 적어 보세요. 서툴러도 괜찮아요.',
    editorType: 'text',
    noHangul: true,
    rules: ['한글은 입력되지 않아요', '영어, 일본어, 스페인어… 어떤 언어든 좋아요'],
    placeholder: 'Today I…',
  },
  {
    id: 'lang-8',
    category: 'lang',
    title: '가나다 단어 일기',
    description: '띄어 쓴 단어마다 첫 글자를 ㄱ, ㄴ, ㄷ, ㄹ… 순서로 이어 가세요. 문장 단위보다 훨씬 어려워요.',
    editorType: 'text',
    check: 'word-choseong',
    rules: ['단어마다 첫 자음이 ㄱ→ㄴ→ㄷ→… 순서 (ㅎ 다음은 다시 ㄱ)', '된소리는 기본 자음으로 쳐요'],
  },
  {
    id: 'lang-9',
    category: 'lang',
    title: '세 글자 일기',
    description: '띄어 쓴 단어(어절)를 모두 정확히 세 글자로 맞추세요. 예) 오늘은 날씨가 참으로 좋았다.',
    editorType: 'text',
    check: 'three-syllables',
    rules: ['모든 어절이 딱 세 글자', '쉼표·마침표 같은 문장부호는 글자 수에 넣지 않아요'],
  },

  // ── 시점 ──────────────────────────────────────────────────────────────────
  {
    id: 'view-1',
    category: 'view',
    title: '물건의 눈으로',
    description: '오늘 곁에 있던 물건(컵, 의자, 휴대폰…) 하나가 되어 그 물건이 본 하루를 써 보세요.',
    editorType: 'text',
    placeholder: '나는 책상 위의 머그컵이다. 오늘 아침…',
  },
  {
    id: 'view-2',
    category: 'view',
    title: '10년 뒤의 내가',
    description: '10년 뒤의 내가 오늘을 떠올리며 쓰는 일기예요. 지난 일을 돌아보듯 과거형으로 써 보세요.',
    editorType: 'text',
  },
  {
    id: 'view-4',
    category: 'view',
    title: '3인칭 관찰자',
    description: '"그는 오늘…" 또는 "그녀는 오늘…"로 시작해서, 나를 남처럼 바라보며 기록하세요.',
    editorType: 'text',
    check: 'third-person',
    rules: ['나·내·저·우리 같은 1인칭 쓰지 않기'],
    placeholder: '그는 오늘…',
  },
  {
    id: 'view-5',
    category: 'view',
    title: '악당의 변명',
    description: '악당이 되어 오늘 내린 모든 결정을 당당하게 변호해 보세요.',
    editorType: 'text',
  },
  {
    id: 'view-6',
    category: 'view',
    title: '외계인에게 보내는 보고서',
    description: '지구를 전혀 모르는 외계인에게 오늘 하루를 설명하세요. 당연한 것도 하나하나 풀어서.',
    editorType: 'text',
  },
  {
    id: 'view-7',
    category: 'view',
    title: '거꾸로 흐르는 하루',
    description: '잠자리에 드는 순간에서 시작해 아침으로 거슬러 올라가며 적어 보세요.',
    editorType: 'text',
  },

  // ── 시간·분량 ─────────────────────────────────────────────────────────────
  {
    id: 'time-1',
    category: 'time',
    title: '지우지 않고 1500자',
    description: '지우지 않고 1500자까지 쭉 써 내려가세요. 오타가 나도 멈추지 말고 앞으로만.',
    editorType: 'text',
    charLimit: { min: 1500 },
    noDelete: true,
    rules: ['백스페이스·삭제·잘라내기 불가', '1500자를 넘기면 완료할 수 있어요'],
  },
  {
    id: 'time-2',
    category: 'time',
    title: '50자 한 줄',
    description: '50자 안에 오늘의 핵심만 담아 보세요. 군더더기는 덜어 내고.',
    editorType: 'text',
    charLimit: { max: 50 },
    rules: ['공백 포함 50자 이하'],
  },
  {
    id: 'time-3',
    category: 'time',
    title: '100자 요약',
    description: '90자에서 110자 사이로 오늘을 요약하세요.',
    editorType: 'text',
    charLimit: { min: 90, max: 110 },
    rules: ['공백 포함 90~110자'],
  },
  {
    id: 'time-4',
    category: 'time',
    title: '30초 쏟아내기',
    description: '30초 동안 떠오르는 것을 전부 적어요. 고를 시간은 없어요.',
    editorType: 'timed-text',
    timerSeconds: 30,
    rules: ['첫 글자를 쓰면 타이머가 시작돼요', '시간이 끝나면 더 쓸 수 없어요'],
  },
  {
    id: 'time-5',
    category: 'time',
    title: '보이지 않게 쓰기',
    description: '화면이 어두운 채로 씁니다. 무엇을 썼는지는 완료한 뒤에야 볼 수 있어요.',
    editorType: 'text',
    blackout: true,
    rules: ['쓰는 동안 글자가 보이지 않아요', '"꾹 눌러 보기"를 누르고 있는 동안만 잠깐 볼 수 있어요'],
  },
  {
    id: 'time-7',
    category: 'time',
    title: '5분 논스톱',
    description: '5분 동안 손을 멈추지 말고 계속 쓰세요.',
    editorType: 'timed-text',
    timerSeconds: 300,
    rules: ['첫 글자를 쓰면 타이머가 시작돼요', '시간이 끝나면 더 쓸 수 없어요'],
  },
  {
    id: 'time-8',
    category: 'time',
    title: '정확히 300자',
    description: '딱 300자로 오늘을 완성하세요. 299자도, 301자도 안 돼요.',
    editorType: 'text',
    charLimit: { min: 300, max: 300 },
    rules: ['공백 포함 정확히 300자'],
  },

  // ── 그림 ──────────────────────────────────────────────────────────────────
  {
    id: 'visual-1',
    category: 'visual',
    title: '마음 가는 대로 선 긋기',
    description: '무언가를 그리려 하지 말고, 오늘의 기분이 이끄는 대로 선을 그어 보세요.',
    editorType: 'canvas',
    canvasMode: 'free',
  },
  {
    id: 'visual-2',
    category: 'visual',
    title: '이모지 일기',
    description: '이모지만으로 오늘을 기록하세요. 글자는 쓸 수 없어요.',
    editorType: 'emoji-only',
    rules: ['이모지와 띄어쓰기·줄바꿈만 입력돼요'],
  },
  {
    id: 'visual-3',
    category: 'visual',
    title: '몸 지도 그리기',
    description: '몸 윤곽 위에 오늘 아프거나 뻐근했던 곳, 편안했던 곳을 색으로 표시해 보세요.',
    editorType: 'canvas',
    canvasMode: 'free',
    canvasGuide: 'body',
  },
  {
    id: 'visual-4',
    category: 'visual',
    title: '반대 손으로 그리기',
    description: '평소 쓰지 않는 손으로 오늘을 그리거나 적어 보세요. 삐뚤빼뚤해도 괜찮아요.',
    editorType: 'canvas',
    canvasMode: 'free',
  },
  {
    id: 'visual-5',
    category: 'visual',
    title: '감정 온도 찍기',
    description: '감정마다 세기(크기)와 온도(색)를 정해 캔버스에 원으로 찍어 보세요. 겹쳐도 좋아요.',
    editorType: 'canvas',
    canvasMode: 'emotion',
    rules: ['슬라이더로 크기와 온도를 고른 뒤 캔버스를 누르면 원이 찍혀요'],
  },
  {
    id: 'visual-6',
    category: 'visual',
    title: '도형으로 하루 조립하기',
    description: '네모, 동그라미, 세모, 선만으로 오늘의 흐름을 표현하세요.',
    editorType: 'canvas',
    canvasMode: 'shapes',
    rules: ['자유 곡선은 그릴 수 없어요', '끌어서 도형 크기를 정해요'],
  },
  {
    id: 'visual-7',
    category: 'visual',
    title: '한 가지 색의 농담',
    description: '오늘을 대표하는 색 하나를 고르고, 그 색의 진하고 옅음만으로 그려 보세요.',
    editorType: 'canvas',
    canvasMode: 'mono',
    rules: ['처음 고른 색은 그리기 시작하면 바꿀 수 없어요'],
  },
  {
    id: 'visual-8',
    category: 'visual',
    title: '하루 보물지도',
    description: '오늘 움직인 길이나 마음의 흐름을 선과 기호로 지도처럼 그려 보세요.',
    editorType: 'canvas',
    canvasMode: 'free',
  },

  // ── 상상 ──────────────────────────────────────────────────────────────────
  {
    id: 'creative-1',
    category: 'creative',
    title: '영감 카드 한 장',
    description: '오늘 뽑힌 영감 카드 한 문장에서 출발해 자유롭게 써 보세요.',
    editorType: 'text',
    draw: 'inspirationCard',
  },
  {
    id: 'creative-2',
    category: 'creative',
    title: '질문으로만 쓰기',
    description: '모든 문장을 물음표로 끝내 보세요. 평서문은 하나도 없이.',
    editorType: 'text',
    check: 'questions-only',
    rules: ['모든 문장이 물음표(?)로 끝나야 해요'],
  },
  {
    id: 'creative-3',
    category: 'creative',
    title: '모르는 사람에게 쓰는 편지',
    description: '한 번도 만난 적 없지만 말을 걸고 싶은 누군가에게 오늘 하루를 편지로 전하세요.',
    editorType: 'text',
    placeholder: '처음 인사드려요.',
  },
  {
    id: 'creative-5',
    category: 'creative',
    title: '나를 주인공으로 한 신화',
    description: '나를 주인공으로 한 짧은 신화를 지어 보세요. 오늘 있었던 일을 신화 속 사건처럼.',
    editorType: 'text',
    placeholder: '아주 먼 옛날, 알람을 세 번 끈 자가 있었으니…',
  },
  {
    id: 'creative-6',
    category: 'creative',
    title: '대화로만 쓰기',
    description: '서술이나 설명 없이 오직 주고받은 말만으로 오늘을 기록하세요.',
    editorType: 'text',
    check: 'dialogue-only',
    rules: ['따옴표 안의 말만 쓰기', '줄 앞에 "엄마:"처럼 말한 사람을 적는 건 괜찮아요'],
    placeholder: '나: "오늘 좀 이상하지 않아?"',
  },
  {
    id: 'creative-7',
    category: 'creative',
    title: '마지막 날처럼',
    description: '오늘이 생의 마지막 날이라는 설정으로 일기를 쓰세요.',
    editorType: 'text',
  },
  {
    id: 'creative-8',
    category: 'creative',
    title: '왜인지 모르겠지만…',
    description:
      '모든 문장을 "왜인지 모르겠지만"으로 시작해 이유 모를 마음을 털어놓으세요. 다 쓰면 종이를 파쇄합니다. 내용은 어디에도 저장되지 않아요.',
    editorType: 'trash',
    check: 'sentence-prefix',
    sentencePrefix: '왜인지 모르겠지만',
    rules: ['모든 문장을 "왜인지 모르겠지만"으로 시작하기', '다 쓰면 파쇄 — 기록은 남지만 내용은 사라져요'],
  },
  {
    id: 'creative-9',
    category: 'creative',
    title: '완벽한 거짓말 일기',
    description: '오늘 있었던 일을 전부 반대로 쓰거나 지어낸 사건으로만 채워 보세요. 진실은 한 줄도 없이.',
    editorType: 'text',
    rules: ['실제로 있었던 일은 쓰지 않기'],
  },
  {
    id: 'creative-10',
    category: 'creative',
    title: '단어가 생각나지 않을 때',
    description: '중요한 단어가 떠오르지 않는 사람처럼, 핵심을 직접 말하지 않고 빙빙 돌려 설명해 보세요.',
    editorType: 'text',
  },

  // ── 양식 ──────────────────────────────────────────────────────────────────
  {
    id: 'time-6',
    category: 'form',
    title: '하루 세 줄',
    description: '딱 세 줄. 오늘 있었던 일, 그때의 마음, 그리고 배운 것.',
    editorType: 'prompts',
    prompts: [
      { label: '있었던 일', placeholder: '점심에 오랜만에 친구를 만났다.', short: true },
      { label: '느낀 마음', placeholder: '반가우면서도 조금 어색했다.', short: true },
      { label: '배운 것', placeholder: '연락은 미루지 말자.', short: true },
    ],
  },
  {
    id: 'view-3',
    category: 'form',
    title: '뉴스 기사 일기',
    description: '오늘 하루를 신문 기사처럼 써 보세요. 제목부터 인터뷰까지.',
    editorType: 'prompts',
    prompts: [
      { label: '헤드라인', placeholder: '직장인 A씨, 알람 다섯 번 끄고도 지각 면해', short: true },
      { label: '리드', placeholder: '언제, 어디서, 무슨 일이 있었는지 두세 문장으로' },
      { label: '본문', placeholder: '자세한 경위와 뒷이야기' },
      { label: '인터뷰', placeholder: '"솔직히 운이 좋았습니다." — 당사자 A씨' },
      { label: '마무리', placeholder: '기사를 닫는 한 문장', short: true },
    ],
  },
  {
    id: 'creative-4',
    category: 'form',
    title: '레시피 일기',
    description: '오늘 하루를 요리 레시피처럼 적어 보세요. 재료, 순서, 조리 시간, 맛까지.',
    editorType: 'prompts',
    prompts: [
      { label: '요리 이름', placeholder: '월요일 피로 조림', short: true },
      { label: '재료', placeholder: '잠 5시간, 커피 두 잔, 밀린 메일 한 줌…' },
      { label: '만드는 법', placeholder: '1. 알람을 세 번 끈다.\n2. …' },
      { label: '조리 시간', placeholder: '약 16시간', short: true },
      { label: '맛 평가', placeholder: '짭짤하지만 뒷맛은 달다', short: true },
    ],
  },
  {
    id: 'form-1',
    category: 'form',
    title: '고마운 세 가지',
    description: '오늘 고마웠던 일을 세 가지 적어 보세요. 아주 작은 것이라도 좋아요.',
    editorType: 'prompts',
    prompts: [
      { label: '첫 번째', placeholder: '출근길 버스가 바로 왔다.' },
      { label: '두 번째', placeholder: '동료가 커피를 사 줬다.' },
      { label: '세 번째', placeholder: '저녁 바람이 선선했다.' },
    ],
  },
  {
    id: 'form-2',
    category: 'form',
    title: '오늘의 회고',
    description: '계속할 것, 아쉬웠던 것, 내일 해 볼 것. 세 칸으로 하루를 돌아봐요.',
    editorType: 'prompts',
    prompts: [
      { label: '계속할 것', placeholder: '오늘 잘한 일, 이어 가고 싶은 습관' },
      { label: '아쉬웠던 것', placeholder: '마음에 걸리는 일, 막혔던 부분' },
      { label: '내일 해 볼 것', placeholder: '작게라도 바꿔 볼 한 가지' },
    ],
  },
  {
    id: 'form-3',
    category: 'form',
    title: '마음 일기예보',
    description: '기상 캐스터가 되어 오늘 내 마음의 날씨를 전해 주세요.',
    editorType: 'prompts',
    prompts: [
      { label: '오늘의 날씨', placeholder: '흐린 뒤 오후부터 맑음', short: true },
      { label: '기온', placeholder: '체감 18도, 선선함', short: true },
      { label: '특보', placeholder: '오후 3시경 졸음 주의보가 발령됐습니다.' },
      { label: '내일 예보', placeholder: '대체로 맑겠으나 아침에 짙은 귀찮음이 끼겠습니다.' },
    ],
  },
  {
    id: 'form-4',
    category: 'form',
    title: '셀프 인터뷰',
    description: '기자가 나에게 묻습니다. 질문마다 솔직하게 답해 보세요.',
    editorType: 'prompts',
    prompts: [
      { label: '오늘 가장 오래 머문 생각은?' },
      { label: '오늘 나를 웃게 한 건?' },
      { label: '다시 할 수 있다면 바꾸고 싶은 순간은?' },
      { label: '내일의 나에게 한마디 한다면?' },
    ],
  },
  {
    id: 'form-5',
    category: 'form',
    title: '오늘의 단어 사전',
    description: '오늘을 대표하는 단어 하나를 골라 사전 항목처럼 풀이해 보세요.',
    editorType: 'prompts',
    prompts: [
      { label: '표제어', placeholder: '버티다', short: true },
      { label: '품사', placeholder: '동사', short: true },
      { label: '뜻풀이', placeholder: '1. 오늘의 내가 한 일. 2. …' },
      { label: '예문', placeholder: '오늘 이 단어가 쓰인 장면' },
    ],
  },
  {
    id: 'form-6',
    category: 'form',
    title: '다섯 감각 일기',
    description: '오늘 보고, 듣고, 맡고, 맛보고, 만진 것을 하나씩 적어 보세요.',
    editorType: 'prompts',
    prompts: [
      { label: '본 것', short: true },
      { label: '들은 것', short: true },
      { label: '맡은 냄새', short: true },
      { label: '맛본 것', short: true },
      { label: '만진 것', short: true },
    ],
  },
  {
    id: 'form-7',
    category: 'form',
    title: '오늘의 영수증',
    description: '오늘 쓴 시간과 마음을 영수증처럼 정리해 보세요.',
    editorType: 'prompts',
    prompts: [
      { label: '구매 내역', placeholder: '출근길 지하철 ······ 40분\n점심 수다 ········· 1시간' },
      { label: '지불한 것', placeholder: '체력 30%, 인내심 조금' },
      { label: '거스름돈', placeholder: '오늘 나에게 남은 것' },
      { label: '영수증 메모', placeholder: '다음에도 또 오고 싶은 하루', short: true },
    ],
  },
]

const missionById = new Map(missions.map((m) => [m.id, m]))

export function getMission(id: string | null | undefined): Mission | undefined {
  return id ? missionById.get(id) : undefined
}

/** 일기 기록의 type 필드 값 */
export function journalTypeOf(mission: Mission): 'text' | 'canvas' | 'trash' {
  if (mission.editorType === 'canvas') return 'canvas'
  if (mission.editorType === 'trash') return 'trash'
  return 'text'
}

/** 미션 카드에 붙는 작성 방식 이름 */
export function editorLabel(mission: Mission): string {
  switch (mission.editorType) {
    case 'timed-text':
      return '타이머'
    case 'canvas':
      return '그리기'
    case 'emoji-only':
      return '이모지'
    case 'trash':
      return '쓰고 파쇄'
    case 'prompts':
      return '칸 채우기'
    default:
      return mission.blackout ? '가리고 쓰기' : '글쓰기'
  }
}

/** 시간·분량 조건 한 줄 요약 (예: 5분, 90~110자) */
export function missionMeta(mission: Mission): string | null {
  const { charLimit, timerSeconds } = mission
  if (timerSeconds) return timerSeconds >= 60 ? `${timerSeconds / 60}분` : `${timerSeconds}초`
  if (!charLimit) return null
  if (charLimit.min !== undefined && charLimit.min === charLimit.max) return `정확히 ${charLimit.min}자`
  if (charLimit.min !== undefined && charLimit.max !== undefined) return `${charLimit.min}~${charLimit.max}자`
  if (charLimit.min !== undefined) return `${charLimit.min}자 이상`
  return `${charLimit.max}자 이하`
}
