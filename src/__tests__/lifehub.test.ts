import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  LIFEHUB_ORIGIN, MISSIONS_REF_REVISION, autoApplyEnabled, beginConnect, completeConnect, decidedKeys, missionRefs,
  parseProposal, rejectLocally, rememberReceipt, setAutoApply, stateRefs, sync, uploadRefs, type Deps, type Proposal,
} from '../integration/lifehub'
import { applyProposals, dayRefs, decide, readDay, type DayState } from '../integration/lifehubApply'
import { APPLIED_EVENT } from '../integration/events'
import { missions } from '../data/missions'
import { clearAllData, getCooldownList, getTodayMission, saveJournal, setCooldownList, setTodayMission } from '../db/indexedDB'

class MemoryStorage {
  map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, String(v)) }
  removeItem(k: string) { this.map.delete(k) }
}
const K1 = 'claude:mcp-' + 'a'.repeat(40)
const K2 = 'claude:mcp-' + 'b'.repeat(40)
const TODAY = '2026-11-02'
const item = (key: string, payload: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  key, status: 'approved', revision: 0, final_candidate: null, needs_app_review: false,
  candidate: { schema_version: 1, source: key.split(':')[0], source_ref: 'claude-mcp:2026-11-02', idempotency_key: key.slice(key.indexOf(':') + 1),
    created_at: '2026-11-02T03:00:00.000Z', candidate_type: 'daily_mission', payload },
  ...extra,
})
const proposal = (over: Partial<Proposal> = {}): Proposal =>
  ({ key: K1, source: 'claude', date: TODAY, missionId: 'lang-1', status: 'approved', needsAppReview: false, ...over })
const day = (over: Partial<DayState> = {}): DayState => ({ today: TODAY, todayMissionId: null, cooldowns: [], now: new Date('2026-11-02T12:00:00+09:00'), ...over })

function fakeHub(list: unknown[]) {
  const hub = { posts: [] as Array<{ method: string; path: string; body: Record<string, unknown> }>, asked: [] as string[], fail: 0 }
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === '/oauth/token') return json(200, { access_token: 'at', refresh_token: 'rt', token_type: 'bearer', expires_in: 3600 })
    if (new Headers(init?.headers).get('Authorization') !== 'Bearer at') return json(401, {})
    if (url.pathname === '/diaryroulette/v1/candidates') { hub.asked.push(url.searchParams.get('status') ?? ''); return json(200, { candidates: list }) }
    if (hub.fail > 0) { hub.fail--; return json(503, {}) }
    hub.posts.push({ method: init?.method ?? 'GET', path: url.pathname, body: JSON.parse(String(init?.body)) })
    return json(200, {})
  }) as typeof fetch
  return { hub, f }
}
function deps(f: typeof fetch, t = { now: Date.parse('2026-11-02T03:00:00Z') }): Deps {
  let n = 0
  return {
    fetch: f, storage: new MemoryStorage(), session: new MemoryStorage(), now: () => t.now,
    random: (k) => Uint8Array.from({ length: k }, () => (n++ * 31 + 7) % 256),
    sha256: async (d) => new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(d))),
  }
}
async function connected(f: typeof fetch) {
  const d = deps(f)
  const url = new URL(await beginConnect(d))
  await completeConnect(`?code=c&state=${url.searchParams.get('state')}&iss=${encodeURIComponent(LIFEHUB_ORIGIN)}`, d)
  return d
}

