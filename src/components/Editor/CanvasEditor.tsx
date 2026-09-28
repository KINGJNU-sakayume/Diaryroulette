import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, Eraser, Minus, PaintBucket, Pen, Square, Trash2, Triangle, Undo2 } from 'lucide-react'
import type { CanvasMode } from '../../data/missions'

export interface CanvasApi {
  /** 저장할 PNG(dataURL). 아무것도 그리지 않았으면 null. */
  getDataUrl: () => string | null
}

export const CANVAS_W = 800
export const CANVAS_H = 600
/** 종이색은 테마와 무관하게 고정 — 어느 테마에서 봐도 그림이 똑같이 보인다 */
const PAPER = '#fbf8f2'
const INK = '#2b2724'
const PALETTE = [INK, '#c0392b', '#e07b39', '#e3b23c', '#5b8c4a', '#3d6fa8', '#7a5ba6', '#d46a8c']
const MONO_HUES = [0, 22, 42, 95, 140, 172, 198, 218, 245, 275, 305, 335]
const MONO_LIGHTNESS = [20, 32, 44, 56, 68, 80]

type Shape = 'rect' | 'ellipse' | 'triangle' | 'line'
type Op =
  | { t: 'path'; color: string; size: number; erase: boolean; pts: number[] }
  | { t: 'shape'; shape: Shape; color: string; size: number; fill: boolean; x1: number; y1: number; x2: number; y2: number }
  | { t: 'blob'; x: number; y: number; r: number; hue: number }
  | { t: 'clear' }

// ─── 그리기 함수 ──────────────────────────────────────────────────────────────

function drawPath(ctx: CanvasRenderingContext2D, op: Extract<Op, { t: 'path' }>, from = 0) {
  const p = op.pts
  ctx.save()
  if (op.erase) ctx.globalCompositeOperation = 'destination-out'
  ctx.strokeStyle = op.color
  ctx.fillStyle = op.color
  ctx.lineWidth = op.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (p.length === 2) {
    ctx.arc(p[0], p[1], op.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    const start = Math.max(0, from - 2)
    ctx.moveTo(p[start], p[start + 1])
    for (let i = start + 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
    ctx.stroke()
  }
  ctx.restore()
}

function drawShape(ctx: CanvasRenderingContext2D, op: Extract<Op, { t: 'shape' }>) {
  const { x1, y1, x2, y2 } = op
  ctx.save()
  ctx.strokeStyle = op.color
  ctx.fillStyle = op.color
  ctx.lineWidth = op.size
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (op.shape === 'rect') {
    ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
  } else if (op.shape === 'ellipse') {
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2)
  } else if (op.shape === 'triangle') {
    ctx.moveTo((x1 + x2) / 2, Math.min(y1, y2))
    ctx.lineTo(Math.max(x1, x2), Math.max(y1, y2))
    ctx.lineTo(Math.min(x1, x2), Math.max(y1, y2))
    ctx.closePath()
  } else {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  if (op.fill && op.shape !== 'line') ctx.fill()
  else ctx.stroke()
  ctx.restore()
}

function drawBlob(ctx: CanvasRenderingContext2D, op: Extract<Op, { t: 'blob' }>) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2)
  ctx.fillStyle = `hsla(${op.hue}, 78%, 58%, 0.55)`
  ctx.strokeStyle = `hsl(${op.hue}, 65%, 42%)`
  ctx.lineWidth = 2
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

// 정면에서 본 사람 윤곽(왼쪽 절반). 오른쪽은 x=400을 기준으로 뒤집는다.
const BODY_LEFT = [
  [386, 124], [386, 146], [336, 158], [314, 172], [300, 222], [290, 292], [280, 362], [274, 398], [266, 422],
  [274, 442], [290, 434], [294, 400], [304, 334], [314, 276], [326, 226], [336, 296], [334, 356], [336, 398],
  [344, 476], [352, 556], [352, 572], [344, 588], [384, 588], [384, 570], [390, 476], [400, 404],
]

function drawBodyGuide(ctx: CanvasRenderingContext2D) {
  const right = BODY_LEFT.slice(0, -1).reverse().map(([x, y]) => [CANVAS_W - x, y])
  const pts = [...BODY_LEFT, ...right]
  ctx.save()
  ctx.strokeStyle = '#b3a797'
  ctx.lineWidth = 3
  ctx.setLineDash([10, 8])
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.ellipse(400, 80, 36, 44, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0], last[1])
  ctx.stroke()
  ctx.restore()
}

