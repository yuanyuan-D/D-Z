import { normalizeContent, flattenTasks, uid } from './content-model.js'
import {
  cloudEnabled,
  createCloudClient,
  fetchCloudPayload,
  upsertCloudPayload,
  subscribeCloud,
  probeCloudTable
} from './cloud-sync.js'

const CHECK_KEY = 'wedding_web_checks_v1'
const SHOP_KEY = 'wedding_web_shop_v1'
const WEIGHT_KEY = 'wedding_web_weight_v1'
const CONTENT_KEY = 'wedding_web_content_v1'
const META_KEY = 'wedding_web_meta_v1'
const PERSON_KEY = 'wedding_web_active_person_v1'
const REMOTE_AT_KEY = 'wedding_web_remote_at_v1'

const SYNC_URL = './api/sync'
const POLL_MS = 4000

let cloudClient = null
let unsubCloud = null
let cloudMode = false
let cloudError = ''

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function emptyWeightProfile() {
  return {
    startWeight: null,
    goalWeight: null,
    entries: {}
  }
}

function normalizePerson(data) {
  const base = emptyWeightProfile()
  if (!data || typeof data !== 'object') return base
  return {
    startWeight: data.startWeight ?? null,
    goalWeight: data.goalWeight ?? null,
    entries: data.entries && typeof data.entries === 'object' ? data.entries : {}
  }
}

function normalizePeople(people) {
  return {
    dong: normalizePerson(people?.dong),
    zhao: normalizePerson(people?.zhao)
  }
}

function readActivePerson() {
  const v = localStorage.getItem(PERSON_KEY)
  return v === 'zhao' ? 'zhao' : 'dong'
}

const legacyWeight = read(WEIGHT_KEY, null)

const draft = {
  checks: read(CHECK_KEY, {}),
  shop: read(SHOP_KEY, {}),
  people: normalizePeople(legacyWeight?.people || legacyWeight || {}),
  content: normalizeContent(read(CONTENT_KEY, null)),
  contentUpdatedAt: Number(read(CONTENT_KEY + '_at', 0)) || 0,
  updatedAt: Number(localStorage.getItem(REMOTE_AT_KEY) || 0)
}

let activePerson = readActivePerson()
if (legacyWeight?.activePerson === 'zhao' || legacyWeight?.activePerson === 'dong') {
  activePerson = legacyWeight.activePerson
  localStorage.setItem(PERSON_KEY, activePerson)
}

/** 内存相对本地尚未写入 */
let writePending = false
/** 自上次手动保存后是否有过变更（用于关闭提示） */
let sessionUnsaved = false
let autoTimer = null
let pollTimer = null
let syncing = false
let online = true
const AUTO_DELAY = 400
const listeners = new Set()

