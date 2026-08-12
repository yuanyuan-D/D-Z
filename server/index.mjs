import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3001)
const DATA_DIR = join(__dirname, 'data')
const DATA_FILE = join(DATA_DIR, 'home.json')
const LEGACY_FILE = join(DATA_DIR, 'rooms.json')
const HOME_CODE = 'HOME'

const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop',
]

const SEED_CATEGORIES = ['热菜', '凉菜', '主食', '汤品', '甜品']

const SEED_DISHES = [
  { id: 'd1', name: '番茄炒蛋', description: '家常必备，酸甜开胃，妈妈的味道', price: 12, category: '热菜', image: PRESET_IMAGES[0] },
  { id: 'd2', name: '红烧排骨', description: '慢火炖煮，酱香浓郁，软烂入味', price: 28, category: '热菜', image: PRESET_IMAGES[5] },
  { id: 'd3', name: '蒜蓉西兰花', description: '清脆爽口，蒜香四溢', price: 14, category: '热菜', image: PRESET_IMAGES[2] },
  { id: 'd4', name: '凉拌黄瓜', description: '爽脆解腻，夏日首选', price: 8, category: '凉菜', image: PRESET_IMAGES[3] },
  { id: 'd5', name: '拍黄瓜', description: '蒜香辣椒油，一口清爽', price: 8, category: '凉菜', image: PRESET_IMAGES[7] },
  { id: 'd6', name: '米饭', description: '香软白米饭，配菜刚刚好', price: 2, category: '主食', image: PRESET_IMAGES[4] },
  { id: 'd7', name: '葱油拌面', description: '手工葱油，拌得满口香', price: 10, category: '主食', image: PRESET_IMAGES[1] },
  { id: 'd8', name: '番茄蛋花汤', description: '暖胃清淡，收尾必备', price: 8, category: '汤品', image: PRESET_IMAGES[6] },
  { id: 'd9', name: '银耳莲子羹', description: '温润甜美，饭后小确幸', price: 10, category: '甜品', image: PRESET_IMAGES[0] },
]

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function emptyHome() {
  return {
    code: HOME_CODE,
    name: '小董和小赵的家',
    categories: [...SEED_CATEGORIES],
    dishes: structuredClone(SEED_DISHES),
    orders: [],
    members: [],
  }
}

function normalizeCategories(rawCategories, dishes) {
  const fromRaw = Array.isArray(rawCategories) ? rawCategories.filter(Boolean) : []
  const fromDishes = Array.isArray(dishes)
    ? dishes.map((d) => d.category).filter(Boolean)
    : []
  const merged = [...fromRaw]
  for (const c of fromDishes) {
    if (!merged.includes(c)) merged.push(c)
  }
  return merged.length > 0 ? merged : [...SEED_CATEGORIES]
}

function loadHome() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    if (existsSync(DATA_FILE)) {
      const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
      const dishes = Array.isArray(raw.dishes) ? raw.dishes : structuredClone(SEED_DISHES)
      return {
        code: HOME_CODE,
        name: raw.name || '小董和小赵的家',
        categories: normalizeCategories(raw.categories, dishes),
        dishes,
        orders: Array.isArray(raw.orders) ? raw.orders : [],
        members: [],
      }
    }
    if (existsSync(LEGACY_FILE)) {
      const list = JSON.parse(readFileSync(LEGACY_FILE, 'utf8'))
      const found = Array.isArray(list)
        ? list.find((r) => r?.code === HOME_CODE) || list[0]
        : null
      if (found) {
        const dishes = Array.isArray(found.dishes) ? found.dishes : structuredClone(SEED_DISHES)
        return {
          code: HOME_CODE,
          name: found.name || '小董和小赵的家',
          categories: normalizeCategories(found.categories, dishes),
          dishes,
          orders: Array.isArray(found.orders) ? found.orders : [],
          members: [],
        }
      }
    }
  } catch (err) {
    console.error('load home failed', err)
  }
  return emptyHome()
}

const home = loadHome()

