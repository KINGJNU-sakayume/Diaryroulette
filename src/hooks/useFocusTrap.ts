import { useEffect, useRef } from 'react'

/**
 * 모달 접근성 훅.
 *   1. Tab/Shift+Tab이 모달 안에서만 돈다
 *   2. Esc로 닫는다
 *   3. 열릴 때 첫 포커스 대상(또는 initialFocusRef)으로 이동
 *   4. 닫힐 때 원래 포커스로 되돌린다 (VoiceOver가 읽을 위치를 잃지 않도록)
 *
 * onClose는 ref로 들고 있어서, 호출하는 쪽이 매 렌더마다 새 함수를 넘겨도
 * 포커스가 튀지 않는다.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose?: () => void,
  initialFocusRef?: React.RefObject<HTMLElement | null>,
) {
  const containerRef = useRef<T | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement

    const focusRaf = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? getFocusableElements(containerRef.current)[0] ?? containerRef.current
      target?.focus()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const focusables = getFocusableElements(container)
      if (focusables.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === first || !container.contains(current))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || !container.contains(current))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(focusRaf)
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [active, initialFocusRef])

  return containerRef
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}
