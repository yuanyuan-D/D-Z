import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { CLOUD, USE_CLOUD } from './cloud-config.js'

const ROW_ID = CLOUD.rowId

export function cloudEnabled() {
  return USE_CLOUD
}

export function createCloudClient() {
  if (!USE_CLOUD) return null
  return createClient(CLOUD.supabaseUrl, CLOUD.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function fetchCloudPayload(client) {
  const { data, error } = await client
    .from(CLOUD.table)
    .select('payload, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {}
  const updatedAt = data.updated_at ? Date.parse(data.updated_at) : Number(payload.updatedAt || 0)
  return { ...payload, updatedAt: Number(payload.updatedAt || updatedAt || 0) }
}

export async function upsertCloudPayload(client, payload) {
  const body = {
    id: ROW_ID,
    payload,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await client
    .from(CLOUD.table)
    .upsert(body, { onConflict: 'id' })
    .select('payload, updated_at')
    .single()
  if (error) throw error
  const next = data.payload && typeof data.payload === 'object' ? data.payload : payload
  return {
    ...next,
    updatedAt: Number(next.updatedAt || Date.parse(data.updated_at) || Date.now())
  }
}

export function subscribeCloud(client, onChange) {
  const channel = client
    .channel(`wedding-plan-${ROW_ID}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: CLOUD.table,
        filter: `id=eq.${ROW_ID}`
      },
      (msg) => {
        const row = msg.new || msg.old
        if (!row || !row.payload) return
        const payload = row.payload
        const updatedAt = row.updated_at
          ? Date.parse(row.updated_at)
          : Number(payload.updatedAt || 0)
        onChange({ ...payload, updatedAt: Number(payload.updatedAt || updatedAt || 0) })
      }
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}

export async function probeCloudTable(client) {
  const { error } = await client.from(CLOUD.table).select('id').eq('id', ROW_ID).maybeSingle()
  if (!error) return { ok: true }
  return {
    ok: false,
    code: error.code,
    message: error.message || String(error)
  }
}
