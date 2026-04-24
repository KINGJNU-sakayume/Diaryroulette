import { useEffect, useRef } from 'react'

/**
 * 모달/다이얼로그 접근성 훅.
 *
 * 제공하는 기능:
 *   1. Tab/Shift+Tab이 컨테이너 내부 포커스 가능 요소 사이에서만 순환
 *   2. Esc 키로 닫기
 *   3. 활성화 시 첫 번째 포커스 가능 요소(또는 initialFocusRef)로 자동 포커스
 *   4. 비활성화 시 이전에 포커스되어 있던 요소로 복원 — VoiceOver(iOS)가
 *      모달 닫힘 직후 읽을 위치를 결정하는 데 핵심적.
 *
 * iOS Safari <dialog> 대신 이 훅을 쓰는 이유는 결정 1 참조.
 *
 * @param active 훅을 활성화할지 여부 (모달 열림 상태)
 * @param onClose ESC 눌렀을 때 호출될 콜백
 * @param initialFocusRef 처음 포커스할 요소(생략 시 첫 번째 포커스 가능 요소)
 * @returns containerRef — 모달 컨테이너 div에 ref로 연결
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose?: () => void,
  initialFocusRef?: React.RefObject<HTMLElement | null>,
) {
  const containerRef = useRef<T | null>(null)
  // 활성화 직전 포커스를 가졌던 요소. 비활성화 시 복원 대상.
  const previouslyFocusedRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!active) return

    // 1. 현재 포커스된 요소 기억 → 나중에 복원
    previouslyFocusedRef.current = document.activeElement

    // 2. 초기 포커스 이동
    //    rAF로 미루어 모달 DOM이 실제로 마운트·페인트된 후에 포커스가 들어가도록.
    const focusRaf = requestAnimationFrame(() => {
      const target =
        initialFocusRef?.current ??
        getFirstFocusable(containerRef.current) ??
        containerRef.current
      target?.focus()
    })

    // 3. 키 이벤트 핸들러
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return
      const focusables = getFocusableElements(container)
      if (focusables.length === 0) {
        // 포커스 가능 요소가 없으면 컨테이너 자체에 포커스 유지
        e.preventDefault()
        container.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement

      if (e.shiftKey) {
        // Shift+Tab — 첫 요소에서 → 마지막 요소로
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab — 마지막 요소에서 → 첫 요소로
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(focusRaf)
      document.removeEventListener('keydown', handleKeyDown)

      // 4. 포커스 복원
      //    previouslyFocused가 여전히 문서에 존재하는지 확인 후 복원
      const prev = previouslyFocusedRef.current
      if (prev instanceof HTMLElement && document.contains(prev)) {
        prev.focus()
      }
    }
  }, [active, onClose, initialFocusRef])

  return containerRef
}

// ─── 내부 헬퍼 ────────────────────────────────────────────────────────────────

/**
 * 컨테이너 내부의 포커스 가능한 요소들을 DOM 순서대로 반환.
 * disabled, hidden, tabindex="-1"은 제외.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
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

function getFirstFocusable(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null
  const all = getFocusableElements(container)
  return all[0] ?? null
}
