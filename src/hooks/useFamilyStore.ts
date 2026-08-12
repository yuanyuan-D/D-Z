import { useEffect, useState } from 'react'
import { familySync, type Member, type Session } from '../sync/familySync'
import type { CartItem, Dish, Order } from '../types'

type Snapshot = {
  status: typeof familySync.status
  error: string
  ready: boolean
  session: Session | null
  categories: string[]
  dishes: Dish[]
  orders: Order[]
  members: Member[]
  cart: CartItem[]
  cartCount: number
  cartTotal: number
  guestName: string
}

function readSnapshot(): Snapshot {
  return {
    status: familySync.status,
    error: familySync.error,
    ready: familySync.ready,
    session: familySync.session,
    categories: familySync.categories,
    dishes: familySync.dishes,
    orders: familySync.orders,
    members: familySync.members,
    cart: familySync.cart,
    cartCount: familySync.cartCount,
    cartTotal: familySync.cartTotal,
    guestName: familySync.guestName,
  }
}

export function useFamilyStore() {
  const [snap, setSnap] = useState<Snapshot>(readSnapshot)

  useEffect(() => {
    return familySync.subscribe(() => setSnap(readSnapshot()))
  }, [])

  useEffect(() => {
    familySync.connect()
  }, [])

  return {
    ...snap,
    setGuestName: familySync.setGuestName.bind(familySync),
    addDish: familySync.addDish.bind(familySync),
    updateDish: familySync.updateDish.bind(familySync),
    removeDish: familySync.removeDish.bind(familySync),
    addCategory: familySync.addCategory.bind(familySync),
    removeCategory: familySync.removeCategory.bind(familySync),
    setQty: familySync.setQty.bind(familySync),
    placeOrder: familySync.placeOrder.bind(familySync),
    markOrderDone: familySync.markOrderDone.bind(familySync),
    removeOrder: familySync.removeOrder.bind(familySync),
  }
}

export type { Session, Member }
