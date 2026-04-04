export type MissionCategory = 'lang' | 'view' | 'time' | 'visual' | 'creative'
export type EditorType = 'text' | 'timed-text' | 'canvas' | 'emoji-only' | 'trash'

export interface Mission {
  id: string
  category: MissionCategory
  title: string
  description: string
  editorType: EditorType
  rules?: string[]
  timerSeconds?: number
  charLimit?: { min?: number; max?: number }
  backspaceDisabled?: boolean
}

export const missions: Mission[] = [
  // ── lang — Language Deconstruction (7) ──────────────────────────────────────
  {
    id: 'lang-1',
    category: 'lang',
    title: '명사 건너뛰기 게임',
    description: '오늘 일기에서 명사를 하나도 사용하지 마세요. 사물, 장소, 사람 이름 없이 감정과 동작만으로 하루를 묘사해 보세요.',
    editorType: 'text',
    rules: ['명사 사용 금지', '동사, 형용사, 부사만 사용'],
  },
  {
    id: 'lang-2',
    category: 'lang',
    title: '존재 동사 지우기',
    description: '"이다", "있다", "없다" 그리고 그 모든 활용형을 쓰지 않고 오늘 하루를 기록하세요.',
    editorType: 'text',
    rules: ['이다/있다/없다 및 모든 활용형 사용 금지', '위반 시 소프트 하이라이트로 표시됩니다'],
  },
  {
    id: 'lang-3',
    category: 'lang',
    title: '특정 모음 압수',
    description: '오늘 추첨된 금지 모음이 포함된 음절을 사용하지 마세요. 금지 모음은 시작 전 공개됩니다.',
    editorType: 'text',
    rules: ['추첨된 모음이 포함된 음절 사용 금지', '위반 시 소프트 하이라이트로 표시됩니다'],
  },
  {
    id: 'lang-4',
    category: 'lang',
    title: '단일 모음의 노래',
    description: '오늘 일기 전체에서 오직 한 가지 모음만 사용하세요. 다른 모음이 들어간 단어는 하이라이트됩니다.',
    editorType: 'text',
    rules: ['오직 하나의 모음만 사용', '위반 단어 소프트 하이라이트'],
  },
  {
    id: 'lang-5',
    category: 'lang',
    title: '명사와 동사만 남기기',
    description: '형용사와 부사를 완전히 제거하고 명사와 동사만으로 오늘 하루를 기록하세요.',
    editorType: 'text',
    rules: ['형용사, 부사 사용 금지', '명사와 동사만 허용'],
  },
  {
    id: 'lang-6',
    category: 'lang',
    title: '초성 맞춤 일기',
    description: '각 문장의 첫 글자를 ㄱ, ㄴ, ㄷ, ㄹ, ㅁ… 순서로 이어가며 일기를 써 보세요.',
    editorType: 'text',
    rules: ['문장 첫 글자가 한국어 자음 순서를 따라야 함 (ㄱ→ㄴ→ㄷ→…)'],
  },
  {
    id: 'lang-7',
    category: 'lang',
    title: '외국어 전용 일기',
    description: '오늘 하루를 한국어가 아닌 외국어로만 기록하세요. 어떤 언어든 괜찮습니다.',
    editorType: 'text',
    rules: ['한국어 사용 금지', '외국어(영어, 일본어, 프랑스어 등)만 사용'],
  },

  // ── view — Perspective Shift (7) ────────────────────────────────────────────
  {
    id: 'view-1',
    category: 'view',
    title: '사물의 시선으로',
    description: '오늘 내가 사용한 사물(컵, 의자, 스마트폰…) 중 하나의 관점에서 하루를 써 보세요.',
    editorType: 'text',
  },
  {
    id: 'view-2',
    category: 'view',
    title: '미래의 나로부터',
    description: '10년 후의 내가 오늘을 돌아보며 쓰는 일기입니다. 과거형으로, 지금의 나에게 말 걸듯이.',
    editorType: 'text',
  },
  {
    id: 'view-3',
    category: 'view',
    title: '뉴스 기사 일기',
    description: '오늘 하루를 신문 기사 형식으로 써 보세요. 헤드라인, 소제목, 인터뷰 인용구를 포함하세요.',
    editorType: 'text',
  },
  {
    id: 'view-4',
    category: 'view',
    title: '3인칭 관찰자',
    description: '"그/그녀는 오늘…"로 시작하여, 나 자신을 제3자처럼 관찰하며 오늘 하루를 기록하세요.',
    editorType: 'text',
  },
  {
    id: 'view-5',
    category: 'view',
    title: '악당의 변명',
    description: '악당 캐릭터가 되어 오늘 하루의 모든 결정을 정당화하는 일기를 써 보세요.',
    editorType: 'text',
  },
  {
    id: 'view-6',
    category: 'view',
    title: '외계인에게 설명하기',
    description: '지구와 인간 문화를 전혀 모르는 외계인에게 오늘 하루를 설명하는 보고서를 작성하세요.',
    editorType: 'text',
  },
  {
    id: 'view-7',
    category: 'view',
    title: '역순 하루',
    description: '오늘 하루를 잠자리에서 시작해 아침으로 거슬러 올라가는 역순으로 기록하세요.',
    editorType: 'text',
  },

  // ── time — Volume / Time Pressure (8) ───────────────────────────────────────
  {
    id: 'time-1',
    category: 'time',
    title: '1500자 논스톱 타이핑',
    description: '백스페이스 없이 1500자에 도달할 때까지 멈추지 마세요. 실수해도 계속 앞으로만 나아가세요.',
    editorType: 'timed-text',
    charLimit: { min: 1500 },
    backspaceDisabled: true,
  },
  {
    id: 'time-2',
    category: 'time',
    title: '틈새 시간 한 줄 기록',
    description: '딱 50자 이내로 오늘의 핵심을 담으세요. 군더더기 없이 본질만.',
    editorType: 'text',
    charLimit: { max: 50 },
  },
  {
    id: 'time-3',
    category: 'time',
    title: '100자 요약의 달인',
    description: '정확히 90자에서 110자 사이로 오늘 하루를 요약하세요. 110자를 초과하면 빨간 하이라이트가 나타납니다.',
    editorType: 'text',
    charLimit: { min: 90, max: 110 },
  },
  {
    id: 'time-4',
    category: 'time',
    title: '30초 연상 폭발',
    description: '30초 동안 오늘 떠오르는 모든 것을 쏟아내세요. 생각할 시간은 없습니다.',
    editorType: 'timed-text',
    timerSeconds: 30,
  },
  {
    id: 'time-5',
    category: 'time',
    title: '가나다라 순서대로 쓰기',
    description: '각 문장을 한국어 자음 순서(ㄱ→ㄴ→ㄷ→…)로 시작하며 오늘 하루를 기록하세요.',
    editorType: 'text',
  },
  {
    id: 'time-6',
    category: 'time',
    title: '블랙아웃 시 쓰기',
    description: '화면이 완전히 어두워진 상태에서 써야 합니다. 무엇을 쓰는지 볼 수 없습니다. 저장할 때 비로소 내용이 드러납니다.',
    editorType: 'timed-text',
  },
  {
    id: 'time-7',
    category: 'time',
    title: '하루 세 줄 일기',
    description: '딱 세 줄만 씁니다: 오늘의 사실, 오늘의 감정, 오늘의 배움.',
    editorType: 'text',
  },
  {
    id: 'time-8',
    category: 'time',
    title: '5분 논스톱 라이팅',
    description: '5분 동안 멈추지 말고 계속 쓰세요. 타이머가 끝날 때까지 손을 떼지 마세요.',
    editorType: 'timed-text',
    timerSeconds: 300,
  },

  // ── visual — Non-verbal / Visual (6) ────────────────────────────────────────
  {
    id: 'visual-1',
    category: 'visual',
    title: '의미 없는 선 휘갈기기',
    description: '오늘의 감정이나 에너지를 의미 없는 선으로 표현하세요. 무엇인가를 그리려 하지 말고, 그냥 손이 가는 대로.',
    editorType: 'canvas',
  },
  {
    id: 'visual-2',
    category: 'visual',
    title: '이모티콘 상형문자',
    description: '오늘 하루를 이모티콘만으로 기록하세요. 텍스트는 사용할 수 없습니다.',
    editorType: 'emoji-only',
  },
  {
    id: 'visual-3',
    category: 'visual',
    title: '내 몸의 통증 그리기',
    description: '신체 윤곽을 그리고 오늘 아팠거나 긴장됐던 부위를 색칠하거나 표시하세요.',
    editorType: 'canvas',
  },
  {
    id: 'visual-4',
    category: 'visual',
    title: '반대 손으로 삐뚤빼뚤 쓰기',
    description: '평소 쓰지 않는 손으로 오늘 하루를 그림이나 글씨로 표현하세요. 완성도는 중요하지 않습니다.',
    editorType: 'canvas',
  },
  {
    id: 'visual-5',
    category: 'visual',
    title: '감정 온도 색칠하기',
    description: '슬라이더로 감정의 강도(크기)와 온도(색상)를 조절하여 캔버스에 원을 추가하세요. 여러 감정을 겹쳐 표현해 보세요.',
    editorType: 'canvas',
  },
  {
    id: 'visual-6',
    category: 'visual',
    title: '도형으로 하루 조립하기',
    description: '원, 삼각형, 사각형 등 기하학적 도형만으로 오늘 하루의 구조와 흐름을 표현하세요.',
    editorType: 'canvas',
  },

  // ── creative — Cognitive Detour (8) ─────────────────────────────────────────
  {
    id: 'creative-1',
    category: 'creative',
    title: '엉뚱한 영감 카드 뽑기',
    description: '아래 제시된 영감 카드에서 시작하여 자유롭게 오늘의 일기를 작성하세요.',
    editorType: 'text',
  },
  {
    id: 'creative-2',
    category: 'creative',
    title: '질문만으로 쓰기',
    description: '오늘 하루를 오직 질문문으로만 기록하세요. 단 하나의 서술문도 허용되지 않습니다.',
    editorType: 'text',
    rules: ['모든 문장이 물음표로 끝나야 함'],
  },
  {
    id: 'creative-3',
    category: 'creative',
    title: '한 번도 만난 적 없는 사람에게',
    description: '한 번도 만난 적 없지만 꼭 전하고 싶은 말이 있는 누군가에게 편지 형식으로 오늘 하루를 씁니다.',
    editorType: 'text',
  },
  {
    id: 'creative-4',
    category: 'creative',
    title: '레시피 형식 일기',
    description: '오늘 하루를 요리 레시피처럼 기록하세요. 재료, 순서, 조리 시간, 완성 이미지까지.',
    editorType: 'text',
  },
  {
    id: 'creative-5',
    category: 'creative',
    title: '내가 주인공인 신화',
    description: '나 자신을 주인공으로 한 짧은 신화를 창작하세요. 오늘 하루의 사건을 신화적 언어로 재해석하세요.',
    editorType: 'text',
  },
  {
    id: 'creative-6',
    category: 'creative',
    title: '대화만으로 쓰기',
    description: '오늘 하루를 오직 대화만으로 기록하세요. 서술이나 설명 없이 오직 말만으로.',
    editorType: 'text',
    rules: ['서술문 금지', '대화체("…"로 묶인 말)만 허용'],
  },
  {
    id: 'creative-7',
    category: 'creative',
    title: '마지막 날처럼',
    description: '오늘이 내 생의 마지막 날이라는 설정으로 일기를 쓰세요.',
    editorType: 'text',
  },
  {
    id: 'creative-8',
    category: 'creative',
    title: '"왜인지 모르겠지만…"으로 시작하기',
    description: '모든 문장을 "왜인지 모르겠지만…"으로 시작하세요.',
    editorType: 'trash',
    rules: ['모든 문장이 "왜인지 모르겠지만…"으로 시작해야 함'],
  },
]

export const CATEGORY_COLORS: Record<MissionCategory, { bg: string; text: string; border: string }> = {
  lang:     { bg: '#7c3aed', text: '#a78bfa', border: '#5b21b6' },
  view:     { bg: '#0891b2', text: '#67e8f9', border: '#0e7490' },
  time:     { bg: '#d97706', text: '#fcd34d', border: '#b45309' },
  visual:   { bg: '#db2777', text: '#f9a8d4', border: '#9d174d' },
  creative: { bg: '#65a30d', text: '#bef264', border: '#4d7c0f' },
}

export const CATEGORY_LABELS: Record<MissionCategory, string> = {
  lang:     '언어',
  view:     '시점',
  time:     '시간',
  visual:   '시각',
  creative: '창의',
}
