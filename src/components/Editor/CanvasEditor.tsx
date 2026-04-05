import { useRef, useEffect, useState, useCallback } from 'react'
import { Pen, Eraser, Trash2, Plus } from 'lucide-react'

interface CanvasEditorProps {
  initialDataUrl?: string | null
  onSave?: (dataUrl: string) => void
  isEmotionTemp?: boolean // visual-5 special UI
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 450
const CANVAS_BG = '#0d1117'
const COLORS = ['#e6edf3', '#ef4444', '#f97316', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

export default function CanvasEditor({ initialDataUrl, onSave, isEmotionTemp = false }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [color, setColor] = useState('#e6edf3')
  const [brushSize, setBrushSize] = useState(6)

  // Emotion temperature sliders (visual-5)
  const [intensity, setIntensity] = useState(50)  // 0–100 → radius 5–60
  const [hue, setHue] = useState(200)             // 0–360 → HSL color
  const [previewVisible, setPreviewVisible] = useState(false)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (initialDataUrl) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = initialDataUrl
    }
  }, [initialDataUrl])

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
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPos.current = getPos(e)

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, (tool === 'eraser' ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? CANVAS_BG : color
    ctx.fill()
  }, [tool, color, brushSize, getPos])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    const last = lastPos.current ?? pos

    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === 'eraser' ? CANVAS_BG : color
    ctx.lineWidth = tool === 'eraser' ? brushSize * 2 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPos.current = pos
  }, [tool, color, brushSize, getPos])

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
    if (onSave) {
      onSave(canvasRef.current!.toDataURL('image/jpeg', 0.85))
    }
  }, [onSave])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    if (onSave) onSave(canvas.toDataURL('image/jpeg', 0.85))
  }, [onSave])

  // Emotion temperature: add circle to canvas
  const addEmotionCircle = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const radius = 5 + (intensity / 100) * 55
    const emotionColor = `hsl(${hue}, 80%, 60%)`

    ctx.beginPath()
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, radius, 0, Math.PI * 2)
    ctx.fillStyle = emotionColor + '99'
    ctx.strokeStyle = emotionColor
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()

    setPreviewVisible(false)
    if (onSave) onSave(canvas.toDataURL('image/jpeg', 0.85))
  }, [intensity, hue, onSave])

  const emotionColor = `hsl(${hue}, 80%, 60%)`
  const emotionRadius = 5 + (intensity / 100) * 55

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      {!isEmotionTemp && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl border flex-wrap"
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          {/* Tool toggles */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTool('brush')}
              className="p-2 rounded-lg transition-colors"
              style={{ background: tool === 'brush' ? '#30363d' : 'transparent', color: '#e6edf3' }}
              title="브러시"
            >
              <Pen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className="p-2 rounded-lg transition-colors"
              style={{ background: tool === 'eraser' ? '#30363d' : 'transparent', color: '#e6edf3' }}
              title="지우개"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-700" />

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
                  borderColor: color === c ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-slate-700" />

          {/* Brush size */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">크기</span>
            <input
              type="range"
              min={2}
              max={20}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-violet-500"
            />
            <span className="text-xs text-slate-400 w-4">{brushSize}</span>
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

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: '#30363d' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full block touch-none"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', maxHeight: '60vh', objectFit: 'contain' }}
        />

        {/* Emotion temp preview circle */}
        {isEmotionTemp && previewVisible && (
          <div
            className="absolute pointer-events-none rounded-full border-2"
            style={{
              width: emotionRadius * 2,
              height: emotionRadius * 2,
              background: emotionColor + '66',
              borderColor: emotionColor,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>

      {/* Emotion temperature controls (visual-5) */}
      {isEmotionTemp && (
        <div
          className="p-4 rounded-xl border space-y-4"
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs text-slate-400">강도 (크기)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={intensity}
                onChange={(e) => { setIntensity(Number(e.target.value)); setPreviewVisible(true) }}
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
            <label className="text-xs text-slate-400">온도 (색상) — 차가움 ↔ 뜨거움</label>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => { setHue(Number(e.target.value)); setPreviewVisible(true) }}
              className="w-full"
              style={{
                background: `linear-gradient(to right, hsl(240,80%,60%), hsl(180,80%,60%), hsl(120,80%,60%), hsl(60,80%,60%), hsl(0,80%,60%))`,
              }}
            />
          </div>

          <button
            type="button"
            onClick={addEmotionCircle}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors"
            style={{ background: emotionColor + '33', color: emotionColor, border: `1px solid ${emotionColor}66` }}
          >
            <Plus className="w-4 h-4" />
            이 감정 추가
          </button>
        </div>
      )}
    </div>
  )
}
