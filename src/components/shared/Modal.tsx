import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  /** 제목 위에 붙는 작은 머리말 */
  eyebrow?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'lg'
}

/** 화면 가운데(모바일에선 아래에서 올라오는) 대화상자 */
export default function Modal({ open, onClose, title, eyebrow, children, footer, size = 'lg' }: ModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useFocusTrap<HTMLDivElement>(open, onClose, closeRef)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-xl outline-none animate-fadeIn sm:rounded-2xl ${
          size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-xl'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0">
            {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
            <h2 id={titleId} className="font-serif text-lg font-bold leading-snug text-ink">
              {title}
            </h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1 shrink-0" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
