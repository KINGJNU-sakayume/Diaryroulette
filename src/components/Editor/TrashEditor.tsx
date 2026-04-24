import { useState, useCallback } from 'react'
import { Flame } from 'lucide-react'

interface TrashEditorProps {
  value: string
  onChange: (val: string) => void
  onShred: () => void
}

interface ShredChar {
  char: string
  id: number
  dx: number
  delay: number
}

/**
 * value를 파쇄 애니메이션용 청크로 나눈다.
 *
 * 이전 구현(`/.{1,3}/gs`)은 UTF-16 code unit 기준 3개씩이라:
 *   - 한글 syllable은 괜찮지만 이모지(특히 ZWJ 시퀀스)는 중간에 쪼개짐
 *   - 개행이 청크 중간에 섞이면 단일 개행 체크(`sc.char === '\n' ? ' ' : sc.char`)로 잡히지 않음
 *   - 한글 + 자모 조합이 깨질 수 있음
 *
 * Intl.Segmenter로 grapheme 경계를 맞춘 뒤 2개씩 묶으면 사용자가 인식하는
 * "한 글자" 단위로 자연스럽게 파쇄된다. 개행은 별도 청크로 분리되어 공백으로 표시된다.
 */
function splitIntoShredChunks(value: string): ShredChar[] {
  const graphemes: string[] =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined'
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(
          (s) => s.segment,
        )
      : [...value] // fallback: 코드포인트 분해(ZWJ는 깨지지만 최소 작동)

  const chunks: ShredChar[] = []
  let id = 0
  // 2 grapheme씩 묶음. 개행은 독립 청크로 분리해서 공백 렌더 로직이 적중하도록.
  let i = 0
  while (i < graphemes.length) {
    if (graphemes[i] === '\n') {
      chunks.push({
        char: '\n',
        id: id++,
        dx: (Math.random() - 0.5) * 300,
        delay: Math.random() * 0.5,
      })
      i += 1
    } else {
      const group: string[] = []
      while (group.length < 2 && i < graphemes.length && graphemes[i] !== '\n') {
        group.push(graphemes[i])
        i += 1
      }
      chunks.push({
        char: group.join(''),
        id: id++,
        dx: (Math.random() - 0.5) * 300,
        delay: Math.random() * 0.5,
      })
    }
  }
  return chunks
}

export default function TrashEditor({ value, onChange, onShred }: TrashEditorProps) {
  const [shredding, setShredding] = useState(false)
  const [shredChars, setShredChars] = useState<ShredChar[]>([])
  const [done, setDone] = useState(false)

  const handleShred = useCallback(() => {
    if (!value.trim()) return
    setShredChars(splitIntoShredChunks(value))
    setShredding(true)

    // prefers-reduced-motion 사용자에겐 애니메이션을 기다리지 않고 즉시 완료.
    // (CSS @keyframes shred는 전역 규칙으로 이미 0.01ms로 단축되지만, setTimeout은
    //  별도로 처리해야 "shredding" 상태가 2초간 지속되는 것을 방지할 수 있음.)
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reducedMotion ? 0 : 2000

    setTimeout(() => {
      setShredding(false)
      setShredChars([])
      setDone(true)
      onShred()
    }, duration)
  }, [value, onShred])

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-48 gap-4">
        <Flame className="w-16 h-16 text-orange-500 animate-pulse" />
        <p className="text-2xl font-bold text-orange-400">🔥 소각 완료</p>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          글이 영원히 사라졌습니다.
        </p>
      </div>
    )
  }

  if (shredding) {
    return (
      <div
        className="relative min-h-48 overflow-hidden rounded-xl border p-4"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap gap-0">
          {shredChars.map((sc) => (
            <span
              key={sc.id}
              className="inline-block text-sm"
              style={{
                animation: `shred 1.5s ease-in ${sc.delay}s forwards`,
                color: 'var(--color-text-mid)',
                '--dx': `${sc.dx}px`,
              } as React.CSSProperties}
            >
              {sc.char === '\n' ? ' ' : sc.char}
            </span>
          ))}
        </div>
        <style>{`
          @keyframes shred {
            0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(200px) translateX(var(--dx)) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="text-xs text-orange-400 bg-orange-900/20 border border-orange-800/40 rounded-lg px-3 py-2"
      >
        🔥 이 일기는 저장되지 않습니다. 파쇄하면 내용이 영원히 사라집니다.
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="쏟아내고 싶은 것들을 여기에 써 보세요. 아무도 보지 않습니다…"
        className="w-full min-h-64 p-4 rounded-xl border text-sm leading-relaxed resize-y outline-none"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
          fontFamily: 'inherit',
        }}
      />

      <button
        type="button"
        onClick={handleShred}
        disabled={!value.trim()}
        className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #dc2626, #ea580c)',
          color: '#fff',
        }}
      >
        <Flame className="w-5 h-5" />
        파쇄하기
      </button>
    </div>
  )
}