let saveTimer = null
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
      writeFileSync(
        DATA_FILE,
        JSON.stringify({
          name: home.name,
          categories: home.categories,
          dishes: home.dishes,
          orders: home.orders,
        }),
      )
    } catch (err) {
      console.error('save home failed', err)
    }
  }, 400)
}

const app = express()
app.use(express.json({ limit: '8mb' }))

const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next()
    res.sendFile(join(distDir, 'index.html'))
  })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, online: home.members.length })
})

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

/** @type {Map<import('ws').WebSocket, { memberId: string, memberName: string }>} */
const clients = new Map()

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}

function broadcast(msg, except = null) {
  const data = JSON.stringify(msg)
  for (const [ws] of clients) {
    if (ws !== except && ws.readyState === 1) ws.send(data)
  }
}

function snapshot() {
  return {
    name: home.name,
    categories: home.categories,
    dishes: home.dishes,
    orders: home.orders,
    members: home.members,
  }
}

function applyAction(action) {
  switch (action.type) {
    case 'addDish': {
      const dish = { ...action.dish, id: uid('dish') }
      home.dishes.push(dish)
      if (dish.category && !home.categories.includes(dish.category)) {
        home.categories.push(dish.category)
      }
      break
    }
    case 'updateDish': {
      home.dishes = home.dishes.map((d) =>
        d.id === action.id ? { ...action.dish, id: action.id } : d,
      )
      if (action.dish?.category && !home.categories.includes(action.dish.category)) {
        home.categories.push(action.dish.category)
      }
      break
    }
    case 'removeDish': {
      home.dishes = home.dishes.filter((d) => d.id !== action.id)
      break
    }
    case 'addCategory': {
      const name = String(action.name || '').trim()
      if (!name || home.categories.includes(name)) return false
      home.categories.push(name)
      break
    }
    case 'removeCategory': {
      const name = String(action.name || '').trim()
      if (!name || home.categories.length <= 1) return false
      home.categories = home.categories.filter((c) => c !== name)
      home.dishes = home.dishes.filter((d) => d.category !== name)
      break
    }
    case 'placeOrder': {
      home.orders.unshift(action.order)
      break
    }
    case 'markOrderDone': {
      home.orders = home.orders.map((o) =>
        o.id === action.id ? { ...o, status: 'done' } : o,
      )
      break
    }
    case 'removeOrder': {
      home.orders = home.orders.filter((o) => o.id !== action.id)
      break
    }
    default:
      return false
  }
  scheduleSave()
  return true
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }

    if (msg.type === 'hello' || msg.type === 'join' || msg.type === 'create') {
      const memberName = String(msg.memberName || '').trim() || '家人'
      let memberId = String(msg.memberId || '').trim() || uid('m')
      const existing = home.members.find((m) => m.id === memberId)
      if (existing) existing.name = memberName
      else home.members.push({ id: memberId, name: memberName })

      clients.set(ws, { memberId, memberName })
      send(ws, {
        type: 'joined',
        memberId,
        memberName,
        room: snapshot(),
      })
      broadcast({ type: 'members', members: home.members }, ws)
      return
    }

    const meta = clients.get(ws)
    if (!meta) {
      send(ws, { type: 'error', message: '连接未就绪，请刷新页面' })
      return
    }

    if (msg.type === 'rename') {
      const memberName = String(msg.memberName || '').trim() || '家人'
      meta.memberName = memberName
      const existing = home.members.find((m) => m.id === meta.memberId)
      if (existing) existing.name = memberName
      broadcast({ type: 'members', members: home.members })
      return
    }

    if (msg.type === 'action') {
      const ok = applyAction(msg.action)
      if (!ok) {
        send(ws, { type: 'error', message: '未知操作' })
        return
      }
      broadcast({
        type: 'state',
        categories: home.categories,
        dishes: home.dishes,
        orders: home.orders,
      })
    }
  })

  ws.on('close', () => {
    const meta = clients.get(ws)
    clients.delete(ws)
    if (!meta) return
    home.members = home.members.filter((m) => m.id !== meta.memberId)
    broadcast({ type: 'members', members: home.members })
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`家庭菜单服务已启动: http://0.0.0.0:${PORT}`)
})
