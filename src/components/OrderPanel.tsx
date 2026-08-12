import { Check, Trash2 } from 'lucide-react'
import type { Order } from '../types'

type Props = {
  orders: Order[]
  canManage: boolean
  onDone?: (id: string) => void
  onRemove?: (id: string) => void
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderPanel({ orders, canManage, onDone, onRemove }: Props) {
  if (orders.length === 0) {
    return <p className="empty">暂无点单，等家人来点吧</p>
  }

  return (
    <ul className="order-list">
      {orders.map((order) => (
        <li key={order.id} className={`order-item${order.status === 'done' ? ' is-done' : ''}`}>
          <header>
            <div>
              <strong>{order.guestName}</strong>
              <time dateTime={new Date(order.createdAt).toISOString()}>
                {formatTime(order.createdAt)}
              </time>
            </div>
            <span className={`status status--${order.status}`}>
              {order.status === 'pending' ? '待做' : '已完成'}
            </span>
          </header>
          <ul className="order-item__lines">
            {order.items.map((item) => (
              <li key={`${order.id}-${item.dishId}`}>
                <span>
                  {item.name} ×{item.quantity}
                </span>
                <span>¥{(item.price * item.quantity).toFixed(0)}</span>
              </li>
            ))}
          </ul>
          <footer>
            <span className="price">合计 ¥{order.total.toFixed(0)}</span>
            {canManage && (
              <div className="merchant-actions">
                {order.status === 'pending' && onDone && (
                  <button type="button" className="text-btn" onClick={() => onDone(order.id)}>
                    <Check size={14} /> 做完了
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label="删除订单"
                    onClick={() => onRemove(order.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </footer>
        </li>
      ))}
    </ul>
  )
}
