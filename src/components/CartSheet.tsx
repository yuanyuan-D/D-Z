import { Minus, Plus, X } from 'lucide-react'
import type { CartItem, Dish } from '../types'

type Props = {
  open: boolean
  dishes: Dish[]
  cart: CartItem[]
  total: number
  guestName: string
  onGuestNameChange: (name: string) => void
  nameLocked?: boolean
  onChangeQty: (dishId: string, qty: number) => void
  onClose: () => void
  onSubmit: () => void
}

export function CartSheet({
  open,
  dishes,
  cart,
  total,
  guestName,
  onGuestNameChange,
  nameLocked = false,
  onChangeQty,
  onClose,
  onSubmit,
}: Props) {
  if (!open) return null

  const lines = cart
    .map((c) => {
      const dish = dishes.find((d) => d.id === c.dishId)
      return dish ? { dish, quantity: c.quantity } : null
    })
    .filter((x): x is { dish: Dish; quantity: number } => Boolean(x))

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="购物车"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__header">
          <h2>已点菜品</h2>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {lines.length === 0 ? (
          <p className="empty">还没有点菜，先去菜单逛逛吧</p>
        ) : (
          <ul className="cart-list">
            {lines.map(({ dish, quantity }) => (
              <li key={dish.id}>
                <img src={dish.image} alt="" />
                <div>
                  <strong>{dish.name}</strong>
                  <span>¥{(dish.price * quantity).toFixed(0)}</span>
                </div>
                <div className="qty-control">
                  <button
                    type="button"
                    aria-label="减少"
                    onClick={() => onChangeQty(dish.id, quantity - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    className="qty-control__add"
                    aria-label="增加"
                    onClick={() => onChangeQty(dish.id, quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="sheet__footer">
          <label className="field">
            <span>点单人</span>
            <input
              value={guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
              placeholder="例如：爸爸 / 小明"
              maxLength={20}
              readOnly={nameLocked}
            />
          </label>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={lines.length === 0}
            onClick={onSubmit}
          >
            提交订单 · ¥{total.toFixed(0)}
          </button>
        </div>
      </div>
    </div>
  )
}
