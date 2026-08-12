export type Role = 'guest' | 'merchant'

export type Dish = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
}

export type CartItem = {
  dishId: string
  quantity: number
}

export type OrderItem = {
  dishId: string
  name: string
  price: number
  quantity: number
}

export type Order = {
  id: string
  guestName: string
  items: OrderItem[]
  total: number
  createdAt: number
  status: 'pending' | 'done'
}

export type AppState = {
  dishes: Dish[]
  orders: Order[]
}