function emit(event) {
  listeners.forEach((fn) => fn(event))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function isDirty() {
  return writePending || sessionUnsaved
}

export function hasWritePending() {
  return writePending
}

export function needsLeaveConfirm() {
  return sessionUnsaved || writePending
}

export function getSyncState() {
  return {
    online,
    syncing,
    updatedAt: draft.updatedAt,
    cloudMode,
    cloudError
  }
}

export function getCloudError() {
  return cloudError
}

export function getChecks() {
  return draft.checks
}

export function getShopChecks() {
  return draft.shop
}

export function getWeightData() {
  return {
    activePerson,
    people: draft.people
  }
}

export function getContent() {
  return draft.content
}

export function getAllTasks() {
  return flattenTasks(draft.content.phases)
}

export function updateContent(mutator) {
  const current = JSON.parse(JSON.stringify(draft.content))
  const next = typeof mutator === 'function' ? mutator(current) : mutator
  draft.content = normalizeContent(next)
  draft.contentUpdatedAt = Date.now()
  markChanged()
  emit({ type: 'content' })
  return draft.content
}

export { uid }

export function toggleCheck(id) {
  draft.checks = { ...draft.checks, [id]: !draft.checks[id] }
  markChanged()
  return draft.checks
}

export function toggleShop(id) {
  draft.shop = { ...draft.shop, [id]: !draft.shop[id] }
  markChanged()
  return draft.shop
}

export function setWeightPerson(personId) {
  activePerson = personId === 'zhao' ? 'zhao' : 'dong'
  localStorage.setItem(PERSON_KEY, activePerson)
  emit({ type: 'person' })
  return getWeightData()
}

export function setWeightGoals({ startWeight, goalWeight }) {
  const id = activePerson
  const person = { ...draft.people[id] }
  if (startWeight !== undefined) {
    person.startWeight = startWeight === '' || startWeight == null ? null : Number(startWeight)
  }
  if (goalWeight !== undefined) {
    person.goalWeight = goalWeight === '' || goalWeight == null ? null : Number(goalWeight)
  }
  draft.people = { ...draft.people, [id]: person }
  markChanged()
  return getWeightData()
}

export function upsertWeightEntry(date, patch) {
  const id = activePerson
  const person = { ...draft.people[id] }
  const prev = person.entries[date] || {
    weight: null,
    exercise: false,
    exerciseType: '',
    note: '',
    updatedAt: 0
  }
  const next = { ...prev, ...patch, updatedAt: Date.now() }
  if (patch.weight !== undefined) {
    next.weight =
      patch.weight === '' || patch.weight == null || Number.isNaN(Number(patch.weight))
        ? null
        : Number(patch.weight)
  }
  person.entries = { ...person.entries, [date]: next }
  if (next.weight == null && !next.exercise && !next.note && !next.exerciseType) {
    const { [date]: _, ...rest } = person.entries
    person.entries = rest
  }
  draft.people = { ...draft.people, [id]: person }
  markChanged()
  return getWeightData()
}

export function removeWeightEntry(date) {
  const id = activePerson
  const person = { ...draft.people[id] }
  const { [date]: _, ...rest } = person.entries
  person.entries = rest
  draft.people = { ...draft.people, [id]: person }
  markChanged()
  return getWeightData()
}

function markChanged() {
  writePending = true
  sessionUnsaved = true
  emit({ type: 'dirty' })
  scheduleAutoSave()
}

function scheduleAutoSave() {
  if (autoTimer) clearTimeout(autoTimer)
  emit({ type: 'saving' })
  autoTimer = setTimeout(() => {
    persist('auto')
  }, AUTO_DELAY)
}

export function saveNow(reason = 'manual') {
  if (autoTimer) {
    clearTimeout(autoTimer)
    autoTimer = null
  }
  return persist(reason)
}

function snapshot() {
  return {
    updatedAt: draft.updatedAt || Date.now(),
    contentUpdatedAt: draft.contentUpdatedAt || 0,
    checks: draft.checks,
    shop: draft.shop,
    people: draft.people,
    content: draft.content
  }
}

function applyRemote(payload, { quiet = false } = {}) {
  draft.checks = payload.checks && typeof payload.checks === 'object' ? payload.checks : {}
  draft.shop = payload.shop && typeof payload.shop === 'object' ? payload.shop : {}
  draft.people = mergePeople(draft.people, payload.people)
  if (payload.content) {
    const remoteContentAt = Number(payload.contentUpdatedAt || payload.updatedAt || 0)
    if (remoteContentAt >= draft.contentUpdatedAt || !draft.contentUpdatedAt) {
      draft.content = normalizeContent(payload.content)
      draft.contentUpdatedAt = remoteContentAt || Date.now()
      write(CONTENT_KEY, draft.content)
      write(CONTENT_KEY + '_at', draft.contentUpdatedAt)
    }
  }
  draft.updatedAt = Number(payload.updatedAt || 0)
  write(CHECK_KEY, draft.checks)
  write(SHOP_KEY, draft.shop)
  write(WEIGHT_KEY, { people: draft.people })
  localStorage.setItem(REMOTE_AT_KEY, String(draft.updatedAt))
  if (!quiet) emit({ type: 'remote', updatedAt: draft.updatedAt })
}

function persistLocal(reason) {
  write(CHECK_KEY, draft.checks)
  write(SHOP_KEY, draft.shop)
  write(WEIGHT_KEY, { people: draft.people })
  write(CONTENT_KEY, draft.content)
  write(CONTENT_KEY + '_at', draft.contentUpdatedAt)
  const meta = {
    savedAt: Date.now(),
    reason
  }
  write(META_KEY, meta)
  return meta
}

async function pushRemote() {
  const body = {
    ...snapshot(),
    updatedAt: Date.now()
  }

  if (cloudMode && cloudClient) {
    const payload = await upsertCloudPayload(cloudClient, body)
    draft.updatedAt = Number(payload.updatedAt || body.updatedAt)
    localStorage.setItem(REMOTE_AT_KEY, String(draft.updatedAt))
    if (payload.people) {
      draft.people = mergePeople(draft.people, payload.people)
      write(WEIGHT_KEY, { people: draft.people })
    }
    if (payload.content) {
      const remoteContentAt = Number(payload.contentUpdatedAt || 0)
      if (remoteContentAt >= draft.contentUpdatedAt) {
        draft.content = normalizeContent(payload.content)
        draft.contentUpdatedAt = remoteContentAt
        write(CONTENT_KEY, draft.content)
        write(CONTENT_KEY + '_at', draft.contentUpdatedAt)
      }
    }
    return payload
  }

  const res = await fetch(SYNC_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`sync push ${res.status}`)
  const payload = await res.json()
  draft.updatedAt = Number(payload.updatedAt || body.updatedAt)
  localStorage.setItem(REMOTE_AT_KEY, String(draft.updatedAt))
  if (payload.people) {
    draft.people = mergePeople(draft.people, payload.people)
    write(WEIGHT_KEY, { people: draft.people })
  }
  if (payload.content) {
    draft.content = normalizeContent(payload.content)
    draft.contentUpdatedAt = Number(payload.contentUpdatedAt || draft.contentUpdatedAt || 0)
    write(CONTENT_KEY, draft.content)
    write(CONTENT_KEY + '_at', draft.contentUpdatedAt)
  }
  return payload
}

function mergePeople(localPeople, remotePeople) {
  const out = {
    dong: normalizePerson(localPeople?.dong),
    zhao: normalizePerson(localPeople?.zhao)
  }
  for (const pid of ['dong', 'zhao']) {
    const remote = normalizePerson(remotePeople?.[pid])
    const local = out[pid]
    const entries = { ...local.entries }
    for (const [date, entry] of Object.entries(remote.entries || {})) {
      const prev = entries[date] || {}
      const prevAt = Number(prev.updatedAt || 0)
      const nextAt = Number(entry?.updatedAt || 0)
      if (nextAt >= prevAt) entries[date] = entry
    }
    out[pid] = {
      startWeight: remote.startWeight ?? local.startWeight,
      goalWeight: remote.goalWeight ?? local.goalWeight,
      entries
    }
  }
  return out
}

async function persist(reason) {
  const meta = persistLocal(reason)
  writePending = false
  if (reason === 'manual') sessionUnsaved = false

  syncing = true
  emit({ type: 'syncing' })
  try {
    await pushRemote()
    online = true
    if (cloudMode) cloudError = ''
    emit({
      type: 'saved',
      reason,
      savedAt: meta.savedAt,
      sessionUnsaved,
      synced: true
    })
  } catch (err) {
    online = false
    if (cloudMode) cloudError = String(err?.message || err)
    emit({
      type: 'saved',
      reason,
      savedAt: meta.savedAt,
      sessionUnsaved,
      synced: false,
      error: String(err?.message || err)
    })
  } finally {
    syncing = false
    emit({ type: 'sync-state', ...getSyncState() })
  }
  return meta
}

export function getLastSavedAt() {
  const meta = read(META_KEY, {})
  return meta.savedAt || null
}

export function calcProgress(ids, map) {
  if (!ids.length) return { done: 0, total: 0, percent: 0 }
  const done = ids.filter((id) => map[id]).length
  return {
    done,
    total: ids.length,
    percent: Math.round((done / ids.length) * 100)
  }
}

export function flushBeforeLeave() {
  if (!writePending && !autoTimer) return false
  saveNow('leave')
  return true
}

async function pullIfNeeded() {
  if (writePending || syncing || sessionUnsaved) return false
  try {
    if (cloudMode && cloudClient) {
      const remote = await fetchCloudPayload(cloudClient)
      online = true
      cloudError = ''
      if (!remote) return false
      if (Number(remote.updatedAt || 0) <= Number(draft.updatedAt || 0)) {
        emit({ type: 'sync-state', ...getSyncState() })
        return false
      }
      syncing = true
      emit({ type: 'syncing' })
      applyRemote(remote)
      return true
    }

    const res = await fetch(`${SYNC_URL}/version`, { cache: 'no-store' })
    if (!res.ok) throw new Error('version failed')
    const { updatedAt } = await res.json()
    online = true
    if (!updatedAt || Number(updatedAt) <= Number(draft.updatedAt || 0)) {
      emit({ type: 'sync-state', ...getSyncState() })
      return false
    }
    syncing = true
    emit({ type: 'syncing' })
    const full = await fetch(SYNC_URL, { cache: 'no-store' })
    if (!full.ok) throw new Error('pull failed')
    const payload = await full.json()
    applyRemote(payload)
    return true
  } catch (err) {
    online = false
    if (cloudMode) cloudError = String(err?.message || err)
    emit({ type: 'sync-state', ...getSyncState() })
    return false
  } finally {
    syncing = false
    emit({ type: 'sync-state', ...getSyncState() })
  }
}

export async function initSync() {
  cloudError = ''
  cloudMode = false
  if (unsubCloud) {
    unsubCloud()
    unsubCloud = null
  }

  // 优先云端：电脑关机后手机仍可多端同步
  if (cloudEnabled()) {
    try {
      cloudClient = createCloudClient()
      const probe = await probeCloudTable(cloudClient)
      if (!probe.ok) {
        cloudError =
          probe.code === 'PGRST205' || /Could not find the table/i.test(probe.message || '')
            ? '云端表未创建：请在 Supabase SQL Editor 执行 supabase/schema.sql'
            : probe.message || '云端不可用'
        throw new Error(cloudError)
      }
      cloudMode = true
      const remote = await fetchCloudPayload(cloudClient)
      const localAt = Number(draft.updatedAt || 0)
      const localHasData =
        Object.keys(draft.checks).length ||
        Object.keys(draft.shop).length ||
        Object.keys(draft.people.dong.entries).length ||
        Object.keys(draft.people.zhao.entries).length ||
        draft.contentUpdatedAt > 0

      if (remote && Number(remote.updatedAt || 0) > localAt) {
        applyRemote(remote, { quiet: true })
      } else if (!remote || !remote.content) {
        draft.contentUpdatedAt = Math.max(draft.contentUpdatedAt, Date.now())
        draft.updatedAt = Date.now()
        await pushRemote()
      } else if (localHasData && localAt >= Number(remote.updatedAt || 0)) {
        await pushRemote()
      } else if (remote) {
        applyRemote(remote, { quiet: true })
      }

      online = true
      unsubCloud = subscribeCloud(cloudClient, (payload) => {
        if (writePending || syncing || sessionUnsaved) return
        if (Number(payload.updatedAt || 0) <= Number(draft.updatedAt || 0)) return
        applyRemote(payload)
      })
      emit({ type: 'sync-state', ...getSyncState() })
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = setInterval(() => pullIfNeeded(), POLL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pullIfNeeded()
      })
      return
    } catch (err) {
      cloudMode = false
      cloudError = String(err?.message || err)
      // 继续尝试本地 api
    }
  }

  try {
    const res = await fetch(SYNC_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error('sync unavailable')
    const remote = await res.json()
    online = true
    const remoteAt = Number(remote.updatedAt || 0)
    const localAt = Number(draft.updatedAt || 0)
    const localHasData =
      Object.keys(draft.checks).length ||
      Object.keys(draft.shop).length ||
      Object.keys(draft.people.dong.entries).length ||
      Object.keys(draft.people.zhao.entries).length

    if (remoteAt > localAt) {
      applyRemote(remote)
    } else if (!remoteAt && localHasData) {
      await pushRemote()
    } else if (remoteAt === 0 && !localHasData) {
      applyRemote(remote, { quiet: true })
    } else if (localAt >= remoteAt && localHasData && localAt > remoteAt) {
      await pushRemote()
    } else if (remoteAt > 0) {
      applyRemote(remote, { quiet: true })
    }

    if (!remote.content) {
      draft.contentUpdatedAt = Date.now()
      write(CONTENT_KEY, draft.content)
      write(CONTENT_KEY + '_at', draft.contentUpdatedAt)
      await pushRemote()
    }
  } catch {
    online = false
  }
  emit({ type: 'sync-state', ...getSyncState() })

  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    pullIfNeeded()
  }, POLL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullIfNeeded()
  })
}
