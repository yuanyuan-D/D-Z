import type { CartItem, Dish, Order } from '../types'

export type Member = { id: string; name: string }

export type Session = {
  roomName: string
  memberId: string
  memberName: string
}

type Action =
  | { type: 'addDish'; dish: Omit<Dish, 'id'> }
  | { type: 'updateDish'; id: string; dish: Omit<Dish, 'id'> }
  | { type: 'removeDish'; id: string }
  | { type: 'addCategory'; name: string }
  | { type: 'removeCategory'; name: string }
  | { type: 'placeOrder'; order: Order }
  | { type: 'markOrderDone'; id: string }
  | { type: 'removeOrder'; id: string }

type ServerMsg =
  | {
      type: 'joined'
      memberId: string
      memberName: string
      room: {
        name: string
        categories: string[]
        dishes: Dish[]
        orders: Order[]
        members: Member[]
      }
    }
  | { type: 'state'; categories: string[]; dishes: Dish[]; orders: Order[] }
  | { type: 'members'; members: Member[] }
  | { type: 'error'; message: string }

const MEMBER_KEY = 'family-menu-member-v2'
const CART_KEY = 'family-menu-cart-v1'
const NAME_KEY = 'family-menu-guest-name-v1'

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
  private listeners = new Set<Listener>()
  private memberId = loadMemberId()
  private renameTimer: number | null = null

  status: 'idle' | 'connecting' | 'online' | 'offline' = 'idle'
  error = ''
  ready = false
  session: Session | null = null
  categories: string[] = []
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
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    this.setStatus('connecting')
    const ws = new WebSocket(wsUrl())
    this.ws = ws

    ws.onopen = () => {
      this.setStatus('online')
      this.send({
        type: 'hello',
        memberId: this.memberId,
        memberName: this.guestName.trim() || '家人',
      })
    }

    ws.onmessage = (ev) => {
      let msg: ServerMsg
      try {
        msg = JSON.parse(String(ev.data)) as ServerMsg
      } catch {
        return
      }

      if (msg.type === 'error') {
        this.error = msg.message
        this.emit()
        return
      }

      if (msg.type === 'joined') {
        this.memberId = msg.memberId
        try {
          localStorage.setItem(MEMBER_KEY, msg.memberId)
        } catch {
          /* ignore */
        }
        this.session = {
          roomName: msg.room.name,
          memberId: msg.memberId,
          memberName: msg.memberName,
        }
        this.dishes = msg.room.dishes
        this.orders = msg.room.orders
        this.members = msg.room.members
        this.categories = Array.isArray(msg.room.categories)
          ? msg.room.categories
          : Array.from(new Set(msg.room.dishes.map((d) => d.category).filter(Boolean)))
        this.ready = true
        this.error = ''
        this.emit()
        return
      }

      if (msg.type === 'state') {
        this.dishes = msg.dishes
        this.orders = msg.orders
        if (Array.isArray(msg.categories)) this.categories = msg.categories
        this.emit()
        return
      }

      if (msg.type === 'members') {
        this.members = msg.members
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

  private send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.error = '尚未连接，请稍候再试'
      this.emit()
      return false
    }
    this.ws.send(JSON.stringify(payload))
    return true
  }

  private sendAction(action: Action) {
    return this.send({ type: 'action', action })
  }

  setGuestName(name: string) {
    this.guestName = name
    const trimmed = name.trim() || '家人'
    if (this.session) {
      this.session = { ...this.session, memberName: trimmed }
    }
    this.emit()
    if (this.renameTimer) window.clearTimeout(this.renameTimer)
    this.renameTimer = window.setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'rename', memberName: this.guestName.trim() || '家人' })
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
