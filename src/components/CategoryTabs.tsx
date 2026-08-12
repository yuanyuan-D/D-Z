import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'

type Props = {
  categories: string[]
  active: string
  onChange: (category: string) => void
  editable?: boolean
  onAdd?: (name: string) => void
  onRemove?: (name: string) => void
}

export function CategoryTabs({
  categories,
  active,
  onChange,
  editable = false,
  onAdd,
  onRemove,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [])

  const revealDelete = (cat: string) => {
    if (!editable || categories.length <= 1) return
    setDeleting(cat)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setDeleting(null), 3500)
  }

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const submitAdd = () => {
    const name = draft.trim()
    if (!name) {
      setAdding(false)
      setDraft('')
      return
    }
    onAdd?.(name)
    setDraft('')
    setAdding(false)
    onChange(name)
  }

  return (
    <div className="category-tabs-wrap">
      <div className="category-tabs" role="tablist" aria-label="菜品分类">
        {categories.map((cat) => {
          const showDelete = editable && deleting === cat && categories.length > 1
          return (
            <div
              key={cat}
              className={`category-tabs__chip${active === cat ? ' is-active' : ''}${
                showDelete ? ' is-deleting' : ''
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active === cat}
                className="category-tabs__item"
                onClick={() => {
                  if (dragged.current) return
                  onChange(cat)
                  if (deleting && deleting !== cat) setDeleting(null)
                }}
                onDoubleClick={(e) => {
                  if (!editable) return
                  e.preventDefault()
                  revealDelete(cat)
                }}
                onContextMenu={(e) => {
                  if (!editable) return
                  e.preventDefault()
                  revealDelete(cat)
                }}
                onPointerDown={(e) => {
                  pointerStart.current = { x: e.clientX, y: e.clientY }
                  dragged.current = false
                  if (!editable) return
                  clearLongPress()
                  longPressTimer.current = window.setTimeout(() => {
                    revealDelete(cat)
                    longPressTimer.current = null
                  }, 480)
                }}
                onPointerMove={(e) => {
                  if (!pointerStart.current) return
                  const dx = Math.abs(e.clientX - pointerStart.current.x)
                  const dy = Math.abs(e.clientY - pointerStart.current.y)
                  if (dx > 8 || dy > 8) {
                    dragged.current = true
                    clearLongPress()
                  }
                }}
                onPointerUp={() => {
                  clearLongPress()
                  pointerStart.current = null
                }}
                onPointerCancel={() => {
                  clearLongPress()
                  pointerStart.current = null
                }}
              >
                {cat}
              </button>
              {showDelete && (
                <button
                  type="button"
                  className="category-tabs__remove"
                  aria-label={`删除分类 ${cat}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleting(null)
                    onRemove?.(cat)
                  }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )
        })}

        {editable &&
          (adding ? (
            <div className="category-tabs__add-form">
              <input
                ref={inputRef}
                value={draft}
                maxLength={12}
                placeholder="新分类"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitAdd()
                  }
                  if (e.key === 'Escape') {
                    setAdding(false)
                    setDraft('')
                  }
                }}
                onBlur={submitAdd}
              />
            </div>
          ) : (
            <button
              type="button"
              className="category-tabs__add"
              aria-label="新增分类"
              onClick={() => setAdding(true)}
            >
              <Plus size={16} />
            </button>
          ))}
      </div>
      {editable ? (
        <p className="category-tabs__hint">左右滑动查看更多 · 长按或双击分类可删除</p>
      ) : categories.length > 0 ? (
        <p className="category-tabs__hint">点击分类跳转 · 滑动菜单时分类会自动高亮</p>
      ) : null}
    </div>
  )
}
