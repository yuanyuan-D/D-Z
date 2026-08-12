import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CategoryTabs } from './CategoryTabs'
import { PRESET_IMAGES } from '../data/seed'
import type { Dish } from '../types'

type Props = {
  open: boolean
  initial?: Dish | null
  categories: string[]
  defaultCategory?: string
  onClose: () => void
  onSave: (dish: Omit<Dish, 'id'>) => void
  onAddCategory?: (name: string) => void
  onRemoveCategory?: (name: string) => void
}

const empty = {
  name: '',
  description: '',
  price: '',
  category: '',
  image: '',
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const raw = String(reader.result || '')
      const img = new Image()
      img.onload = () => {
        const max = 800
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(raw)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => resolve(raw)
      img.src = raw
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function DishForm({
  open,
  initial,
  categories,
  defaultCategory,
  onClose,
  onSave,
  onAddCategory,
  onRemoveCategory,
}: Props) {
  const [form, setForm] = useState(empty)
  const [picking, setPicking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fallbackCategory = defaultCategory || categories[0] || '热菜'

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        name: initial.name,
        description: initial.description,
        price: String(initial.price),
        category: initial.category,
        image: initial.image,
      })
    } else {
      setForm({ ...empty, category: fallbackCategory, image: PRESET_IMAGES[0] })
    }
  }, [open, initial, fallbackCategory])

  if (!open) return null

  const canSave =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    Number(form.price) > 0 &&
    form.image.trim().length > 0

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet sheet--form"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? '编辑菜品' : '新增菜品'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__header">
          <h2>{initial ? '编辑菜品' : '新增菜品'}</h2>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form
          className="dish-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSave) return
            onSave({
              name: form.name.trim(),
              description: form.description.trim(),
              price: Number(form.price),
              category: form.category,
              image: form.image.trim(),
            })
          }}
        >
          <div className="field">
            <span>图片</span>
            <div className="image-plus">
              <button
                type="button"
                className="image-plus__btn"
                disabled={picking}
                aria-label="选择图片（相册 / 相机 / 本地文件）"
                onClick={() => fileRef.current?.click()}
              >
                {form.image ? (
                  <img src={form.image} alt="菜品预览" />
                ) : (
                  <span className="image-plus__placeholder">添加图片</span>
                )}
                <i className="image-plus__badge" aria-hidden="true">
                  <Plus size={18} strokeWidth={2.5} />
                </i>
                {picking && <span className="image-plus__loading">处理中…</span>}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setPicking(true)
                  try {
                    const dataUrl = await readImageFile(file)
                    setForm((f) => ({ ...f, image: dataUrl }))
                  } finally {
                    setPicking(false)
                  }
                }}
              />
            </div>
            <p className="field-hint">手机可从相册或相机选择，电脑可上传本地图片</p>
            <div className="image-picks">
              {PRESET_IMAGES.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`image-picks__item${form.image === src ? ' is-active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, image: src }))}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>菜名</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例如：红烧肉"
              required
            />
          </label>

          <div className="field">
            <span>分类</span>
            <CategoryTabs
              categories={categories}
              active={form.category || fallbackCategory}
              onChange={(cat) => setForm((f) => ({ ...f, category: cat }))}
              editable
              onAdd={(name) => {
                onAddCategory?.(name)
                setForm((f) => ({ ...f, category: name }))
              }}
              onRemove={(name) => {
                onRemoveCategory?.(name)
                if ((form.category || fallbackCategory) === name) {
                  const next = categories.find((c) => c !== name) || ''
                  setForm((f) => ({ ...f, category: next }))
                }
              }}
            />
          </div>

          <label className="field">
            <span>价钱（元）</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="18"
              required
            />
          </label>

          <label className="field">
            <span>描述</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="简单介绍这道菜"
              rows={3}
              required
            />
          </label>

          <button type="submit" className="btn btn--primary btn--block" disabled={!canSave}>
            保存
          </button>
        </form>
      </div>
    </div>
  )
}
