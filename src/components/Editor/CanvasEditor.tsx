import { useRef, useEffect, useState, useCallback } from 'react'
import { Pen, Eraser, Trash2, Plus } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface CanvasEditorProps {
  initialDataUrl?: string | null
  onSave?: (dataUrl: string) => void
  isEmotionTemp?: boolean // visual-5 special UI
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 450
// 펜 색 팔레트. 첫 번째 색은 테마에 따라 동적으로 교체됨(다크=흰, 라이트=검정)
// 나머지 7개는 테마 중립적인 채도 높은 색.
const COLORS_DARK_DEFAULT = '#e6edf3'  // 다크 테마의 기본 펜 색 (거의 흰색)
const COLORS_LIGHT_DEFAULT = '#1c1510' // 라이트 테마의 기본 펜 색 (거의 검정)
const COLORS_ACCENT = ['#ef4444', '#f97316', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

export default function CanvasEditor({ initialDataUrl, onSave, isEmotionTemp = false }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const { theme } = useTheme()

  // 테마에 따른 기본 펜 색. 팔레트는 [기본색, ...7개 액센트]
  const defaultPenColor = theme === 'light' ? COLORS_LIGHT_DEFAULT : COLORS_DARK_DEFAULT
  const COLORS = [defaultPenColor, ...COLORS_ACCENT]

  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [color, setColor] = useState<string>(defaultPenColor)
  const [brushSize, setBrushSize] = useState(6)

  // 테마가 바뀔 때 "기본 펜 색"을 선택 중이었다면 새 기본 펜 색으로 교체
  // (사용자가 명시적으로 고른 액센트 색은 유지)
  useEffect(() => {
    if (color === COLORS_DARK_DEFAULT || color === COLORS_LIGHT_DEFAULT) {
      setColor(defaultPenColor)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  // Emotion temperature sliders (visual-5)
  const [intensity, setIntensity] = useState(50)  // 0–100 → radius 5–60
  const [hue, setHue] = useState(200)             // 0–360 → HSL color
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null)

  // 초기 이미지 로드 중에는 사용자 입력을 차단한다. img.onload는 비동기이므로,
  // 사용자가 로드 완료 전에 붓을 대면 이후 drawImage가 사용자의 스트로크를
  // 덮어써 사라지게 한다. initialDataUrl이 없으면 처음부터 false.
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(!!initialDataUrl)

  // Initialize canvas — 투명 배경으로 시작.
  // initialDataUrl이 있으면 그대로 그려넣음(이전 JPEG 드로잉의 배경은 그대로 유지됨,
  // 하위 호환). 새 캔버스는 투명 상태로 유지되어 테마 전환과 무관하게 표시된다.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (initialDataUrl) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        setIsLoadingImage(false)
      }
      img.onerror = () => {
        // 로드 실패해도 최소한 사용자 입력은 허용
        setIsLoadingImage(false)
      }
      img.src = initialDataUrl
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isEmotionTemp) {
      const pos = getPos(e)
      setPendingClick({ x: pos.x, y: pos.y })
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPos.current = getPos(e)

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)

    // 지우개는 destination-out으로 실제 픽셀을 투명화. 브러시는 source-over(기본).
    ctx.save()
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    }
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, (tool === 'eraser' ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2)
    ctx.fillStyle = color  // eraser에서는 color 값이 무시됨(destination-out이 alpha만 본다)
    ctx.fill()
    ctx.restore()
  }, [isEmotionTemp, tool, color, brushSize, getPos])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    const last = lastPos.current ?? pos

    ctx.save()
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    }
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = color  // eraser는 alpha만 사용
    ctx.lineWidth = tool === 'eraser' ? brushSize * 2 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.restore()

    lastPos.current = pos
  }, [tool, color, brushSize, getPos])

  // ─── Debounced save ──────────────────────────────────────────────────────
  // toDataURL('image/png')은 800×450 캔버스 전체를 직렬화하므로 비용이 크다.
  // 매 스트로크마다 호출하면 긴 드로잉 세션에서 write amplification과
  // 모바일 배터리 소모를 일으키므로 500ms 디바운스.
  //
  // 페이지 이탈·언마운트 시에는 대기 중인 저장을 즉시 flush해야 데이터 손실이
  // 없다(다음 섹션의 useEffect cleanup + pagehide 핸들러).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (onSave && canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'))
    }
  }, [onSave])

  const debouncedSave = useCallback(() => {
    if (!onSave) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (canvasRef.current && onSave) {
        onSave(canvasRef.current.toDataURL('image/png'))
      }
      saveTimerRef.current = null
    }, 500)
  }, [onSave])

  // 언마운트 시 + pagehide 시 대기 중인 저장을 즉시 flush.
  // flushSave 레퍼런스 변화와 무관하게 "현재의" flushSave를 호출하도록 ref로 고정.
  const flushSaveRef = useRef(flushSave)
  useEffect(() => {
    flushSaveRef.current = flushSave
  }, [flushSave])

  useEffect(() => {
    const onPageHide = () => flushSaveRef.current()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      // 언마운트 시점에 대기 중인 저장이 있으면 즉시 기록
      flushSaveRef.current()
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
    debouncedSave()
  }, [debouncedSave])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    // 전체 지우기는 중요한 상태 변화라 디바운스 없이 즉시 기록
    flushSave()
  }, [flushSave])

  // Emotion temperature: add circle to canvas
  const addEmotionCircle = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const radius = 5 + (intensity / 100) * 55
    const emotionColor = `hsl(${hue}, 80%, 60%)`
    const center = pendingClick ?? { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }

    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = emotionColor + '99'
    ctx.strokeStyle = emotionColor
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()

    setPendingClick(null)
    // 감정 원 추가도 즉시 저장(명시적 행동)
    flushSave()
  }, [intensity, hue, pendingClick, flushSave])

  const emotionColor = `hsl(${hue}, 80%, 60%)`
  const emotionRadius = 5 + (intensity / 100) * 55

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      {!isEmotionTemp && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl border flex-wrap"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {/* Tool toggles */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTool('brush')}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: tool === 'brush' ? 'var(--color-border)' : 'transparent',
                color: 'var(--color-text)',
              }}
              title="브러시"
            >
              <Pen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: tool === 'eraser' ? 'var(--color-border)' : 'transparent',
                color: 'var(--color-text)',
              }}
              title="지우개"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6" style={{ background: 'var(--color-border)' }} />

          {/* Color palette */}
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setColor(c); setTool('brush') }}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  // 선택된 색 표시 테두리 — 테마 대비 색으로 강조
                  borderColor: color === c ? 'var(--color-text)' : 'transparent',
                }}
              />
            ))}
          </div>

          <div className="w-px h-6" style={{ background: 'var(--color-border)' }} />

          {/* Brush size */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>크기</span>
            <input
              type="range"
              min={2}
              max={20}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-violet-500"
            />
            <span className="text-xs w-4" style={{ color: 'var(--color-text-mid)' }}>{brushSize}</span>
          </div>

          <div className="ml-auto">
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors text-red-400 border-red-900/40 hover:bg-red-900/20"
            >
              <Trash2 className="w-3 h-3" />
              전체 지우기
            </button>
          </div>
        </div>
      )}

      {/* Canvas
          - 투명 PNG 저장이므로 캔버스 "바탕"은 이 div의 background가 담당
          - 테마에 따라 자동 전환되어 라이트 모드에서도 대비가 유지됨 */}
      <div
        className="relative rounded-xl overflow-hidden border"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full block touch-none"
          style={{
            cursor: tool === 'eraser' ? 'cell' : 'crosshair',
            maxHeight: '60vh',
            objectFit: 'contain',
            // 초기 이미지 로드 중엔 입력을 차단해 사용자의 첫 스트로크가
            // drawImage에 덮여 사라지는 레이스를 방지.
            pointerEvents: isLoadingImage ? 'none' : 'auto',
            opacity: isLoadingImage ? 0.6 : 1,
          }}
        />

        {/* 로드 인디케이터 */}
        {isLoadingImage && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-live="polite"
          >
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              이미지 불러오는 중…
            </span>
          </div>
        )}

        {/* Emotion temp preview circle */}
        {isEmotionTemp && pendingClick && (
          <div
            className="absolute pointer-events-none rounded-full border-2"
            style={{
              width: emotionRadius * 2,
              height: emotionRadius * 2,
              background: emotionColor + '66',
              borderColor: emotionColor,
              left: `${(pendingClick.x / CANVAS_WIDTH) * 100}%`,
              top: `${(pendingClick.y / CANVAS_HEIGHT) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>

      {/* Emotion temperature controls (visual-5) */}
      {isEmotionTemp && (
        <div
          className="p-4 rounded-xl border space-y-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs" style={{ color: 'var(--color-muted)' }}>강도 (크기)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div
              className="rounded-full border-2 shrink-0"
              style={{
                width: 32,
                height: 32,
                background: emotionColor + '66',
                borderColor: emotionColor,
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs" style={{ color: 'var(--color-muted)' }}>온도 (색상) — 차가움 ↔ 뜨거움</label>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="w-full"
              style={{
                background: `linear-gradient(to right, hsl(240,80%,60%), hsl(180,80%,60%), hsl(120,80%,60%), hsl(60,80%,60%), hsl(0,80%,60%))`,
              }}
            />
          </div>

          <button
            type="button"
            onClick={addEmotionCircle}
            disabled={!pendingClick}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-40"
            style={{ background: emotionColor + '33', color: emotionColor, border: `1px solid ${emotionColor}66` }}
          >
            <Plus className="w-4 h-4" />
            {pendingClick ? '선택한 위치에 추가' : '캔버스를 클릭하여 위치 선택'}
          </button>
        </div>
      )}
    </div>
  )
}
