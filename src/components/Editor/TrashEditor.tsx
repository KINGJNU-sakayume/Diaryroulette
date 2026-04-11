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

export default function TrashEditor({ value, onChange, onShred }: TrashEditorProps) {
  const [shredding, setShredding] = useState(false)
  const [shredChars, setShredChars] = useState<ShredChar[]>([])
  const [done, setDone] = useState(false)

  const handleShred = useCallback(() => {
    if (!value.trim()) return
    const chars: ShredChar[] = (value.match(/.{1,3}/gs) ?? []).map((char, i) => ({
      char,
      id: i,
      dx: (Math.random() - 0.5) * 300,
      delay: Math.random() * 0.5,
    }))
    setShredChars(chars)
    setShredding(true)

    setTimeout(() => {
      setShredding(false)
      setShredChars([])
      setDone(true)
      onShred()
    }, 2000)
  }, [value, onShred])

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-48 gap-4">
        <Flame className="w-16 h-16 text-orange-500 animate-pulse" />
        <p className="text-2xl font-bold text-orange-400">🔥 소각 완료</p>
        <p className="text-sm text-slate-500">글이 영원히 사라졌습니다.</p>
      </div>
    )
  }

  if (shredding) {
    return (
      <div className="relative min-h-48 overflow-hidden rounded-xl bg-[#161b22] border border-[#30363d] p-4">
        <div className="flex flex-wrap gap-0">
          {shredChars.map((sc) => (
            <span
              key={sc.id}
              className="inline-block text-sm text-slate-300"
              style={{
                animation: `shred 1.5s ease-in ${sc.delay}s forwards`,
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
          background: '#161b22',
          borderColor: '#30363d',
          color: '#e6edf3',
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
