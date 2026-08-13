import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { CATEGORIES, SEED_DISHES } from '../data/seed'
import type { CartItem, Dish, Order } from '../types'

export type Member = { id: string; name: string }

export type Session = {
  roomName: string
  memberId: string
  memberName: string
}

type HomeRow = {
  id: string
  name: string
  categories: string[]
  dishes: Dish[]
  orders: Order[]
}

const MEMBER_KEY = 'family-menu-member-v2'
const CART_KEY = 'family-menu-cart-v1'
const NAME_KEY = 'family-menu-guest-name-v1'
const HOME_ID = 'home'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  if (import.meta.env.DEV) {
    return `${proto}//${location.hostname}:3001/ws`
  }
  return `${proto}//${location.host}/ws`
}

function loadMemberId() {
  try {
    const id = localStorage.getItem(MEMBER_KEY)
    if (id) return id
  } catch {
    /* ignore */
  }
  const id = uid('m')
  try {
    localStorage.setItem(MEMBER_KEY, id)
  } catch {
    /* ignore */
  }
  return id
}

function loadGuestName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

type Listener = () => void

class FamilySync {
  private ws: WebSocket | null = null
  private supabase: SupabaseClient | null = null
  private channel: RealtimeChannel | null = null
  private listeners = new Set<Listener>()
  private memberId = loadMemberId()
  private renameTimer: number | null = null
  private persistTimer: number | null = null
  private applyingRemote = false