describe('Life Hub daily_mission proposals', () => {
  it('validates the contract again, prefers the final version, accepts codex, ignores decided states', () => {
    const p = parseProposal(item(K1, { date: TODAY, mission_id: 'lang-1' }, { final_candidate: item(K1, { date: TODAY, mission_id: 'view-1' }).candidate }))!
    expect(p).toMatchObject({ key: K1, date: TODAY, missionId: 'view-1', status: 'approved', needsAppReview: false })
    expect(parseProposal(item(K1, { date: TODAY, mission_id: 'lang-1', text: 'diary' }))).toBeNull()
    expect(parseProposal(item(K1, { date: '2026-02-30', mission_id: 'lang-1' }))).toBeNull()
    expect(parseProposal(item(K1, { date: TODAY, mission_id: 'lang-1' }, { status: 'rejected' }))).toBeNull()
    expect(parseProposal(item('codex:mcp-' + 'c'.repeat(40), { date: TODAY, mission_id: 'lang-1' }))?.source).toBe('codex')
  })

  it('decides by the app rules', () => {
    const resting = [{ missionId: 'lang-1', drawnAt: '2026-11-01T00:00:00Z' }]
    expect(decide(proposal(), day(), true)).toMatchObject({ kind: 'apply' })
    expect(decide(proposal({ date: '2026-11-01' }), day(), true)).toEqual({ kind: 'reject', reason: 'past' })
    expect(decide(proposal({ date: '2026-11-03' }), day(), true)).toEqual({ kind: 'wait', reason: 'future' })
    expect(decide(proposal(), day({ todayMissionId: 'view-1' }), true)).toEqual({ kind: 'reject', reason: 'other-mission' })
    expect(decide(proposal(), day({ todayMissionId: 'lang-1' }), true)).toEqual({ kind: 'receipt' })
    expect(decide(proposal(), day({ cooldowns: resting }), true)).toEqual({ kind: 'wait', reason: 'resting' })
    expect(decide(proposal({ status: 'pending' }), day(), true)).toEqual({ kind: 'wait', reason: 'pending' })
    expect(decide(proposal({ needsAppReview: true }), day(), true)).toEqual({ kind: 'wait', reason: 'review' })
    expect(decide(proposal(), day(), false)).toEqual({ kind: 'wait', reason: 'auto-off' })
    expect(decide(proposal({ missionId: 'no-such' }), day(), true)).toEqual({ kind: 'reject', reason: 'unknown-mission' })
  })
})

describe('applying with IndexedDB', () => {
  beforeEach(async () => { await clearAllData() })

  it('saves an approved mission once, like the app draw (extras, cooldown), and records the receipt', async () => {
    const storage = new MemoryStorage()
    let events = 0
    window.addEventListener(APPLIED_EVENT, () => events++)
    const bannedVowel = missions.find((m) => m.draw === 'bannedVowel')!
    const first = await applyProposals([proposal({ missionId: bannedVowel.id })], TODAY, true, { storage })
    expect(first.saved?.id).toBe(bannedVowel.id)
    const record = await getTodayMission()
    expect(record).toMatchObject({ date: TODAY, missionId: bannedVowel.id })
    expect(typeof record?.extraData?.bannedVowel).toBe('string')
    expect((await getCooldownList()).map((e) => e.missionId)).toEqual([bannedVowel.id])
    expect(decidedKeys({ storage }).has(K1)).toBe(true)
    expect(events).toBe(1)

    // The same proposal again (e.g. Life Hub missed the receipt): nothing changes.
    const again = await applyProposals([proposal({ missionId: bannedVowel.id })], TODAY, true, { storage })
    expect(again.saved).toBeNull()
    expect((await getTodayMission())?.extraData).toEqual(record?.extraData)
    expect((await getCooldownList()).length).toBe(1)
  })

  it('a diary already started today keeps its mission; other proposals are answered, not saved', async () => {
    const storage = new MemoryStorage()
    await saveJournal({ id: TODAY, missionId: 'view-1', type: 'text', content: 'x', status: 'draft', createdAt: '2026-11-02T01:00:00Z', completedAt: null })
    const r = await applyProposals([proposal({ missionId: 'lang-1' }), proposal({ key: K2, missionId: 'view-1' })], TODAY, true, { storage })
    expect(r.saved).toBeNull()
    expect(await getTodayMission()).toBeUndefined()
    const keys = decidedKeys({ storage })
    expect(keys.has(K1) && keys.has(K2)).toBe(true)
  })

  it('waits (not saved) when resting, pending or auto-apply is off; a pending past-day proposal is just dropped', async () => {
    const storage = new MemoryStorage()
    await setCooldownList([{ missionId: 'lang-1', drawnAt: new Date().toISOString() }])
    const r = await applyProposals([
      proposal({ missionId: 'lang-1' }), proposal({ key: K2, missionId: 'view-1', status: 'pending' }),
      proposal({ key: 'claude:mcp-' + 'e'.repeat(40), date: '2026-10-01', status: 'pending' }),
    ], TODAY, true, { storage })
    expect(r.saved).toBeNull()
    expect(r.waiting.map((w) => w.reason).sort()).toEqual(['pending', 'resting'])
    expect(decidedKeys({ storage }).size).toBe(0)
    const off = await applyProposals([proposal({ key: K2, missionId: 'view-1' })], TODAY, false, { storage })
    expect(off.waiting[0].reason).toBe('auto-off')
  })

  it("shares today's state: resting missions and today's mission", async () => {
    await setTodayMission({ key: 'todayMission', date: TODAY, missionId: 'view-1' })
    await setCooldownList([{ missionId: 'view-1', drawnAt: new Date().toISOString() }, { missionId: 'lang-1', drawnAt: new Date().toISOString() }])
    const refs = dayRefs(await readDay(TODAY))
    expect(refs.map((r) => [r.id, r.group])).toEqual([['view-1', 'today:' + TODAY], ['lang-1', 'resting']])
  })
})

