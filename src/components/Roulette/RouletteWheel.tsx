import { useRef, useEffect, useCallback } from 'react'
import { missions, CATEGORY_COLORS, type Mission } from '../../data/missions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180

function sectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const x1 = cx + r * Math.cos(toRad(startDeg - 90))
  const y1 = cy + r * Math.sin(toRad(startDeg - 90))
  const x2 = cx + r * Math.cos(toRad(endDeg - 90))
  const y2 = cy + r * Math.sin(toRad(endDeg - 90))
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// ─── Category label abbreviations ─────────────────────────────────────────────

function missionLabel(mission: Mission): string {
  const prefix = mission.id.split('-')[0].charAt(0).toUpperCase()
  const num = mission.id.split('-')[1]
  return `${prefix}${num}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RouletteWheelProps {
  targetMissionId: string | null
  isSpinning: boolean
  onSpinComplete: () => void
  initialRotation?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RouletteWheel({
  targetMissionId,
  isSpinning,
  onSpinComplete,
  initialRotation = 0,
}: RouletteWheelProps) {
  const SIZE = 480
  const cx = SIZE / 2
  const cy = SIZE / 2
  const r = SIZE / 2 - 10

  const rotationRef = useRef(initialRotation)
  const groupRef = useRef<SVGGElement>(null)
  const animFrameRef = useRef<number>(0)

  const applyRotation = useCallback((deg: number) => {
    if (groupRef.current) {
      groupRef.current.style.transform = `rotate(${deg}deg)`
      groupRef.current.style.transformOrigin = `${cx}px ${cy}px`
    }
  }, [cx, cy])

  // Apply initial rotation on mount
  useEffect(() => {
    applyRotation(rotationRef.current)
  }, [applyRotation])

  useEffect(() => {
    if (!isSpinning || !targetMissionId) return

    const targetIdx = missions.findIndex((m) => m.id === targetMissionId)
    if (targetIdx === -1) return

    // Each sector is 10°; sector i starts at i*10 from the 12 o'clock position.
    // To land sector i at the top pointer, the wheel needs to rotate so that
    // the start of sector i is at 0° (top). That means: rotation = -(i * 10)
    // plus full rotations.
    const sectorOffset = -(targetIdx * 10) - 5 // center of sector at top
    const currentRot = rotationRef.current
    const fullTurns = Math.ceil((currentRot - sectorOffset) / 360 + 5) * 360
    const targetRot = sectorOffset + fullTurns

    const SPIN_DURATION = 4000 // ms
    const BOUNCE_DURATION = 600 // ms
    let startTime: number | null = null

    cancelAnimationFrame(animFrameRef.current)

    function spinFrame(ts: number) {
      if (startTime === null) startTime = ts
      const elapsed = ts - startTime
      const t = Math.min(elapsed / SPIN_DURATION, 1)
      const progress = easeOutCubic(t)
      const current = currentRot + (targetRot - currentRot) * progress

      rotationRef.current = current
      applyRotation(current)

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(spinFrame)
      } else {
        // Spring bounce phase
        let bounceStart: number | null = null

        function bounceFrame(ts2: number) {
          if (bounceStart === null) bounceStart = ts2
          const bt = Math.min((ts2 - bounceStart) / BOUNCE_DURATION, 1)
          // Damped spring: overshoot 8° then settle
          const overshoot = Math.sin(bt * Math.PI) * 8 * (1 - bt)
          applyRotation(targetRot + overshoot)

          if (bt < 1) {
            animFrameRef.current = requestAnimationFrame(bounceFrame)
          } else {
            rotationRef.current = targetRot
            applyRotation(targetRot)
            onSpinComplete()
          }
        }

        animFrameRef.current = requestAnimationFrame(bounceFrame)
      }
    }

    animFrameRef.current = requestAnimationFrame(spinFrame)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [isSpinning, targetMissionId, applyRotation, onSpinComplete])

  return (
    <div className="relative inline-block">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="max-w-full"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r + 8} fill="#1e2530" stroke="#30363d" strokeWidth="2" />

        {/* Rotating wheel group */}
        <g ref={groupRef}>
          {missions.map((mission, i) => {
            const startDeg = i * 10
            const endDeg = (i + 1) * 10
            const color = CATEGORY_COLORS[mission.category].bg
            const midDeg = startDeg + 5 - 90
            const labelR = r * 0.75
            const lx = cx + labelR * Math.cos(toRad(midDeg))
            const ly = cy + labelR * Math.sin(toRad(midDeg))

            return (
              <g key={mission.id}>
                <path
                  d={sectorPath(cx, cy, r, startDeg, endDeg)}
                  fill={color}
                  stroke="#0d1117"
                  strokeWidth="1.5"
                  opacity={mission.id === targetMissionId ? 1 : 0.85}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill="rgba(255,255,255,0.9)"
                  transform={`rotate(${midDeg + 90}, ${lx}, ${ly})`}
                >
                  {missionLabel(mission)}
                </text>
              </g>
            )
          })}

          {/* Center circle */}
          <circle cx={cx} cy={cy} r={28} fill="#0d1117" stroke="#30363d" strokeWidth="2" />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#e6edf3"
            fontFamily="serif"
          >
            룰렛
          </text>
        </g>

        {/* Fixed pointer arrow — outside rotating group */}
        <polygon
          points={`${cx},${cy - r - 2} ${cx - 10},${cy - r - 22} ${cx + 10},${cy - r - 22}`}
          fill="#facc15"
          filter="drop-shadow(0 0 4px #facc1580)"
        />
        <circle cx={cx} cy={cy - r - 22} r={4} fill="#facc15" />
      </svg>
    </div>
  )
}
