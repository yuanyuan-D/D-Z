let onSaveHandler = null

function $(sel) {
  return document.querySelector(sel)
}

export function initEditModal() {
  $('#edit-cancel')?.addEventListener('click', closeEditModal)
  $('#edit-backdrop')?.addEventListener('click', closeEditModal)
  $('#edit-save')?.addEventListener('click', () => {
    if (!onSaveHandler) return
    const values = {}
    document.querySelectorAll('#edit-fields [data-key]').forEach((el) => {
      values[el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value
    })
    onSaveHandler(values)
    closeEditModal()
  })
}

export function closeEditModal() {
  onSaveHandler = null
  const sheet = $('#edit-sheet')
  const backdrop = $('#edit-backdrop')
  if (sheet) sheet.hidden = true
  if (backdrop) backdrop.hidden = true
}

export function openEditModal({ title, fields, onSave }) {
  onSaveHandler = onSave
  $('#edit-title').textContent = title
  $('#edit-fields').innerHTML = fields
    .map((f) => {
      if (f.type === 'textarea') {
        return `<label class="edit-field"><span>${f.label}</span><textarea data-key="${f.key}" rows="${f.rows || 3}">${escapeAttr(f.value ?? '')}</textarea></label>`
      }
      return `<label class="edit-field"><span>${f.label}</span><input data-key="${f.key}" type="${f.type || 'text'}" value="${escapeAttr(f.value ?? '')}" ${f.step ? `step="${f.step}"` : ''} /></label>`
    })
    .join('')
  $('#edit-sheet').hidden = false
  $('#edit-backdrop').hidden = false
  const first = document.querySelector('#edit-fields input, #edit-fields textarea')
  first?.focus()
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

export function confirmDelete(message) {
  return window.confirm(message || '确定删除这项吗？')
}
