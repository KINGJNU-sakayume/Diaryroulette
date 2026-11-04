import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import Stats from '../pages/Stats'
import { LifeHubTodayBanner } from '../components/LifeHub/LifeHub'
import { formatSyncTime, openSettings, setLifeHubState } from '../integration/lifehubStore'

const TODAY = '2026-11-02'
let root: Root | null = null
let host: HTMLElement

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
  setLifeHubState({ connected: false, reconnect: false, waiting: [], error: '', syncing: false, lastSyncedAt: null, conflicts: 0 })
})

async function render(ui: React.ReactNode) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root!.render(<MemoryRouter>{ui}</MemoryRouter>))
}
const buttons = (scope: ParentNode, name: string) =>
  Array.from(scope.querySelectorAll('button')).filter((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === name)
const gear = () => document.querySelector<HTMLButtonElement>('header button[aria-label^="설정"]')!

describe('Life Hub entry points', () => {
  it('(1) with no proposals the home proposal entry point is not rendered', async () => {
    setLifeHubState({ connected: true, waiting: [] })
    await render(<LifeHubTodayBanner today={TODAY} hasMission={false} />)
    expect(host.innerHTML).toBe('')
    expect(document.querySelector('[aria-label="Life Hub 제안"]')).toBeNull()
  })

  it('(2) state C: the settings gear has a dot and its name ends with "(확인 필요)"; not in A or B', async () => {
    setLifeHubState({ connected: false, reconnect: true })
    await render(<Layout><p>본문</p></Layout>)
    expect(gear().getAttribute('aria-label')).toBe('설정 (확인 필요)')
    expect(gear().querySelector('[data-attention]')).not.toBeNull()

    await act(async () => setLifeHubState({ connected: true, reconnect: false }))
    expect(gear().getAttribute('aria-label')).toBe('설정')
    expect(gear().querySelector('[data-attention]')).toBeNull()
    await act(async () => setLifeHubState({ connected: false, reconnect: false }))
    expect(gear().querySelector('[data-attention]')).toBeNull()

    // C inside the sheet: warning status, reason box, reconnect and disconnect
    await act(async () => setLifeHubState({ reconnect: true }))
    await act(async () => gear().click())
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('확인 필요')
    expect(dialog.textContent).toContain('Life Hub 연결이 끊겼습니다. 다시 연결해 주세요. 이 기기의 기록은 그대로입니다.')
    expect(buttons(dialog, '다시 연결')).toHaveLength(1)
    expect(buttons(dialog, '연결 해제')).toHaveLength(1)
  })

  it('(3) before connecting, 「Life Hub 연결」 exists only in the settings Life Hub section', async () => {
    await render(
      <Layout>
        <LifeHubTodayBanner today={TODAY} hasMission={false} />
        <Stats />
      </Layout>,
    )
    // let Stats finish loading from IndexedDB
    await act(async () => new Promise((r) => setTimeout(r, 50)))
    expect(document.querySelector('h1')?.textContent).toBe('통계')
    expect(buttons(document, 'Life Hub 연결')).toHaveLength(0)
    expect(document.body.textContent).not.toContain('백업 파일 저장')

    await act(async () => gear().click())
    const dialog = document.querySelector('[role="dialog"]')!
    const all = buttons(document, 'Life Hub 연결')
    expect(all).toHaveLength(1)
    const section = all[0].closest('section')!
    expect(dialog.contains(section)).toBe(true)
    expect(section.querySelector('h2')?.textContent).toBe('Life Hub')
    expect(section.textContent).toContain('Claude가 제안한 기록을 받습니다.')
    // order inside the sheet: Life Hub → 백업
    expect(Array.from(dialog.querySelectorAll('section h2')).map((h) => h.textContent)).toEqual(['Life Hub', '백업'])
  })

  it('the connection callback opens the settings sheet', async () => {
    await render(<Layout><p>본문</p></Layout>)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await act(async () => openSettings())
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('설정')
  })

  it('state B status line', async () => {
    setLifeHubState({ connected: true })
    await render(<Layout><p>본문</p></Layout>)
    await act(async () => gear().click())
    const dialog = () => document.querySelector('[role="dialog"]')!
    expect(dialog().textContent).toContain('연결됨 · 아직 동기화 전')
    await act(async () => setLifeHubState({ syncing: true }))
    expect(dialog().textContent).toContain('연결됨 · 동기화 중…')
    await act(async () => setLifeHubState({ syncing: false, error: 'Life Hub에 연결할 수 없어요. 네트워크를 확인해 주세요.' }))
    expect(dialog().textContent).toContain('연결됨 · 잠시 뒤 다시 시도')
    expect(buttons(dialog(), '지금 동기화')).toHaveLength(1)
    expect(dialog().textContent).toContain('Claude에서 승인한 기록은 바로 반영')
    expect(dialog().querySelector('details')).toBeNull()
  })

  it('sync time: today → 「오늘 HH:MM」, otherwise 「M월 D일 HH:MM」', () => {
    const now = new Date(2026, 10, 4, 15, 0).getTime()
    expect(formatSyncTime(new Date(2026, 10, 4, 9, 5).getTime(), now)).toBe('오늘 09:05')
    expect(formatSyncTime(new Date(2026, 10, 3, 21, 30).getTime(), now)).toBe('11월 3일 21:30')
  })
})
