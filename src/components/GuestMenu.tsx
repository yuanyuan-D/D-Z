import { useEffect, useMemo, useRef } from 'react'
import { CategoryTabs } from './CategoryTabs'
import { DishCard } from './DishCard'
import type { CartItem, Dish } from '../types'

type Props = {
  categories: string[]
  dishes: Dish[]
  cart: CartItem[]
  activeCategory: string
  onActiveCategoryChange: (category: string) => void
  onChangeQty: (dishId: string, qty: number) => void
}

export function GuestMenu({
  categories,
  dishes,
  cart,
  activeCategory,
  onActiveCategoryChange,
  onChangeQty,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lockRef = useRef(false)
  const lockTimer = useRef<number | null>(null)

  const sections = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        dishes: dishes.filter((d) => d.category === cat),
      }))
      .filter((s) => s.dishes.length > 0)
  }, [categories, dishes])

  useEffect(() => {
    return () => {
      if (lockTimer.current) window.clearTimeout(lockTimer.current)
    }
  }, [])

  const syncActiveFromScroll = () => {
    if (lockRef.current) return
    const root = scrollRef.current
    if (!root || sections.length === 0) return

    const marker = root.getBoundingClientRect().top + 12
    let current = sections[0].category

    for (const section of sections) {
      const el = root.querySelector<HTMLElement>(`[data-category="${CSS.escape(section.category)}"]`)
      if (!el) continue
      if (el.getBoundingClientRect().top <= marker) {
        current = section.category
      }
    }

    if (current !== activeCategory) onActiveCategoryChange(current)
  }

  const scrollToCategory = (cat: string) => {
    const root = scrollRef.current
    const el = root?.querySelector<HTMLElement>(`[data-category="${CSS.escape(cat)}"]`)
    if (!root || !el) {
      onActiveCategoryChange(cat)
      return
    }

    lockRef.current = true
    onActiveCategoryChange(cat)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })

    if (lockTimer.current) window.clearTimeout(lockTimer.current)
    lockTimer.current = window.setTimeout(() => {
      lockRef.current = false
    }, 450)
  }

  if (sections.length === 0) {
    return <p className="empty">还没有菜品，等厨房上菜吧</p>
  }

  return (
    <div className="guest-menu">
      <div className="guest-menu__tabs">
        <CategoryTabs
          categories={categories}
          active={activeCategory}
          onChange={scrollToCategory}
        />
      </div>
      <div
        className="guest-menu__scroll"
        ref={scrollRef}
        onScroll={syncActiveFromScroll}
      >
        {sections.map((section) => (
          <section
            key={section.category}
            className="guest-menu__section"
            data-category={section.category}
          >
            <h2 className="guest-menu__title">{section.category}</h2>
            <div className="dish-list">
              {section.dishes.map((dish) => {
                const qty = cart.find((c) => c.dishId === dish.id)?.quantity ?? 0
                return (
                  <DishCard
                    key={dish.id}
                    mode="guest"
                    dish={dish}
                    quantity={qty}
                    onChangeQty={(q) => onChangeQty(dish.id, q)}
                  />
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