function ctxOf(el: HTMLCanvasElement | null) {
  return el?.getContext('2d') ?? null
}

function lastClearIndex(ops: Op[]) {
  for (let i = ops.length - 1; i >= 0; i--) if (ops[i].t === 'clear') return i
  return -1
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface CanvasEditorProps {
  mode: CanvasMode
  guide?: 'body'
  initialDataUrl?: string | null
  /** 한 가지 색 모드에서 고른 색상(hue) */
  initialHue?: number
  apiRef: React.MutableRefObject<CanvasApi | null>
  onChange: (state: { empty: boolean; hue?: number }) => void
}

type Tool = 'pen' | 'eraser' | Shape

export default function CanvasEditor({ mode, guide, initialDataUrl, initialHue, apiRef, onChange }: CanvasEditorProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)
  const opsRef = useRef<Op[]>([])
  const baseRef = useRef<HTMLImageElement | null>(null)
  const activeRef = useRef<{ id: number; op: Op; snapshot?: ImageData } | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const [loading, setLoading] = useState(Boolean(initialDataUrl))
  const [opCount, setOpCount] = useState(0)
  const [empty, setEmpty] = useState(!initialDataUrl)
  const [tool, setTool] = useState<Tool>(mode === 'shapes' ? 'rect' : 'pen')
  const [color, setColor] = useState(INK)
  const [size, setSize] = useState(mode === 'shapes' ? 6 : 8)
  const [fill, setFill] = useState(false)
  const [hue, setHue] = useState<number | null>(initialHue ?? null)
  const [shade, setShade] = useState(2)
  const [blobSize, setBlobSize] = useState(45)
  const [temperature, setTemperature] = useState(50)

  const isEmpty = useCallback(() => {
    const ops = opsRef.current
    const lc = lastClearIndex(ops)
    if (lc === -1 && baseRef.current) return false
    return !ops.slice(lc + 1).some((o) => o.t !== 'clear' && !(o.t === 'path' && o.erase))
  }, [])

  const renderAll = useCallback(() => {
    const c = ctxOf(canvasElRef.current)
    if (!c) return
    c.clearRect(0, 0, CANVAS_W, CANVAS_H)
    const ops = opsRef.current
    const lc = lastClearIndex(ops)
    if (lc === -1 && baseRef.current) c.drawImage(baseRef.current, 0, 0)
    else if (guide === 'body') drawBodyGuide(c)
    for (const op of ops.slice(lc + 1)) {
      if (op.t === 'path') drawPath(c, op)
      else if (op.t === 'shape') drawShape(c, op)
      else if (op.t === 'blob') drawBlob(c, op)
    }
  }, [guide])

  const commit = useCallback(
    (hueOverride?: number | null) => {
      const nowEmpty = isEmpty()
      setOpCount(opsRef.current.length)
      setEmpty(nowEmpty)
      const h = hueOverride === undefined ? hue : hueOverride
      onChangeRef.current({ empty: nowEmpty, hue: h ?? undefined })
    },
    [isEmpty, hue],
  )

  // 처음 한 번: 이어 쓰는 그림이 있으면 불러오고, 없으면 밑그림만 그린다
  useEffect(() => {
    if (!initialDataUrl) {
      renderAll()
      return
    }
    const img = new Image()
    img.onload = () => {
      baseRef.current = img
      renderAll()
      setLoading(false)
    }
    img.onerror = () => {
      renderAll()
      setLoading(false)
      setEmpty(true)
      onChangeRef.current({ empty: true })
    }
    img.src = initialDataUrl
    // 처음 마운트할 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    apiRef.current = {
      getDataUrl: () => {
        const el = canvasElRef.current
        if (!el || isEmpty()) return null
        const out = document.createElement('canvas')
        out.width = CANVAS_W
        out.height = CANVAS_H
        const o = out.getContext('2d')
        if (!o) return null
        o.fillStyle = PAPER
        o.fillRect(0, 0, CANVAS_W, CANVAS_H)
        o.drawImage(el, 0, 0)
        return out.toDataURL('image/png')
      },
    }
  }, [apiRef, isEmpty])

  const posOf = (e: { clientX: number; clientY: number }) => {
    const rect = canvasElRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    }
  }

  const monoColor = (h: number, l: number) => `hsl(${h}, 55%, ${l}%)`
  const currentColor = mode === 'mono' && hue !== null ? monoColor(hue, MONO_LIGHTNESS[shade]) : color
  const blobHue = Math.round(220 - temperature * 2.2)
  const blobRadius = 14 + (blobSize / 100) * 90

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (loading || activeRef.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const c = ctxOf(canvasElRef.current)
    if (!c) return
    const { x, y } = posOf(e)

    if (mode === 'emotion') {
      const op: Op = { t: 'blob', x, y, r: blobRadius, hue: blobHue }
      opsRef.current.push(op)
      drawBlob(c, op)
      commit()
      return
    }
    if (mode === 'mono' && hue === null) return

    e.currentTarget.setPointerCapture(e.pointerId)
    if (tool === 'pen' || tool === 'eraser') {
      const erase = tool === 'eraser'
      const op: Op = { t: 'path', color: currentColor, size: erase ? size * 2.5 : size, erase, pts: [x, y] }
      drawPath(c, op)
      activeRef.current = { id: e.pointerId, op }
    } else {
      const op: Op = { t: 'shape', shape: tool, color: currentColor, size, fill, x1: x, y1: y, x2: x, y2: y }
      activeRef.current = { id: e.pointerId, op, snapshot: c.getImageData(0, 0, CANVAS_W, CANVAS_H) }
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeRef.current
    if (!active || active.id !== e.pointerId) return
    const c = ctxOf(canvasElRef.current)
    if (!c) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    const { op } = active
    if (op.t === 'path') {
      const from = op.pts.length
      for (const ev of events.length ? events : [e.nativeEvent]) {
        const { x, y } = posOf(ev)
        op.pts.push(x, y)
      }
      drawPath(c, op, from)
    } else if (op.t === 'shape' && active.snapshot) {
      const { x, y } = posOf(e)
      op.x2 = x
      op.y2 = y
      c.putImageData(active.snapshot, 0, 0)
      drawShape(c, op)
    }
  }

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeRef.current
    if (!active || active.id !== e.pointerId) return
    activeRef.current = null
    const { op } = active
    if (op.t === 'shape') {
      // 끌지 않고 톡 누르기만 하면 적당한 크기로 찍어 준다
      if (Math.abs(op.x2 - op.x1) < 8 && Math.abs(op.y2 - op.y1) < 8) {
        const half = 50
        const cx = op.x1
        const cy = op.y1
        op.x1 = cx - half
        op.x2 = cx + half
        op.y1 = op.shape === 'line' ? cy : cy - half
        op.y2 = op.shape === 'line' ? cy : cy + half
      }
      const c = ctxOf(canvasElRef.current)
      if (c && active.snapshot) {
        c.putImageData(active.snapshot, 0, 0)
        drawShape(c, op)
      }
    }
    opsRef.current.push(op)
    commit()
  }

  const undo = () => {
    if (!opsRef.current.length) return
    opsRef.current.pop()
    renderAll()
    commit()
  }

  const clear = () => {
    if (isEmpty()) return
    opsRef.current.push({ t: 'clear' })
    renderAll()
    commit()
  }

  const pickHue = (h: number) => {
    setHue(h)
    commit(h)
  }

  // 한 가지 색 모드: 그리기 시작하면 색을 바꿀 수 없다
  const hueLocked = mode === 'mono' && hue !== null && !empty

  return (
    <div className="flex flex-col gap-3">
      <div className="panel flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
        {mode === 'mono' && !hueLocked && (
          <div className="w-full">
            <p className="mb-2 text-sm text-ink-mid">{hue === null ? '먼저 오늘의 색을 골라 주세요' : '오늘의 색 (그리기 시작하면 고정돼요)'}</p>
            <div className="flex flex-wrap gap-2">
              {MONO_HUES.map((h) => (
                <Swatch key={h} color={monoColor(h, 50)} selected={hue === h} onClick={() => pickHue(h)} label={`색상 ${h}`} />
              ))}
            </div>
          </div>
        )}

        {mode === 'shapes' && (
          <ToolGroup label="도형">
            <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} label="네모"><Square className="h-4 w-4" /></ToolButton>
            <ToolButton active={tool === 'ellipse'} onClick={() => setTool('ellipse')} label="동그라미"><Circle className="h-4 w-4" /></ToolButton>
            <ToolButton active={tool === 'triangle'} onClick={() => setTool('triangle')} label="세모"><Triangle className="h-4 w-4" /></ToolButton>
            <ToolButton active={tool === 'line'} onClick={() => setTool('line')} label="선"><Minus className="h-4 w-4" /></ToolButton>
            <ToolButton active={fill} onClick={() => setFill((f) => !f)} label="속 채우기"><PaintBucket className="h-4 w-4" /></ToolButton>
          </ToolGroup>
        )}

        {(mode === 'free' || (mode === 'mono' && hue !== null)) && (
          <ToolGroup label="도구">
            <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} label="펜"><Pen className="h-4 w-4" /></ToolButton>
            <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} label="지우개"><Eraser className="h-4 w-4" /></ToolButton>
          </ToolGroup>
        )}

        {(mode === 'free' || mode === 'shapes') && (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="색">
            {PALETTE.map((c, i) => (
              <Swatch
                key={c}
                color={c}
                selected={color === c}
                label={`색 ${i + 1}`}
                onClick={() => {
                  setColor(c)
                  if (tool === 'eraser') setTool('pen')
                }}
              />
            ))}
          </div>
        )}

        {mode === 'mono' && hue !== null && (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="진하기">
            {MONO_LIGHTNESS.map((l, i) => (
              <Swatch
                key={l}
                color={monoColor(hue, l)}
                selected={shade === i}
                label={`진하기 ${i + 1}`}
                onClick={() => {
                  setShade(i)
                  if (tool === 'eraser') setTool('pen')
                }}
              />
            ))}
          </div>
        )}

        {mode !== 'emotion' && (
          <label className="flex items-center gap-2 text-sm text-muted">
            굵기
            <input type="range" min={2} max={28} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24 accent-[var(--color-accent)]" />
          </label>
        )}

        {mode === 'emotion' && (
          <div className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm text-ink-mid">
              감정의 세기 (크기)
              <input type="range" min={0} max={100} value={blobSize} onChange={(e) => setBlobSize(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-accent)]" />
            </label>
            <label className="text-sm text-ink-mid">
              <span className="flex justify-between">
                <span>차가움</span>
                <span>온도</span>
                <span>뜨거움</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="temperature-range mt-1 h-2 w-full cursor-pointer appearance-none rounded-full"
                style={{ background: 'linear-gradient(to right, hsl(220,78%,58%), hsl(165,78%,50%), hsl(110,70%,50%), hsl(50,85%,55%), hsl(0,78%,58%))' }}
              />
            </label>
            <span
              className="mx-auto shrink-0 rounded-full border-2"
              style={{
                width: 20 + blobSize * 0.3,
                height: 20 + blobSize * 0.3,
                background: `hsla(${blobHue}, 78%, 58%, 0.55)`,
                borderColor: `hsl(${blobHue}, 65%, 42%)`,
              }}
              aria-hidden="true"
            />
          </div>
        )}

        <div className="ml-auto flex gap-1">
          <button type="button" onClick={undo} disabled={opCount === 0} className="btn-ghost px-3 py-2 text-sm" aria-label="되돌리기">
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">되돌리기</span>
          </button>
          <button type="button" onClick={clear} disabled={empty} className="btn-ghost px-3 py-2 text-sm" aria-label="모두 지우기">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">모두 지우기</span>
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-line" style={{ background: PAPER }}>
        <canvas
          ref={(el) => {
            // 언마운트 뒤에도 마지막 그림을 꺼낼 수 있도록 요소를 붙잡아 둔다
            if (el) canvasElRef.current = el
          }}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          className="block w-full touch-none"
          style={{
            aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
            cursor: mode === 'mono' && hue === null ? 'not-allowed' : 'crosshair',
            opacity: loading ? 0.5 : 1,
          }}
          role="img"
          aria-label="그림판"
        />
        {loading && <p className="absolute inset-0 flex items-center justify-center text-sm text-[#877c71]">그림을 불러오는 중…</p>}
        {mode === 'emotion' && empty && !loading && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-[#877c71]">캔버스를 누르면 원이 찍혀요</p>
        )}
      </div>
    </div>
  )
}

function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {children}
    </div>
  )
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        active ? 'bg-accent text-accent-on' : 'text-ink-mid hover:bg-card'
      }`}
    >
      {children}
    </button>
  )
}

function Swatch({ color, selected, onClick, label }: { color: string; selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className="h-7 w-7 rounded-full transition-transform hover:scale-110"
      style={{
        background: color,
        boxShadow: selected ? `0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-text)` : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
      }}
    />
  )
}