describe('sync and reference lists', () => {
  it('mission list: ids, titles and categories only, within Life Hub limits', () => {
    const refs = missionRefs()
    expect(refs.length).toBe(missions.length)
    for (const r of refs) expect(Object.keys(r).sort()).toEqual(['group', 'id', 'label'])
    expect(JSON.stringify({ revision: 1, items: refs }).length).toBeLessThan(32768)
    expect(stateRefs(['no-such'], null)).toEqual([])
  })

  it('sends receipts and rejections once, shares lists only when changed, asks for open proposals', async () => {
    const list = [item(K1, { date: TODAY, mission_id: 'lang-1' }), item(K2, { date: TODAY, mission_id: 'view-1' })]
    const { hub, f } = fakeHub(list)
    const d = await connected(f)
    rememberReceipt(K1, TODAY, d)
    const r = await sync(stateRefs([], null), d)
    expect(hub.asked).toEqual(['open'])
    expect(r.proposals.map((p) => p.key)).toEqual([K2])
    expect(r.receiptsSent).toBe(1)
    const receipt = hub.posts.find((p) => p.path.endsWith('/receipts'))!
    expect(receipt.body).toEqual({ key: K1, entity_type: 'daily_mission', entity_id: TODAY })
    const puts = () => hub.posts.filter((p) => p.method === 'PUT').map((p) => p.path)
    expect(puts()).toEqual(['/diaryroulette/v1/refs/missions', '/diaryroulette/v1/refs/state'])
    expect(hub.posts.find((p) => p.path.endsWith('/missions'))!.body.revision).toBe(MISSIONS_REF_REVISION)

    rejectLocally(K2, d)
    const r2 = await sync(stateRefs([], null), d)
    expect(r2.rejectionsSent).toBe(1)
    expect(r2.proposals).toEqual([])
    expect(puts().length).toBe(2)
    // A new state is shared with a higher revision.
    const before = hub.posts.find((p) => p.path.endsWith('/state'))!.body.revision as number
    const sent = await uploadRefs(stateRefs([], { date: TODAY, missionId: 'lang-1' }), d)
    expect(sent).toEqual({ missions: false, state: true })
    expect(hub.posts.filter((p) => p.path.endsWith('/state')).at(-1)!.body.revision as number).toBeGreaterThan(before)
  })

  it('auto-apply is on by default and can be turned off', () => {
    const d = deps(fakeHub([]).f)
    expect(autoApplyEnabled(d)).toBe(true)
    setAutoApply(d, false)
    expect(autoApplyEnabled(d)).toBe(false)
  })
})

describe('reference lists after a 409', () => {
  it("a 409 for today's state is not recorded as sent; the next sync sends it again, missions stay done", async () => {
    const statuses: Array<[string, number]> = []
    let answer = 409
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname === '/oauth/token') return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt', token_type: 'bearer', expires_in: 3600 }))
      const kind = url.pathname.split('/').pop()!
      const revision = JSON.parse(String(init?.body)).revision as number
      const status = kind === 'missions' ? 409 : answer
      statuses.push([kind, revision])
      return new Response('{}', { status })
    }) as typeof fetch
    const t = { now: Date.parse('2026-11-02T03:00:00Z') }
    const d = deps(f, t)
    const url = new URL(await beginConnect(d))
    await completeConnect(`?code=c&state=${url.searchParams.get('state')}`, d)
    const state = stateRefs([], { date: TODAY, missionId: 'lang-1' })
    expect(await uploadRefs(state, d)).toEqual({ missions: true, state: false })
    t.now += 60_000
    answer = 200
    expect(await uploadRefs(state, d)).toEqual({ missions: false, state: true })
    const sent = statuses.filter(([k]) => k === 'state').map(([, r]) => r)
    expect(sent).toHaveLength(2)
    expect(sent[1]).toBeGreaterThan(sent[0])
    expect(await uploadRefs(state, d)).toEqual({ missions: false, state: false })
  })
})
