import { Minus, Plus, Trash2 } from 'lucide-react'
import type { Dish } from '../types'

type GuestProps = {
  mode: 'guest'
  dish: Dish
  quantity: number
  onChangeQty: (qty: number) => void
}

type MerchantProps = {
  mode: 'merchant'
  dish: Dish
  onEdit: () => void
  onDelete: () => void
}

type Props = GuestProps | MerchantProps

export function DishCard(props: Props) {
  const { dish } = props

  return (
    <article className="dish-card">
      <div className="dish-card__media">
        <img src={dish.image} alt={dish.name} loading="lazy" />
      </div>
      <div className="dish-card__body">
        <div className="dish-card__top">
          <h3>{dish.name}</h3>
          <p className="dish-card__desc">{dish.description}</p>
        </div>
        <div className="dish-card__bottom">
          <span className="price">¥{dish.price.toFixed(0)}</span>
          {props.mode === 'guest' ? (
            <div className="qty-control">
              {props.quantity > 0 && (
                <>
                  <button
                    type="button"
                    aria-label="减少"
                    onClick={() => props.onChangeQty(props.quantity - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span>{props.quantity}</span>
                </>
              )}
              <button
                type="button"
                className="qty-control__add"
                aria-label="增加"
                onClick={() => props.onChangeQty(props.quantity + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <div className="merchant-actions">
              <button type="button" className="text-btn" onClick={props.onEdit}>
                编辑
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                aria-label="删除"
                onClick={props.onDelete}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
