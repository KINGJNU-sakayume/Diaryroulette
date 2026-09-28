import { useEffect, useRef } from 'react'
import { missions, type Mission } from '../../data/missions'
import { CATEGORIES, CATEGORY_ORDER } from '../../data/categories'

const ROW = 56
const VISIBLE = 5
const CENTER = 2
const REPEATS = 4
/** 결과가 멈추는 반복 회차 — 충분히 돌아가 보이도록 뒤쪽 회차에 착지 */
const TARGET_REPEAT = 2
const SPIN_MS = 2800

/** 같은 카테고리가 몰려 보이지 않게 카테고리를 번갈아 늘어놓는다 */
function interleave(list: Mission[]): Mission[] {
  const buckets = CATEGORY_ORDER.map((c) => list.filter((m) => m.category === c))
  const out: Mission[] = []
  for (let i = 0; out.length < list.length; i++) {
    for (const b of buckets) if (b[i]) out.push(b[i])
  }
  return out
}

const ORDER = interleave(missions)
const DRUM = Array.from({ length: REPEATS }, () => ORDER).flat()
/** 대기 중에는 두 번째 회차 첫 칸을 가운데 두어 위아래가 비어 보이지 않게 한다 */
const IDLE_Y = -(ORDER.length * ROW) + CENTER * ROW

function finalYFor(index: number) {
  return -((TARGET_REPEAT * ORDER.length + index) * ROW) + CENTER * ROW
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

interface SlotMachinePickerProps {
  targetMissionId: string | null
  spinning: boolean
  onSpinComplete: () => void
}

export default function SlotMachinePicker({ targetMissionId, spinning, onSpinComplete }: SlotMachinePickerProps) {
  const drumRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onSpinComplete)
  useEffect(() => {
    onCompleteRef.current = onSpinComplete
  }, [onSpinComplete])

  const targetIndex = targetMissionId ? ORDER.findIndex((m) => m.id === targetMissionId) : -1
  const landedIndex = !spinning && targetIndex >= 0 ? TARGET_REPEAT * ORDER.length + targetIndex : -1
  const restingY = !spinning && targetIndex >= 0 ? finalYFor(targetIndex) : IDLE_Y

  useEffect(() => {
    if (!spinning || targetIndex < 0) return
    const drum = drumRef.current
    const endY = finalYFor(targetIndex)
    if (!drum || prefersReducedMotion()) {
      onCompleteRef.current()
      return
    }

    let raf = 0
    let start: number | null = null
    const frame = (ts: number) => {
      if (start === null) start = ts
      const t = Math.min((ts - start) / SPIN_MS, 1)
      drum.style.transform = `translateY(${IDLE_Y + (endY - IDLE_Y) * easeOutQuart(t)}px)`
      if (t < 1) raf = requestAnimationFrame(frame)
      else onCompleteRef.current()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [spinning, targetIndex])

  return (
    <div
      className="relative w-full max-w-[360px] overflow-hidden rounded-2xl border border-line bg-surface"
      style={{ height: ROW * VISIBLE }}
      aria-hidden="true"
    >
      {targetIndex < 0 && !spinning && (
        <div
          className="absolute inset-x-3 z-10 flex items-center justify-center rounded-xl bg-surface text-sm text-muted"
          style={{ top: CENTER * ROW + 4, height: ROW - 8 }}
        >
          어떤 미션이 나올까요?
        </div>
      )}
      {/* 가운데 결과 칸 표시 */}
      <div
        className="pointer-events-none absolute inset-x-3 z-10 rounded-xl border-2 border-accent"
        style={{ top: CENTER * ROW + 4, height: ROW - 8 }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{ height: ROW * 1.6, background: 'linear-gradient(var(--color-surface), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        style={{ height: ROW * 1.6, background: 'linear-gradient(transparent, var(--color-surface))' }}
      />

      <div ref={drumRef} style={{ transform: `translateY(${restingY}px)`, willChange: 'transform' }}>
        {DRUM.map((mission, i) => {
          const landed = i === landedIndex
          const meta = CATEGORIES[mission.category]
          return (
            <div key={i} className="flex items-center gap-3 px-6" style={{ height: ROW }}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
              <span
                className={`min-w-0 flex-1 truncate ${
                  landed ? 'font-serif text-base font-bold text-ink' : 'text-[15px] text-muted'
                }`}
              >
                {mission.title}
              </span>
              {landed && <span className="shrink-0 text-xs text-muted">{meta.label}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
