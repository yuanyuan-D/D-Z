import { useEffect, useMemo, useState } from 'react'
import { ChefHat, ClipboardList, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { CartSheet } from './components/CartSheet'
import { CategoryTabs } from './components/CategoryTabs'
import { DishCard } from './components/DishCard'
import { DishForm } from './components/DishForm'
import { GuestMenu } from './components/GuestMenu'
import { OrderPanel } from './components/OrderPanel'
import { RoleGate } from './components/RoleGate'
import { useFamilyStore } from './hooks/useFamilyStore'
import type { Dish, Role } from './types'
import './App.css'

type MerchantTab = 'menu' | 'orders'
type GuestTab = 'menu' | 'orders'

export default function App() {
  const store = useFamilyStore()
  const [role, setRole] = useState<Role | null>(null)
  const [category, setCategory] = useState('')
  const [merchantTab, setMerchantTab] = useState<MerchantTab>('menu')
  const [guestTab, setGuestTab] = useState<GuestTab>('menu')
  const [cartOpen, setCartOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dish | null>(null)
  const [toast, setToast] = useState('')

  const categories = useMemo(() => {
    if (store.categories.length > 0) return store.categories
    return Array.from(new Set(store.dishes.map((d) => d.category).filter(Boolean)))
  }, [store.categories, store.dishes])

  useEffect(() => {
    if (categories.length === 0) return
    if (!category || !categories.includes(category)) {
      setCategory(categories[0])
    }
  }, [categories, category])

  const visibleDishes = store.dishes.filter((d) => d.category === category)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }

  const handleAddCategory = (name: string) => {
    if (categories.includes(name)) {
      showToast('分类已存在')
      setCategory(name)
      return
    }
    store.addCategory(name)
    setCategory(name)
    showToast('分类已添加并同步')
  }

  const handleRemoveCategory = (name: string) => {
    const count = store.dishes.filter((d) => d.category === name).length
    const tip =
      count > 0
        ? `删除「${name}」？该分类下 ${count} 道菜也会删除`
        : `确定删除分类「${name}」？`
    if (!window.confirm(tip)) return
    store.removeCategory(name)
    showToast('分类已删除并同步')
  }

  if (!role) {
    return (
      <div className="app-shell">
        <RoleGate
          onPick={setRole}
          userName={store.guestName}
          onUserNameChange={store.setGuestName}
          members={store.members}
          status={store.status}
          error={store.error}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="phone">
        <header className="topbar">
          <div className="topbar__brand">
            <p className="brand">小董和小赵的家</p>
            <span>
              {store.guestName.trim() || '家人'} · {role === 'guest' ? '餐厅点单' : '厨房管理'}
              {store.status === 'online' ? '' : ' · 同步中…'}
            </span>
          </div>
          <div className="role-switch" role="group" aria-label="切换角色">
            <button
              type="button"
              className={role === 'guest' ? 'is-active' : ''}
              onClick={() => {
                setRole('guest')
                setGuestTab('menu')
              }}
            >
              餐厅
            </button>
            <button
              type="button"
              className={role === 'merchant' ? 'is-active' : ''}
              onClick={() => {
                setRole('merchant')
                setMerchantTab('menu')
              }}
            >
              厨房
            </button>
          </div>
        </header>

        {role === 'guest' ? (
          <>
            <nav className="subnav">
              <button
                type="button"
                className={guestTab === 'menu' ? 'is-active' : ''}
                onClick={() => setGuestTab('menu')}
              >
                <UtensilsCrossed size={16} /> 菜单
              </button>
              <button
                type="button"
                className={guestTab === 'orders' ? 'is-active' : ''}
                onClick={() => setGuestTab('orders')}
              >
                <ClipboardList size={16} /> 点单记录
              </button>
            </nav>

            {guestTab === 'menu' ? (
              <main className="main main--with-cart main--guest-menu">
                <GuestMenu
                  categories={categories}
                  dishes={store.dishes}
                  cart={store.cart}
                  activeCategory={category}
                  onActiveCategoryChange={setCategory}
                  onChangeQty={store.setQty}
                />
              </main>
            ) : (
              <main className="main">
                <OrderPanel orders={store.orders} canManage={false} />
              </main>
            )}

            {guestTab === 'menu' && (
              <button
                type="button"
                className={`cart-bar${store.cartCount > 0 ? ' is-ready' : ''}`}
                onClick={() => setCartOpen(true)}
                disabled={store.cartCount === 0}
              >
                <span className="cart-bar__icon">
                  <ShoppingBag size={20} />
                  {store.cartCount > 0 && <i>{store.cartCount}</i>}
                </span>
                <span className="cart-bar__total">
                  {store.cartCount > 0 ? `¥${store.cartTotal.toFixed(0)}` : '购物车是空的'}
                </span>
                <span className="cart-bar__cta">去结算</span>
              </button>
            )}

            <CartSheet
              open={cartOpen}
              dishes={store.dishes}
              cart={store.cart}
              total={store.cartTotal}
              guestName={store.guestName}
              onGuestNameChange={store.setGuestName}
              onChangeQty={store.setQty}
              onClose={() => setCartOpen(false)}
              onSubmit={() => {
                const ok = store.placeOrder(store.guestName)
                if (ok) {
                  setCartOpen(false)
                  showToast('点单成功，厨房已同步收到')
                  setGuestTab('orders')
                }
              }}
            />
          </>
        ) : (
          <>
            <nav className="subnav">
              <button
                type="button"
                className={merchantTab === 'menu' ? 'is-active' : ''}
                onClick={() => setMerchantTab('menu')}
              >
                <ChefHat size={16} /> 菜单管理
              </button>
              <button
                type="button"
                className={merchantTab === 'orders' ? 'is-active' : ''}
                onClick={() => setMerchantTab('orders')}
              >
                <ClipboardList size={16} />
                点单内容
                {store.orders.filter((o) => o.status === 'pending').length > 0 && (
                  <i className="badge">
                    {store.orders.filter((o) => o.status === 'pending').length}
                  </i>
                )}
              </button>
            </nav>

            {merchantTab === 'menu' ? (
              <main className="main main--with-fab">
                <CategoryTabs
                  categories={categories}
                  active={category}
                  onChange={setCategory}
                  editable
                  onAdd={handleAddCategory}
                  onRemove={handleRemoveCategory}
                />
                <div className="dish-list">
                  {visibleDishes.length === 0 ? (
                    <p className="empty">这个分类还没有菜，点下方新增吧</p>
                  ) : (
                    visibleDishes.map((dish) => (
                      <DishCard
                        key={dish.id}
                        mode="merchant"
                        dish={dish}
                        onEdit={() => {
                          setEditing(dish)
                          setFormOpen(true)
                        }}
                        onDelete={() => {
                          if (window.confirm(`确定删除「${dish.name}」？`)) {
                            store.removeDish(dish.id)
                            showToast('已删除菜品')
                          }
                        }}
                      />
                    ))
                  )}
                </div>
                <button
                  type="button"
                  className="fab"
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  新增菜品
                </button>
              </main>
            ) : (
              <main className="main">
                <OrderPanel
                  orders={store.orders}
                  canManage
                  onDone={(id) => {
                    store.markOrderDone(id)
                    showToast('已标记完成')
                  }}
                  onRemove={(id) => {
                    if (window.confirm('删除这笔点单？')) {
                      store.removeOrder(id)
                    }
                  }}
                />
              </main>
            )}

            <DishForm
              open={formOpen}
              initial={editing}
              categories={categories}
              defaultCategory={category}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
              onClose={() => {
                setFormOpen(false)
                setEditing(null)
              }}
              onSave={(dish) => {
                if (editing) {
                  store.updateDish(editing.id, dish)
                  showToast('菜品已更新并同步')
                } else {
                  store.addDish(dish)
                  setCategory(dish.category)
                  showToast('菜品已添加并同步')
                }
                setFormOpen(false)
                setEditing(null)
              }}
            />
          </>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}