  status: 'idle' | 'connecting' | 'online' | 'offline' = 'idle'
  error = ''
  ready = false
  session: Session | null = null
  categories: string[] = [...CATEGORIES]
  dishes: Dish[] = []
  orders: Order[] = []
  members: Member[] = []
  cart: CartItem[] = loadCart()
  guestName = loadGuestName()

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.cart))
    try {
      localStorage.setItem(NAME_KEY, this.guestName)
    } catch {
      /* ignore */
    }
    for (const fn of this.listeners) fn()
  }

  private setStatus(status: FamilySync['status'], error = '') {
    this.status = status
    this.error = error
    this.emit()
  }

  connect() {
    if (USE_SUPABASE) {
      void this.connectSupabase()
      return
    }
    this.connectWebsocket()
  }

  private async connectSupabase() {
    if (this.supabase) return
    this.setStatus('connecting')
    this.supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)

    try {
      const { data, error } = await this.supabase
        .from('family_home')
        .select('*')
        .eq('id', HOME_ID)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        const seed: HomeRow = {
          id: HOME_ID,
          name: '小董和小赵的家',
          categories: [...CATEGORIES],
          dishes: structuredClone(SEED_DISHES),
          orders: [],
        }
        const inserted = await this.supabase.from('family_home').insert(seed).select().single()
        if (inserted.error) throw inserted.error
        this.applyHome(inserted.data as HomeRow)
      } else {
        this.applyHome(data as HomeRow)
      }

      this.session = {
        roomName: '小董和小赵的家',
        memberId: this.memberId,
        memberName: this.guestName.trim() || '家人',
      }
      this.ready = true
      this.setStatus('online')

      this.channel = this.supabase
        .channel('family-home', {
          config: { presence: { key: this.memberId } },
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'family_home', filter: `id=eq.${HOME_ID}` },
          (payload) => {
            if (payload.new) this.applyHome(payload.new as HomeRow)
          },
        )
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel?.presenceState() || {}
          const members: Member[] = []
          for (const key of Object.keys(state)) {
            const metas = state[key] as Array<{ name?: string }>
            const name = metas[0]?.name || '家人'
            members.push({ id: key, name })
          }
          this.members = members
          this.emit()
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.channel?.track({ name: this.guestName.trim() || '家人' })
          }
        })
    } catch (err) {
      console.error(err)
      this.setStatus('offline', '云端连接失败，请检查 Supabase 配置')
    }
  }

  private applyHome(row: HomeRow) {
    this.applyingRemote = true
    this.categories = Array.isArray(row.categories) ? row.categories : [...CATEGORIES]
    this.dishes = Array.isArray(row.dishes) ? row.dishes : []
    this.orders = Array.isArray(row.orders) ? row.orders : []
    if (this.session) this.session = { ...this.session, roomName: row.name || this.session.roomName }
    this.applyingRemote = false
    this.emit()
  }

  private schedulePersist() {
    if (!USE_SUPABASE || !this.supabase || this.applyingRemote) return
    if (this.persistTimer) window.clearTimeout(this.persistTimer)
    this.persistTimer = window.setTimeout(() => {
      void this.persist()
    }, 280)
  }

  private async persist() {
    if (!this.supabase) return
    const { error } = await this.supabase.from('family_home').upsert({
      id: HOME_ID,
      name: this.session?.roomName || '小董和小赵的家',
      categories: this.categories,
      dishes: this.dishes,
      orders: this.orders,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      this.error = error.message
      this.emit()
    }
  }

  private connectWebsocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    this.setStatus('connecting')
    const ws = new WebSocket(wsUrl())
    this.ws = ws

    ws.onopen = () => {
      this.setStatus('online')
      this.sendWs({
        type: 'hello',
        memberId: this.memberId,
        memberName: this.guestName.trim() || '家人',
      })
    }

    ws.onmessage = (ev) => {
      let msg: unknown
      try {
        msg = JSON.parse(String(ev.data))
      } catch {
        return
      }
      const data = msg as {
        type: string
        message?: string
        memberId?: string
        memberName?: string
        room?: {
          name: string
          categories?: string[]
          dishes: Dish[]
          orders: Order[]
          members: Member[]
        }
        dishes?: Dish[]
        orders?: Order[]
        categories?: string[]
        members?: Member[]
      }

      if (data.type === 'error') {
        this.error = data.message || '错误'
        this.emit()
        return
      }

      if (data.type === 'joined' && data.room) {
        this.memberId = data.memberId || this.memberId
        try {
          localStorage.setItem(MEMBER_KEY, this.memberId)
        } catch {
          /* ignore */
        }
        this.session = {
          roomName: data.room.name,
          memberId: this.memberId,
          memberName: data.memberName || this.guestName || '家人',
        }
        this.dishes = data.room.dishes
        this.orders = data.room.orders
        this.members = data.room.members
        this.categories = Array.isArray(data.room.categories)
          ? data.room.categories
          : Array.from(new Set(data.room.dishes.map((d) => d.category).filter(Boolean)))
        this.ready = true
        this.error = ''
        this.emit()
        return
      }

      if (data.type === 'state') {
        this.dishes = data.dishes || []
        this.orders = data.orders || []
        if (Array.isArray(data.categories)) this.categories = data.categories
        this.emit()
        return
      }

      if (data.type === 'members') {
        this.members = data.members || []
        this.emit()
      }
    }

    ws.onclose = () => {
      this.ws = null
      this.ready = false
      this.setStatus('offline', '连接已断开，正在重连…')
      window.setTimeout(() => this.connect(), 1600)
    }

    ws.onerror = () => {
      this.error = '无法连接，请确认已启动 npm run dev'
      this.emit()
    }
  }

  private sendWs(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.error = '尚未连接，请稍候再试'
      this.emit()
      return false
    }
    this.ws.send(JSON.stringify(payload))
    return true
  }

  private sendAction(action: Record<string, unknown>) {
    if (USE_SUPABASE) {
      this.applyLocalAction(action)
      this.schedulePersist()
      return true
    }
    return this.sendWs({ type: 'action', action })
  }

  private applyLocalAction(action: Record<string, unknown>) {
    switch (action.type) {
      case 'addDish': {
        const dish = { ...(action.dish as Omit<Dish, 'id'>), id: uid('dish') }
        this.dishes = [...this.dishes, dish]
        if (dish.category && !this.categories.includes(dish.category)) {
          this.categories = [...this.categories, dish.category]
        }
        break
      }
      case 'updateDish': {
        const id = String(action.id)
        const dish = action.dish as Omit<Dish, 'id'>
        this.dishes = this.dishes.map((d) => (d.id === id ? { ...dish, id } : d))
        if (dish.category && !this.categories.includes(dish.category)) {
          this.categories = [...this.categories, dish.category]
        }
        break
      }
      case 'removeDish': {
        const id = String(action.id)
        this.dishes = this.dishes.filter((d) => d.id !== id)
        this.cart = this.cart.filter((c) => c.dishId !== id)
        break
      }
      case 'addCategory': {
        const name = String(action.name || '').trim()
        if (!name || this.categories.includes(name)) return
        this.categories = [...this.categories, name]
        break
      }
      case 'removeCategory': {
        const name = String(action.name || '').trim()
        if (!name || this.categories.length <= 1) return
        this.categories = this.categories.filter((c) => c !== name)
        this.dishes = this.dishes.filter((d) => d.category !== name)
        break
      }
      case 'placeOrder': {
        this.orders = [action.order as Order, ...this.orders]
        break
      }
      case 'markOrderDone': {
        const id = String(action.id)
        this.orders = this.orders.map((o) => (o.id === id ? { ...o, status: 'done' as const } : o))
        break
      }
      case 'removeOrder': {
        const id = String(action.id)
        this.orders = this.orders.filter((o) => o.id !== id)
        break
      }
      default:
        return
    }
    this.emit()
  }

  setGuestName(name: string) {
    this.guestName = name
    const trimmed = name.trim() || '家人'
    if (this.session) this.session = { ...this.session, memberName: trimmed }
    this.emit()
    if (this.renameTimer) window.clearTimeout(this.renameTimer)
    this.renameTimer = window.setTimeout(() => {
      if (USE_SUPABASE) {
        void this.channel?.track({ name: this.guestName.trim() || '家人' })
        return
      }
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendWs({ type: 'rename', memberName: this.guestName.trim() || '家人' })
      }
    }, 280)
  }

  addDish(dish: Omit<Dish, 'id'>) {
    this.sendAction({ type: 'addDish', dish })
  }

  updateDish(id: string, dish: Omit<Dish, 'id'>) {
    this.sendAction({ type: 'updateDish', id, dish })
  }

  removeDish(id: string) {
    this.sendAction({ type: 'removeDish', id })
    this.cart = this.cart.filter((c) => c.dishId !== id)
    this.emit()
  }

  addCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return false
    return this.sendAction({ type: 'addCategory', name: trimmed })
  }

  removeCategory(name: string) {
    return this.sendAction({ type: 'removeCategory', name })
  }

  setQty(dishId: string, quantity: number) {
    if (quantity <= 0) this.cart = this.cart.filter((c) => c.dishId !== dishId)
    else {
      const exists = this.cart.find((c) => c.dishId === dishId)
      this.cart = exists
        ? this.cart.map((c) => (c.dishId === dishId ? { ...c, quantity } : c))
        : [...this.cart, { dishId, quantity }]
    }
    this.emit()
  }

  placeOrder(guestName?: string) {
    if (this.cart.length === 0) return false
    const items = this.cart
      .map((c) => {
        const dish = this.dishes.find((d) => d.id === c.dishId)
        if (!dish) return null
        return {
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: c.quantity,
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

    if (items.length === 0) return false

    const name = (guestName || this.guestName || '家人').trim()
    this.guestName = name

    const order: Order = {
      id: uid('order'),
      guestName: name,
      items,
      total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      createdAt: Date.now(),
      status: 'pending',
    }

    const ok = this.sendAction({ type: 'placeOrder', order })
    if (ok) {
      this.cart = []
      this.emit()
    }
    return ok
  }

  markOrderDone(id: string) {
    this.sendAction({ type: 'markOrderDone', id })
  }

  removeOrder(id: string) {
    this.sendAction({ type: 'removeOrder', id })
  }

  get cartCount() {
    return this.cart.reduce((n, c) => n + c.quantity, 0)
  }

  get cartTotal() {
    return this.cart.reduce((sum, c) => {
      const dish = this.dishes.find((d) => d.id === c.dishId)
      return sum + (dish ? dish.price * c.quantity : 0)
    }, 0)
  }
}

export const familySync = new FamilySync()
