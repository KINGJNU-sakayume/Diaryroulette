import { useEffect, useRef, useState } from 'react'
import { missions, CATEGORY_COLORS } from '../../data/missions'

const ROW_HEIGHT = 64
const VISIBLE_ROWS = 5
const WINDOW_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS // 320px
const CENTER_ROW = 2 // 0-indexed center row (rows 0–4, center is row 2)
const REPEATS = 6 // how many times to repeat the mission list in the drum
const TARGET_REPEAT = 4 // which repetition the result lands on (0-indexed)
const SPIN_DURATION = 3000 // ms

// Build the long drum list: REPEATS * 36 items
const DRUM_ITEMS = Array.from({ length: REPEATS }, () => missions).flat()

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function computeFinalY(missionIndex: number): number {
  const targetDrumIndex = TARGET_REPEAT * missions.length + missionIndex
  // translateY to center the target item
  return -(targetDrumIndex * ROW_HEIGHT) + CENTER_ROW * ROW_HEIGHT
}

interface SlotMachinePickerProps {
  targetMissionId: string | null
  isSpinning: boolean
  onSpinComplete: () => void
}

export default function SlotMachinePicker({
  targetMissionId,
  isSpinning,
  onSpinComplete,
}: SlotMachinePickerProps) {
  const [translateY, setTranslateY] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle')
  const [centeredIndex, setCenteredIndex] = useState<number>(-1) // drum index of centered item

  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const startYRef = useRef(0)
  const endYRef = useRef(0)
  const onSpinCompleteRef = useRef(onSpinComplete)
  onSpinCompleteRef.current = onSpinComplete

  // Compute the final translateY whenever we know the target
  const missionIndex =
    targetMissionId !== null
      ? missions.findIndex((m) => m.id === targetMissionId)
      : -1
  const finalY = missionIndex >= 0 ? computeFinalY(missionIndex) : 0
  const finalDrumIndex = missionIndex >= 0 ? TARGET_REPEAT * missions.length + missionIndex : -1

  useEffect(() => {
    if (isSpinning && targetMissionId !== null && missionIndex >= 0) {
      // Cancel any existing animation
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      startTimeRef.current = null
      startYRef.current = translateY
      endYRef.current = finalY
      setPhase('spinning')

      function animate(timestamp: number) {
        if (!startTimeRef.current) startTimeRef.current = timestamp
        const elapsed = timestamp - startTimeRef.current
        const t = Math.min(elapsed / SPIN_DURATION, 1)
        const eased = easeOutCubic(t)
        const current = startYRef.current + (endYRef.current - startYRef.current) * eased
        setTranslateY(current)

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          // Land exactly on finalY
          setTranslateY(endYRef.current)
          setCenteredIndex(finalDrumIndex)
          // Bounce: +4px then back
          setPhase('done')
          // Apply bounce via a small translateY nudge
          requestAnimationFrame(() => {
            setTranslateY(endYRef.current + 4)
            setTimeout(() => {
              setTranslateY(endYRef.current)
              onSpinCompleteRef.current()
            }, 150)
          })
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    } else if (!isSpinning && targetMissionId !== null && missionIndex >= 0) {
      // Already drawn today — snap immediately to result
      setTranslateY(finalY)
      setCenteredIndex(finalDrumIndex)
      setPhase('done')
    } else if (!isSpinning && targetMissionId === null) {
      // Nothing drawn yet — show idle center (first mission)
      setTranslateY(CENTER_ROW * ROW_HEIGHT)
      setCenteredIndex(-1)
      setPhase('idle')
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, targetMissionId])

  return (
    <div
      style={{
        position: 'relative',
        width: 320,
        height: WINDOW_HEIGHT,
        overflow: 'hidden',
        background: 'rgba(13,17,23,0.90)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        border: '1px solid #30363d',
      }}
    >
      {/* Left-edge tick marks (slot machine feel) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: '#21262d',
          zIndex: 4,
        }}
      >
        {Array.from({ length: VISIBLE_ROWS }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * ROW_HEIGHT + ROW_HEIGHT / 2 - 1,
              left: 0,
              width: 8,
              height: 2,
              background: i === CENTER_ROW ? '#58a6ff' : '#30363d',
            }}
          />
        ))}
      </div>

      {/* Center highlight band */}
      <div
        style={{
          position: 'absolute',
          top: CENTER_ROW * ROW_HEIGHT,
          left: 0,
          right: 0,
          height: ROW_HEIGHT,
          background: 'rgba(88,166,255,0.06)',
          borderTop: '1px solid rgba(88,166,255,0.20)',
          borderBottom: '1px solid rgba(88,166,255,0.20)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Top fade */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 112,
          background: 'linear-gradient(to bottom, rgba(13,17,23,1) 0%, rgba(13,17,23,0) 100%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />
      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 112,
          background: 'linear-gradient(to top, rgba(13,17,23,1) 0%, rgba(13,17,23,0) 100%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Scrolling drum */}
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          willChange: 'transform',
        }}
      >
        {DRUM_ITEMS.map((mission, i) => {
          const isCenter = i === centeredIndex
          const colors = CATEGORY_COLORS[mission.category]
          return (
            <div
              key={i}
              style={{
                height: ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 20,
                paddingRight: 12,
                borderLeft: isCenter
                  ? `3px solid ${colors.border}`
                  : '3px solid transparent',
                opacity: isCenter ? 1 : 0.35,
                filter: isCenter ? 'none' : 'blur(1px)',
                transition: 'opacity 0.2s, filter 0.2s',
              }}
            >
              {isCenter && (
                <div
                  style={{
                    position: 'absolute',
                    left: 4,
                    top: CENTER_ROW * ROW_HEIGHT + 8,
                    bottom: (VISIBLE_ROWS - CENTER_ROW - 1) * ROW_HEIGHT + 8,
                    width: 3,
                    background: colors.bg,
                    borderRadius: 2,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isCenter ? 600 : 400,
                  color: isCenter ? '#e6edf3' : '#8b949e',
                  letterSpacing: '0.01em',
                  lineHeight: 1.3,
                  paddingLeft: 8,
                  userSelect: 'none',
                }}
              >
                {mission.title}
              </span>
              {isCenter && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    color: colors.text,
                    background: colors.bg + '33',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: '1px 6px',
                    flexShrink: 0,
                  }}
                >
                  {mission.category}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Idle placeholder when nothing has been drawn */}
      {phase === 'idle' && (
        <div
          style={{
            position: 'absolute',
            top: CENTER_ROW * ROW_HEIGHT,
            left: 0,
            right: 0,
            height: ROW_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: '#58a6ff', fontSize: 12, opacity: 0.7 }}>
            버튼을 눌러 미션을 뽑으세요
          </span>
        </div>
      )}
    </div>
  )
}
