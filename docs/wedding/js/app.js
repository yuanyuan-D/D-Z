import {
  getChecks,
  toggleCheck,
  getShopChecks,
  toggleShop,
  calcProgress,
  subscribe,
  isDirty,
  needsLeaveConfirm,
  saveNow,
  getLastSavedAt,
  flushBeforeLeave,
  getWeightData,
  setWeightPerson,
  setWeightGoals,
  upsertWeightEntry,
  removeWeightEntry,
  initSync,
  getSyncState,
  getContent,
  getAllTasks,
  updateContent,
  uid
} from './store.js'
import {
  PEOPLE,
  todayKey,
  getActiveProfile,
  sortedLogs,
  summarize,
  buildWeightChart
} from './weight.js'
import { PHASE_MAP } from './content-model.js'
import { initEditModal, openEditModal, confirmDelete } from './edit-ui.js'

const WEDDING_DATE = '2027-05-01'

const state = {
  view: 'overview',
  phaseId: 'p1',
  showDay: false,
  shopCat: '',
  tipTab: 0
}

function daysUntil(dateStr) {
  const target = new Date(dateStr.replace(/-/g, '/') + ' 00:00:00')
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.ceil((target - start) / 86400000))
}

function $(sel, root = document) {
  return root.querySelector(sel)
}

function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)]
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function progressBar(percent) {
  return `<div class="track"><div class="bar" style="width:${percent}%"></div></div>`
}

function editBtns(attrs) {
  return `<span class="item-actions">
    <button type="button" class="mini-btn" ${attrs.edit}>改</button>
    <button type="button" class="mini-btn danger" ${attrs.del}>删</button>
  </span>`
}

function addBtn(attr, label = '添加') {
  return `<button type="button" class="add-btn" ${attr}>＋ ${label}</button>`
}

function renderHero() {
  const checks = getChecks()
  const tasks = getAllTasks()
  const progress = calcProgress(
    tasks.map((t) => t.id),
    checks
  )
  const days = daysUntil(WEDDING_DATE)
  $('#hero-countdown').textContent = String(days)
  $('#hero-progress').textContent = `${progress.percent}%`
  $('#hero-progress-bar').style.width = `${progress.percent}%`
  $('#hero-done').textContent = `${progress.done}/${progress.total}`
}

function renderOverview() {
  const { overview } = getContent()
  const checks = getChecks()
  const allTasks = getAllTasks()
  const stages = overview.stages
    .map((stage) => {
      const phaseId = PHASE_MAP[stage.id] || stage.id.replace(/^s/, 'p')
      const ids = allTasks.filter((t) => t.phaseId === phaseId).map((t) => t.id)
      const p = calcProgress(ids, checks)
      return `
        <article class="stage-item reveal">
          <div class="stage-head">
            <h3>${escapeHtml(stage.name)}</h3>
            <span class="pill">${escapeHtml(stage.time)}</span>
          </div>
          <p>${escapeHtml(stage.goal)}</p>
          ${progressBar(p.percent)}
          <div class="meta">${p.done}/${p.total} 项完成</div>
          ${editBtns({
            edit: `data-edit-stage="${stage.id}"`,
            del: `data-del-stage="${stage.id}"`
          })}
        </article>`
    })
    .join('')

  const roles = overview.roles
    .map(
      (r) => `
      <article class="role-item reveal">
        <div class="stage-head">
          <h3>${escapeHtml(r.role)}</h3>
          ${editBtns({ edit: `data-edit-role="${r.id}"`, del: `data-del-role="${r.id}"` })}
        </div>
        <p>${escapeHtml(r.duty)}</p>
      </article>`
    )
    .join('')

  $('#panel').innerHTML = `
    <section class="panel-block">
      <div class="stage-head">
        <h2>核心原则</h2>
        <button type="button" class="mini-btn" data-edit-principle>改</button>
      </div>
      <p class="lead">${escapeHtml(overview.principle)}</p>
    </section>
    <section class="panel-block">
      <div class="stage-head">
        <h2>关键时间节点</h2>
        ${addBtn('data-add-stage', '阶段')}
      </div>
      <div class="stage-grid">${stages}</div>
    </section>
    <section class="panel-block">
      <div class="stage-head">
        <h2>备婚分工</h2>
        ${addBtn('data-add-role', '分工')}
      </div>
      <div class="role-grid">${roles}</div>
    </section>`
}

function renderTasks() {
  const { phases, daySchedule } = getContent()
  if (!state.phaseId || !phases.find((p) => p.id === state.phaseId)) {
    state.phaseId = phases[0]?.id || ''
  }
  const checks = getChecks()
  const chips = phases
    .map(
      (p) =>
        `<button class="chip ${!state.showDay && state.phaseId === p.id ? 'active' : ''}" data-phase="${p.id}">${escapeHtml(p.name)}</button>`
    )
    .join('')

  let body = ''
  if (state.showDay) {
    body = `
      <div class="toolbar-row">${addBtn('data-add-day', '流程项')}</div>
      <div class="day-list">
        ${daySchedule
          .map(
            (d) => `
          <article class="day-row reveal">
            <time>${escapeHtml(d.time)}</time>
            <div>
              <h3>${escapeHtml(d.item)}</h3>
              <p>负责人：${escapeHtml(d.owner)}</p>
              ${editBtns({ edit: `data-edit-day="${d.id}"`, del: `data-del-day="${d.id}"` })}
            </div>
          </article>`
          )
          .join('')}
      </div>`
  } else {
    const phase = phases.find((p) => p.id === state.phaseId) || phases[0]
    const allTasks = getAllTasks()
    const ids = allTasks.filter((t) => t.phaseId === phase.id).map((t) => t.id)
    const p = calcProgress(ids, checks)
    body = `
      <div class="phase-focus reveal">
        <div class="stage-head">
          <h3>${escapeHtml(phase.name)}</h3>
          <span class="pill">${p.done}/${p.total}</span>
        </div>
        <p>${escapeHtml(phase.focus)}</p>
        <div class="toolbar-row">
          <button type="button" class="mini-btn" data-edit-phase="${phase.id}">改阶段说明</button>
          ${addBtn(`data-add-month="${phase.id}"`, '月份')}
        </div>
        ${progressBar(p.percent)}
      </div>
      ${(phase.months || [])
        .map(
          (month) => `
        <section class="month-block">
          <div class="stage-head">
            <h3 class="month-label">${escapeHtml(month.label)}</h3>
            <span class="item-actions">
              <button type="button" class="mini-btn" data-edit-month="${phase.id}|${month.id}">改</button>
              <button type="button" class="mini-btn danger" data-del-month="${phase.id}|${month.id}">删</button>
              ${addBtn(`data-add-group="${phase.id}|${month.id}"`, '分组')}
            </span>
          </div>
          ${(month.groups || [])
            .map(
              (group) => `
            <article class="group-card reveal">
              <div class="stage-head">
                <h4>${escapeHtml(group.title)}</h4>
                <span class="item-actions">
                  <button type="button" class="mini-btn" data-edit-group="${phase.id}|${month.id}|${group.id}">改</button>
                  <button type="button" class="mini-btn danger" data-del-group="${phase.id}|${month.id}|${group.id}">删</button>
                  ${addBtn(`data-add-task="${phase.id}|${month.id}|${group.id}"`, '任务')}
                </span>
              </div>
              <ul class="check-list">
                ${(group.tasks || [])
                  .map((task) => {
                    const done = !!checks[task.id]
                    return `
                      <li>
                        <button class="check ${done ? 'done' : ''}" data-check="${task.id}" aria-pressed="${done}">
                          <span class="box">${done ? '✓' : ''}</span>
                          <span class="text">${escapeHtml(task.text)}</span>
                        </button>
                        ${editBtns({
                          edit: `data-edit-task="${phase.id}|${month.id}|${group.id}|${task.id}"`,
                          del: `data-del-task="${phase.id}|${month.id}|${group.id}|${task.id}"`
                        })}
                      </li>`
                  })
                  .join('')}
              </ul>
            </article>`
            )
            .join('')}
        </section>`
        )
        .join('')}`
  }

  $('#panel').innerHTML = `
    <section class="panel-block">
      <div class="chip-row">
        ${chips}
        <button class="chip ${state.showDay ? 'active' : ''}" data-day="1">当天流程</button>
        ${addBtn('data-add-phase', '阶段')}
      </div>
      ${body}
    </section>`
}

function renderShop() {
  const { shopCategories } = getContent()
  if (!state.shopCat || !shopCategories.find((c) => c.id === state.shopCat)) {
    state.shopCat = shopCategories[0]?.id || ''
  }
  const checks = getShopChecks()
  const allIds = []
  shopCategories.forEach((cat) => {
    cat.items.forEach((it) => allIds.push(it.id))
  })
  const progress = calcProgress(allIds, checks)
  const current = shopCategories.find((c) => c.id === state.shopCat) || shopCategories[0]

  $('#panel').innerHTML = `
    <section class="panel-block">
      <div class="stage-head">
        <h2>采购进度</h2>
        <span class="pill">${progress.done}/${progress.total}</span>
      </div>
      ${progressBar(progress.percent)}
      <div class="chip-row" style="margin-top:1.25rem">
        ${shopCategories
          .map(
            (c) =>
              `<button class="chip ${state.shopCat === c.id ? 'active' : ''}" data-shop="${c.id}">${escapeHtml(c.name)}</button>`
          )
          .join('')}
        ${addBtn('data-add-shop-cat', '分类')}
      </div>
      ${
        current
          ? `<article class="group-card reveal" style="margin-top:1.25rem">
        <div class="stage-head">
          <h4>${escapeHtml(current.name)}</h4>
          <span class="item-actions">
            <button type="button" class="mini-btn" data-edit-shop-cat="${current.id}">改分类</button>
            <button type="button" class="mini-btn danger" data-del-shop-cat="${current.id}">删分类</button>
            ${addBtn(`data-add-shop-item="${current.id}"`, '物品')}
          </span>
        </div>
        <ul class="check-list shop-list">
          ${current.items
            .map((item) => {
              const done = !!checks[item.id]
              return `
                <li>
                  <button class="check ${done ? 'done' : ''}" data-shop-check="${item.id}" aria-pressed="${done}">
                    <span class="box">${done ? '✓' : ''}</span>
                    <span class="shop-body">
                      <span class="shop-top">
                        <span class="text">${escapeHtml(item.name)}</span>
                        <span class="qty">${escapeHtml(item.qty)}</span>
                      </span>
                      <span class="shop-meta">
                        <span class="pill soft">${escapeHtml(item.cat)}</span>
                        ${item.note ? `<span class="note">${escapeHtml(item.note)}</span>` : ''}
                      </span>
                    </span>
                  </button>
                  ${editBtns({
                    edit: `data-edit-shop-item="${current.id}|${item.id}"`,
                    del: `data-del-shop-item="${current.id}|${item.id}"`
                  })}
                </li>`
            })
            .join('')}
        </ul>
      </article>`
          : ''
      }
    </section>`
}

function renderBudget() {
  const { budget } = getContent()
  $('#panel').innerHTML = `
    <section class="panel-block">
      <div class="budget-hero reveal">
        <div class="stage-head">
          <p class="eyebrow">参考总预算 · ${escapeHtml(budget.region)} ${budget.tables} 桌</p>
          <button type="button" class="mini-btn" data-edit-budget-meta>改总览</button>
        </div>
        <h2>¥${Number(budget.total).toLocaleString('zh-CN')}</h2>
        <p>${escapeHtml(budget.baseNote)}</p>
      </div>
      <div class="stage-head">
        <h3 class="subhead" style="margin:0">预算分配</h3>
        ${addBtn('data-add-alloc', '支出项')}
      </div>
      <div class="budget-list">
        ${budget.allocations
          .map(
            (a) => `
          <article class="budget-item reveal">
            <div class="stage-head">
              <h4>${escapeHtml(a.name)}</h4>
              <span class="pill">${escapeHtml(a.ratio)}</span>
            </div>
            <div class="amount">¥${escapeHtml(a.amount)}</div>
            <p>${escapeHtml(a.tip)}</p>
            ${editBtns({ edit: `data-edit-alloc="${a.id}"`, del: `data-del-alloc="${a.id}"` })}
          </article>`
          )
          .join('')}
      </div>
      <div class="stage-head">
        <h3 class="subhead" style="margin:0">省钱技巧</h3>
        ${addBtn('data-add-savetip', '技巧')}
      </div>
      <ul class="plain-list">
        ${budget.saveTips
          .map(
            (t) => `<li class="reveal">
            <div class="stage-head"><span>${escapeHtml(t.text)}</span>
            ${editBtns({ edit: `data-edit-savetip="${t.id}"`, del: `data-del-savetip="${t.id}"` })}
            </div></li>`
          )
          .join('')}
      </ul>
      <div class="stage-head">
        <h3 class="subhead" style="margin:0">隐性费用</h3>
        ${addBtn('data-add-hidden', '费用项')}
      </div>
      <ul class="plain-list warn">
        ${budget.hiddenFees
          .map(
            (t) => `<li class="reveal">
            <div class="stage-head"><span>${escapeHtml(t.text)}</span>
            ${editBtns({ edit: `data-edit-hidden="${t.id}"`, del: `data-del-hidden="${t.id}"` })}
            </div></li>`
          )
          .join('')}
      </ul>
    </section>`
}

function renderTips() {
  const { tips } = getContent()
  const tabs = [
    { key: 'body', label: '身体状态' },
    { key: 'contract', label: '合同注意' },
    { key: 'emergencies', label: '应急方案' },
    { key: 'dayRules', label: '当天原则' }
  ]
  const current = tabs[state.tipTab] || tabs[0]
  let body = ''
  if (current.key === 'emergencies') {
    body = `
      ${addBtn('data-add-emer', '应急项')}
      ${tips.emergencies
        .map(
          (e) => `
        <article class="tip-card emer reveal">
          <div class="stage-head">
            <h4>${escapeHtml(e.case)}</h4>
            ${editBtns({ edit: `data-edit-emer="${e.id}"`, del: `data-del-emer="${e.id}"` })}
          </div>
          <p>${escapeHtml(e.plan)}</p>
        </article>`
        )
        .join('')}`
  } else {
    const list = tips[current.key] || []
    body = `
      ${addBtn(`data-add-tip="${current.key}"`, '条目')}
      ${list
        .map(
          (t) => `<article class="tip-card reveal">
          <div class="stage-head">
            <span>${escapeHtml(t.text)}</span>
            ${editBtns({
              edit: `data-edit-tip="${current.key}|${t.id}"`,
              del: `data-del-tip="${current.key}|${t.id}"`
            })}
          </div>
        </article>`
        )
        .join('')}`
  }

  $('#panel').innerHTML = `
    <section class="panel-block">
      <div class="chip-row">
        ${tabs
          .map(
            (t, i) =>
              `<button class="chip ${state.tipTab === i ? 'active' : ''}" data-tip="${i}">${t.label}</button>`
          )
          .join('')}
      </div>
      <div class="tip-stack">${body}</div>
    </section>`
}

function renderWeight() {
  const data = getWeightData()
  const content = getContent()
  const exerciseTypes = content.exerciseTypes || []
  const { id, name, profile } = getActiveProfile(data)
  const today = todayKey()
  const todayEntry = profile.entries?.[today] || {
    weight: '',
    exercise: false,
    exerciseType: '',
    note: ''
  }
  const stats = summarize(profile)
  const logs = sortedLogs(profile).slice(0, 21)
  const deltaText =
    stats.deltaFromStart == null
      ? '—'
      : stats.deltaFromStart > 0
        ? `+${stats.deltaFromStart}`
        : `${stats.deltaFromStart}`

  $('#panel').innerHTML = `
    <section class="panel-block weight-panel">
      <div class="stage-head">
        <h2>减重打卡计划</h2>
        <span class="pill">备婚身材管理</span>
      </div>
      <p class="lead">记录每日体重与运动，曲线会自动更新。小董、小赵可分开打卡，双方手机约 3 秒同步一次。所有清单也可随时增改。</p>

      <div class="chip-row">
        ${PEOPLE.map(
          (p) =>
            `<button class="chip ${id === p.id ? 'active' : ''}" data-weight-person="${p.id}">${p.name}</button>`
        ).join('')}
      </div>

      <div class="weight-stats reveal">
        <article><span>今日/最新</span><strong>${stats.latest ? stats.latest.weight.toFixed(1) : '—'}<small>kg</small></strong></article>
        <article><span>较起始</span><strong class="${stats.deltaFromStart != null && stats.deltaFromStart <= 0 ? 'down' : ''}">${deltaText}<small>kg</small></strong></article>
        <article><span>距目标</span><strong>${stats.toGoal == null ? '—' : stats.toGoal.toFixed(1)}<small>kg</small></strong></article>
        <article><span>运动连续</span><strong>${stats.streak}<small>天</small></strong></article>
      </div>

      <div class="weight-goals reveal">
        <label><span>起始体重 (kg)</span><input id="weight-start" type="number" inputmode="decimal" step="0.1" min="30" max="200" value="${profile.startWeight ?? ''}" placeholder="例如 60" /></label>
        <label><span>目标体重 (kg)</span><input id="weight-goal" type="number" inputmode="decimal" step="0.1" min="30" max="200" value="${profile.goalWeight ?? ''}" placeholder="例如 55" /></label>
        <button class="btn primary" type="button" id="weight-goal-save">更新目标</button>
      </div>

      <article class="group-card reveal weight-today">
        <h4>今日打卡 · ${today} · ${name}</h4>
        <div class="weight-form">
          <label><span>今日体重 (kg)</span><input id="today-weight" type="number" inputmode="decimal" step="0.1" min="30" max="200" value="${todayEntry.weight ?? ''}" placeholder="起床空腹更准" /></label>
          <label class="exercise-toggle"><input id="today-exercise" type="checkbox" ${todayEntry.exercise ? 'checked' : ''} /><span>今天已运动</span></label>
          <div class="chip-row exercise-types">
            ${exerciseTypes
              .map(
                (t) =>
                  `<button type="button" class="chip ${todayEntry.exerciseType === t ? 'active' : ''}" data-ex-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`
              )
              .join('')}
            ${addBtn('data-add-ex-type', '运动类型')}
          </div>
          <label><span>备注（可选）</span><input id="today-note" type="text" maxlength="40" value="${escapeHtml(todayEntry.note || '')}" placeholder="如：慢跑 30 分钟" /></label>
          <button class="btn primary" type="button" id="weight-checkin">保存今日打卡</button>
        </div>
      </article>

      <article class="group-card reveal">
        <div class="stage-head">
          <h4>${name}的体重曲线</h4>
          <span class="pill soft">共 ${stats.points.length} 次记录</span>
        </div>
        <div class="chart-wrap">${buildWeightChart(stats.points, profile.goalWeight)}</div>
      </article>

      <article class="group-card reveal">
        <h4>最近记录</h4>
        ${
          logs.length
            ? `<ul class="weight-log">${logs
                .map(
                  (l) => `<li>
                  <div>
                    <strong>${l.date}</strong>
                    <span>${l.weight != null ? `${Number(l.weight).toFixed(1)} kg` : '未记体重'}${l.exercise ? ` · ${escapeHtml(l.exerciseType || '已运动')}` : ' · 未运动'}${l.note ? ` · ${escapeHtml(l.note)}` : ''}</span>
                  </div>
                  <button type="button" class="link-btn" data-del-weight="${l.date}">删除</button>
                </li>`
                )
                .join('')}</ul>`
            : `<p class="muted">还没有打卡记录</p>`
        }
      </article>
    </section>`
}

function renderPanel() {
  const map = {
    overview: renderOverview,
    tasks: renderTasks,
    shop: renderShop,
    budget: renderBudget,
    tips: renderTips,
    weight: renderWeight
  }
  map[state.view]()
  observeReveal()
  renderHero()
}

function observeReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('in')
      })
    },
    { threshold: 0.12 }
  )
  $all('.reveal').forEach((el) => io.observe(el))
}

function setView(view) {
  state.view = view
  $all('.nav-btn, .tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view)
  })
  renderPanel()
  $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let cachedPublicUrl = ''

async function loadShareConfig() {
  try {
    const res = await fetch('./share-config.json', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    if (data.publicUrl) cachedPublicUrl = String(data.publicUrl)
  } catch {
    /* ignore */
  }
}

function shareUrl() {
  const stored = localStorage.getItem('wedding_public_url')
  if (stored) return stored
  if (cachedPublicUrl) return cachedPublicUrl
  const { protocol, hostname, port } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//192.168.10.161${port ? `:${port}` : ''}/`
  }
  return window.location.href.split('#')[0]
}

function openShareSheet() {
  const url = shareUrl()
  $('#share-url').textContent = url
  $('#share-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`
  const isPublic = Boolean(localStorage.getItem('wedding_public_url') || cachedPublicUrl)
  $('#share-tip').textContent = isPublic
    ? '公网链接可直接发给手机打开（电脑需保持网页服务与隧道运行）。'
    : '当前为局域网链接：手机需与电脑同一 Wi‑Fi。'
  $('#share-sheet').hidden = false
  $('#share-backdrop').hidden = false
}

function closeShareSheet() {
  $('#share-sheet').hidden = true
  $('#share-backdrop').hidden = true
}

async function copyShareLink() {
  const url = shareUrl()
  try {
    await navigator.clipboard.writeText(url)
    $('#copy-link').textContent = '已复制'
    setTimeout(() => {
      $('#copy-link').textContent = '复制链接'
    }, 1600)
  } catch {
    window.prompt('复制链接：', url)
  }
}

async function nativeShare() {
  const url = shareUrl()
  if (navigator.share) {
    try {
      await navigator.share({
        title: '小董和小赵的备婚计划',
        text: '小董和小赵的备婚计划，一起勾选推进。',
        url
      })
      return
    } catch {
      /* cancelled */
    }
  }
  await copyShareLink()
}

let toastTimer = null
function showToast(message) {
  const el = $('#toast')
  el.textContent = message
  el.hidden = false
  requestAnimationFrame(() => el.classList.add('show'))
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => {
      el.hidden = true
    }, 220)
  }, 1600)
}

function formatSavedAt(ts) {
  if (!ts) return '尚未保存'
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function updateSyncUI() {
  const el = $('#sync-status')
  if (!el) return
  const { online, syncing, cloudMode, cloudError } = getSyncState()
  el.classList.remove('off', 'busy', 'warn')
  el.title = cloudError || ''
  const needCloudSetup = Boolean(
    cloudError && !cloudMode && /schema\.sql|云端表未创建/i.test(cloudError)
  )
  if (syncing) {
    el.textContent = '同步中'
    el.classList.add('busy')
  } else if (online && cloudMode) {
    el.textContent = '云端已同步'
  } else if (online) {
    el.textContent = needCloudSetup ? '仅本机同步' : '双方已同步'
    if (needCloudSetup) el.classList.add('warn')
  } else if (needCloudSetup) {
    el.textContent = '待建云端表'
    el.classList.add('warn')
  } else {
    el.textContent = '离线本地'
    el.classList.add('off')
  }
  const banner = $('#cloud-setup-banner')
  if (banner) {
    banner.hidden = !needCloudSetup
    if (needCloudSetup) {
      banner.querySelector('[data-cloud-err]')?.replaceChildren(
        document.createTextNode(cloudError)
      )
    }
  }
}

function updateSaveUI(event = {}) {
  const status = $('#save-status')
  const btn = $('#save-btn')
  status.classList.remove('dirty', 'saving', 'saved')

  if (event.type === 'content') {
    renderPanel()
    return
  }
  if (event.type === 'syncing' || event.type === 'sync-state') {
    updateSyncUI()
    if (event.type === 'sync-state') return
  }
  if (event.type === 'remote') {
    updateSyncUI()
    renderPanel()
    showToast('已同步对方最新数据')
    return
  }
  if (event.type === 'person') {
    renderPanel()
    return
  }
  if (event.type === 'saving') {
    status.textContent = '自动保存中…'
    status.classList.add('saving')
    btn.disabled = false
    return
  }
  if (event.type === 'saved') {
    updateSyncUI()
    if (event.reason === 'manual') {
      status.textContent = event.synced
        ? `已保存并同步 ${formatSavedAt(event.savedAt)}`
        : `已保存(待同步) ${formatSavedAt(event.savedAt)}`
      status.classList.add('saved')
      btn.disabled = true
      showToast(event.synced ? '保存成功，双方可见' : '已保存到本机，同步失败')
      return
    }
    status.textContent = event.synced
      ? `已自动同步 ${formatSavedAt(event.savedAt)}`
      : `已自动保存 ${formatSavedAt(event.savedAt)}`
    status.classList.add(event.sessionUnsaved ? 'dirty' : 'saved')
    btn.disabled = !event.sessionUnsaved
    if (event.reason === 'auto') showToast(event.synced ? '已同步到双方手机' : '已自动保存到本机')
    return
  }
  if (event.type === 'dirty' || needsLeaveConfirm()) {
    status.textContent = '有更改待保存'
    status.classList.add('dirty')
    btn.disabled = false
    return
  }
  const last = getLastSavedAt()
  status.textContent = last ? `已保存 ${formatSavedAt(last)}` : '勾选后将自动保存'
  if (last) status.classList.add('saved')
  btn.disabled = true
}

function handleManualSave() {
  if (!isDirty() && !needsLeaveConfirm()) {
    showToast('当前没有需要保存的更改')
    return
  }
  saveNow('manual')
}

function bindSaveGuards() {
  subscribe((event) => updateSaveUI(event))
  updateSaveUI()
  updateSyncUI()
  $('#save-btn').addEventListener('click', handleManualSave)
  window.addEventListener('beforeunload', (e) => {
    if (!needsLeaveConfirm()) return
    e.preventDefault()
    e.returnValue = '你有更改尚未点「保存」，确定离开吗？'
    return e.returnValue
  })
  window.addEventListener('pagehide', () => flushBeforeLeave())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeforeLeave()
  })
}

function findPhase(content, phaseId) {
  return content.phases.find((p) => p.id === phaseId)
}
function findMonth(phase, monthId) {
  return phase?.months?.find((m) => m.id === monthId)
}
function findGroup(month, groupId) {
  return month?.groups?.find((g) => g.id === groupId)
}

function handleContentEdits(e) {
  const t = e.target.closest('[data-edit-principle],[data-edit-stage],[data-del-stage],[data-add-stage],[data-edit-role],[data-del-role],[data-add-role],[data-edit-phase],[data-add-phase],[data-edit-month],[data-del-month],[data-add-month],[data-edit-group],[data-del-group],[data-add-group],[data-edit-task],[data-del-task],[data-add-task],[data-edit-day],[data-del-day],[data-add-day],[data-edit-shop-cat],[data-del-shop-cat],[data-add-shop-cat],[data-edit-shop-item],[data-del-shop-item],[data-add-shop-item],[data-edit-budget-meta],[data-edit-alloc],[data-del-alloc],[data-add-alloc],[data-edit-savetip],[data-del-savetip],[data-add-savetip],[data-edit-hidden],[data-del-hidden],[data-add-hidden],[data-edit-tip],[data-del-tip],[data-add-tip],[data-edit-emer],[data-del-emer],[data-add-emer],[data-add-ex-type]')
  if (!t) return false

  if (t.dataset.editPrinciple != null) {
    const { overview } = getContent()
    openEditModal({
      title: '编辑核心原则',
      fields: [{ key: 'principle', label: '原则说明', type: 'textarea', value: overview.principle, rows: 4 }],
      onSave: (v) =>
        updateContent((c) => {
          c.overview.principle = v.principle.trim()
          return c
        })
    })
    return true
  }

  if (t.dataset.addStage != null) {
    openEditModal({
      title: '添加阶段',
      fields: [
        { key: 'name', label: '阶段名称', value: '' },
        { key: 'time', label: '时间', value: '' },
        { key: 'goal', label: '目标', type: 'textarea', value: '' }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const id = uid('s')
          c.overview.stages.push({ id, name: v.name, time: v.time, goal: v.goal })
          return c
        })
    })
    return true
  }

  if (t.dataset.editStage) {
    const stage = getContent().overview.stages.find((s) => s.id === t.dataset.editStage)
    if (!stage) return true
    openEditModal({
      title: '编辑阶段',
      fields: [
        { key: 'name', label: '阶段名称', value: stage.name },
        { key: 'time', label: '时间', value: stage.time },
        { key: 'goal', label: '目标', type: 'textarea', value: stage.goal }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const s = c.overview.stages.find((x) => x.id === stage.id)
          if (s) Object.assign(s, { name: v.name, time: v.time, goal: v.goal })
          return c
        })
    })
    return true
  }

  if (t.dataset.delStage && confirmDelete('删除该时间节点？')) {
    updateContent((c) => {
      c.overview.stages = c.overview.stages.filter((s) => s.id !== t.dataset.delStage)
      return c
    })
    return true
  }

  if (t.dataset.addRole != null) {
    openEditModal({
      title: '添加分工',
      fields: [
        { key: 'role', label: '角色', value: '' },
        { key: 'duty', label: '职责', type: 'textarea', value: '' }
      ],
      onSave: (v) =>
        updateContent((c) => {
          c.overview.roles.push({ id: uid('role'), role: v.role, duty: v.duty })
          return c
        })
    })
    return true
  }

  if (t.dataset.editRole) {
    const role = getContent().overview.roles.find((r) => r.id === t.dataset.editRole)
    if (!role) return true
    openEditModal({
      title: '编辑分工',
      fields: [
        { key: 'role', label: '角色', value: role.role },
        { key: 'duty', label: '职责', type: 'textarea', value: role.duty }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const r = c.overview.roles.find((x) => x.id === role.id)
          if (r) Object.assign(r, { role: v.role, duty: v.duty })
          return c
        })
    })
    return true
  }

  if (t.dataset.delRole && confirmDelete('删除该分工？')) {
    updateContent((c) => {
      c.overview.roles = c.overview.roles.filter((r) => r.id !== t.dataset.delRole)
      return c
    })
    return true
  }

  if (t.dataset.addPhase != null) {
    openEditModal({
      title: '添加任务阶段',
      fields: [
        { key: 'name', label: '名称', value: '' },
        { key: 'range', label: '时间范围', value: '' },
        { key: 'focus', label: '重点说明', type: 'textarea', value: '' }
      ],
      onSave: (v) => {
        const id = uid('p')
        updateContent((c) => {
          c.phases.push({ id, name: v.name, range: v.range, focus: v.focus, months: [] })
          return c
        })
        state.phaseId = id
        state.showDay = false
      }
    })
    return true
  }

  if (t.dataset.editPhase) {
    const phase = findPhase(getContent(), t.dataset.editPhase)
    if (!phase) return true
    openEditModal({
      title: '编辑阶段说明',
      fields: [
        { key: 'name', label: '名称', value: phase.name },
        { key: 'range', label: '时间范围', value: phase.range },
        { key: 'focus', label: '重点说明', type: 'textarea', value: phase.focus }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const p = findPhase(c, phase.id)
          if (p) Object.assign(p, { name: v.name, range: v.range, focus: v.focus })
          return c
        })
    })
    return true
  }

  if (t.dataset.addMonth) {
    openEditModal({
      title: '添加月份',
      fields: [{ key: 'label', label: '月份名称', value: '例如 2026年8月' }],
      onSave: (v) =>
        updateContent((c) => {
          const p = findPhase(c, t.dataset.addMonth)
          if (p) p.months.push({ id: uid('m'), label: v.label, groups: [] })
          return c
        })
    })
    return true
  }

  if (t.dataset.editMonth) {
    const [phaseId, monthId] = t.dataset.editMonth.split('|')
    const month = findMonth(findPhase(getContent(), phaseId), monthId)
    if (!month) return true
    openEditModal({
      title: '编辑月份',
      fields: [{ key: 'label', label: '月份名称', value: month.label }],
      onSave: (v) =>
        updateContent((c) => {
          const m = findMonth(findPhase(c, phaseId), monthId)
          if (m) m.label = v.label
          return c
        })
    })
    return true
  }

  if (t.dataset.delMonth) {
    const [phaseId, monthId] = t.dataset.delMonth.split('|')
    if (!confirmDelete('删除该月份及其中任务？')) return true
    updateContent((c) => {
      const p = findPhase(c, phaseId)
      if (p) p.months = p.months.filter((m) => m.id !== monthId)
      return c
    })
    return true
  }

  if (t.dataset.addGroup) {
    const [phaseId, monthId] = t.dataset.addGroup.split('|')
    openEditModal({
      title: '添加分组',
      fields: [{ key: 'title', label: '分组标题', value: '' }],
      onSave: (v) =>
        updateContent((c) => {
          const m = findMonth(findPhase(c, phaseId), monthId)
          if (m) m.groups.push({ id: uid('g'), title: v.title, tasks: [] })
          return c
        })
    })
    return true
  }

  if (t.dataset.editGroup) {
    const [phaseId, monthId, groupId] = t.dataset.editGroup.split('|')
    const group = findGroup(findMonth(findPhase(getContent(), phaseId), monthId), groupId)
    if (!group) return true
    openEditModal({
      title: '编辑分组',
      fields: [{ key: 'title', label: '分组标题', value: group.title }],
      onSave: (v) =>
        updateContent((c) => {
          const g = findGroup(findMonth(findPhase(c, phaseId), monthId), groupId)
          if (g) g.title = v.title
          return c
        })
    })
    return true
  }

  if (t.dataset.delGroup) {
    const [phaseId, monthId, groupId] = t.dataset.delGroup.split('|')
    if (!confirmDelete('删除该分组及任务？')) return true
    updateContent((c) => {
      const m = findMonth(findPhase(c, phaseId), monthId)
      if (m) m.groups = m.groups.filter((g) => g.id !== groupId)
      return c
    })
    return true
  }

  if (t.dataset.addTask) {
    const [phaseId, monthId, groupId] = t.dataset.addTask.split('|')
    openEditModal({
      title: '添加任务',
      fields: [{ key: 'text', label: '任务内容', type: 'textarea', value: '' }],
      onSave: (v) =>
        updateContent((c) => {
          const g = findGroup(findMonth(findPhase(c, phaseId), monthId), groupId)
          if (g) g.tasks.push({ id: uid('task'), text: v.text.trim() })
          return c
        })
    })
    return true
  }

  if (t.dataset.editTask) {
    const [phaseId, monthId, groupId, taskId] = t.dataset.editTask.split('|')
    const task = findGroup(findMonth(findPhase(getContent(), phaseId), monthId), groupId)?.tasks?.find(
      (x) => x.id === taskId
    )
    if (!task) return true
    openEditModal({
      title: '编辑任务',
      fields: [{ key: 'text', label: '任务内容', type: 'textarea', value: task.text }],
      onSave: (v) =>
        updateContent((c) => {
          const x = findGroup(findMonth(findPhase(c, phaseId), monthId), groupId)?.tasks?.find(
            (tt) => tt.id === taskId
          )
          if (x) x.text = v.text.trim()
          return c
        })
    })
    return true
  }

  if (t.dataset.delTask) {
    const [phaseId, monthId, groupId, taskId] = t.dataset.delTask.split('|')
    if (!confirmDelete('删除该任务？')) return true
    updateContent((c) => {
      const g = findGroup(findMonth(findPhase(c, phaseId), monthId), groupId)
      if (g) g.tasks = g.tasks.filter((x) => x.id !== taskId)
      return c
    })
    return true
  }

  if (t.dataset.addDay != null) {
    openEditModal({
      title: '添加当天流程',
      fields: [
        { key: 'time', label: '时间', value: '' },
        { key: 'item', label: '事项', type: 'textarea', value: '' },
        { key: 'owner', label: '负责人', value: '' }
      ],
      onSave: (v) =>
        updateContent((c) => {
          c.daySchedule.push({ id: uid('day'), time: v.time, item: v.item, owner: v.owner })
          return c
        })
    })
    return true
  }

  if (t.dataset.editDay) {
    const day = getContent().daySchedule.find((d) => d.id === t.dataset.editDay)
    if (!day) return true
    openEditModal({
      title: '编辑流程',
      fields: [
        { key: 'time', label: '时间', value: day.time },
        { key: 'item', label: '事项', type: 'textarea', value: day.item },
        { key: 'owner', label: '负责人', value: day.owner }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const d = c.daySchedule.find((x) => x.id === day.id)
          if (d) Object.assign(d, { time: v.time, item: v.item, owner: v.owner })
          return c
        })
    })
    return true
  }

  if (t.dataset.delDay && confirmDelete('删除该流程项？')) {
    updateContent((c) => {
      c.daySchedule = c.daySchedule.filter((d) => d.id !== t.dataset.delDay)
      return c
    })
    return true
  }

  if (t.dataset.addShopCat != null) {
    openEditModal({
      title: '添加采购分类',
      fields: [{ key: 'name', label: '分类名称', value: '' }],
      onSave: (v) => {
        const id = uid('shopcat')
        updateContent((c) => {
          c.shopCategories.push({ id, name: v.name, items: [] })
          return c
        })
        state.shopCat = id
      }
    })
    return true
  }

  if (t.dataset.editShopCat) {
    const cat = getContent().shopCategories.find((c) => c.id === t.dataset.editShopCat)
    if (!cat) return true
    openEditModal({
      title: '编辑分类',
      fields: [{ key: 'name', label: '分类名称', value: cat.name }],
      onSave: (v) =>
        updateContent((c) => {
          const x = c.shopCategories.find((s) => s.id === cat.id)
          if (x) x.name = v.name
          return c
        })
    })
    return true
  }

  if (t.dataset.delShopCat && confirmDelete('删除该分类及全部物品？')) {
    updateContent((c) => {
      c.shopCategories = c.shopCategories.filter((s) => s.id !== t.dataset.delShopCat)
      return c
    })
    return true
  }

  if (t.dataset.addShopItem) {
    openEditModal({
      title: '添加采购物品',
      fields: [
        { key: 'name', label: '物品名称', value: '' },
        { key: 'cat', label: '小类', value: '' },
        { key: 'qty', label: '数量', value: '' },
        { key: 'note', label: '备注', value: '' }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const cat = c.shopCategories.find((s) => s.id === t.dataset.addShopItem)
          if (cat) {
            cat.items.push({
              id: uid('shop'),
              name: v.name,
              cat: v.cat,
              qty: v.qty,
              note: v.note
            })
          }
          return c
        })
    })
    return true
  }

  if (t.dataset.editShopItem) {
    const [catId, itemId] = t.dataset.editShopItem.split('|')
    const item = getContent().shopCategories.find((c) => c.id === catId)?.items?.find((i) => i.id === itemId)
    if (!item) return true
    openEditModal({
      title: '编辑物品',
      fields: [
        { key: 'name', label: '物品名称', value: item.name },
        { key: 'cat', label: '小类', value: item.cat },
        { key: 'qty', label: '数量', value: item.qty },
        { key: 'note', label: '备注', value: item.note }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const it = c.shopCategories.find((s) => s.id === catId)?.items?.find((i) => i.id === itemId)
          if (it) Object.assign(it, { name: v.name, cat: v.cat, qty: v.qty, note: v.note })
          return c
        })
    })
    return true
  }

  if (t.dataset.delShopItem) {
    const [catId, itemId] = t.dataset.delShopItem.split('|')
    if (!confirmDelete('删除该物品？')) return true
    updateContent((c) => {
      const cat = c.shopCategories.find((s) => s.id === catId)
      if (cat) cat.items = cat.items.filter((i) => i.id !== itemId)
      return c
    })
    return true
  }

  if (t.dataset.editBudgetMeta != null) {
    const b = getContent().budget
    openEditModal({
      title: '编辑预算总览',
      fields: [
        { key: 'region', label: '地区', value: b.region },
        { key: 'tables', label: '桌数', type: 'number', value: b.tables },
        { key: 'total', label: '总预算(元)', type: 'number', value: b.total },
        { key: 'baseNote', label: '说明', type: 'textarea', value: b.baseNote }
      ],
      onSave: (v) =>
        updateContent((c) => {
          c.budget.region = v.region
          c.budget.tables = Number(v.tables) || 0
          c.budget.total = Number(v.total) || 0
          c.budget.baseNote = v.baseNote
          return c
        })
    })
    return true
  }

  if (t.dataset.addAlloc != null) {
    openEditModal({
      title: '添加预算项',
      fields: [
        { key: 'name', label: '名称', value: '' },
        { key: 'ratio', label: '占比', value: '' },
        { key: 'amount', label: '金额区间', value: '' },
        { key: 'tip', label: '说明', value: '' }
      ],
      onSave: (v) =>
        updateContent((c) => {
          c.budget.allocations.push({ id: uid('alloc'), ...v })
          return c
        })
    })
    return true
  }

  if (t.dataset.editAlloc) {
    const a = getContent().budget.allocations.find((x) => x.id === t.dataset.editAlloc)
    if (!a) return true
    openEditModal({
      title: '编辑预算项',
      fields: [
        { key: 'name', label: '名称', value: a.name },
        { key: 'ratio', label: '占比', value: a.ratio },
        { key: 'amount', label: '金额区间', value: a.amount },
        { key: 'tip', label: '说明', value: a.tip }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const x = c.budget.allocations.find((i) => i.id === a.id)
          if (x) Object.assign(x, v)
          return c
        })
    })
    return true
  }

  if (t.dataset.delAlloc && confirmDelete('删除该预算项？')) {
    updateContent((c) => {
      c.budget.allocations = c.budget.allocations.filter((a) => a.id !== t.dataset.delAlloc)
      return c
    })
    return true
  }

  const tipListEdit = (kind, idAttr, addAttr) => {
    if (t.dataset[addAttr] != null || t.getAttribute(`data-${addAttr.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`) != null) {
      /* handled below */
    }
  }
  void tipListEdit

  if (t.dataset.addSavetip != null) {
    openEditModal({
      title: '添加省钱技巧',
      fields: [{ key: 'text', label: '内容', type: 'textarea', value: '' }],
      onSave: (v) =>
        updateContent((c) => {
          c.budget.saveTips.push({ id: uid('st'), text: v.text })
          return c
        })
    })
    return true
  }
  if (t.dataset.editSavetip) {
    const item = getContent().budget.saveTips.find((x) => x.id === t.dataset.editSavetip)
    if (!item) return true
    openEditModal({
      title: '编辑省钱技巧',
      fields: [{ key: 'text', label: '内容', type: 'textarea', value: item.text }],
      onSave: (v) =>
        updateContent((c) => {
          const x = c.budget.saveTips.find((i) => i.id === item.id)
          if (x) x.text = v.text
          return c
        })
    })
    return true
  }
  if (t.dataset.delSavetip && confirmDelete()) {
    updateContent((c) => {
      c.budget.saveTips = c.budget.saveTips.filter((x) => x.id !== t.dataset.delSavetip)
      return c
    })
    return true
  }

  if (t.dataset.addHidden != null) {
    openEditModal({
      title: '添加隐性费用',
      fields: [{ key: 'text', label: '内容', type: 'textarea', value: '' }],
      onSave: (v) =>
        updateContent((c) => {
          c.budget.hiddenFees.push({ id: uid('hf'), text: v.text })
          return c
        })
    })
    return true
  }
  if (t.dataset.editHidden) {
    const item = getContent().budget.hiddenFees.find((x) => x.id === t.dataset.editHidden)
    if (!item) return true
    openEditModal({
      title: '编辑隐性费用',
      fields: [{ key: 'text', label: '内容', type: 'textarea', value: item.text }],
      onSave: (v) =>
        updateContent((c) => {
          const x = c.budget.hiddenFees.find((i) => i.id === item.id)
          if (x) x.text = v.text
          return c
        })
    })
    return true
  }
  if (t.dataset.delHidden && confirmDelete()) {
    updateContent((c) => {
      c.budget.hiddenFees = c.budget.hiddenFees.filter((x) => x.id !== t.dataset.delHidden)
      return c
    })
    return true
  }

  if (t.dataset.addTip) {
    const key = t.dataset.addTip
    openEditModal({
      title: '添加条目',
      fields: [{ key: 'text', label: '内容', type: 'textarea', value: '' }],
      onSave: (v) =>
        updateContent((c) => {
          c.tips[key].push({ id: uid('tip'), text: v.text })
          return c
        })
    })
    return true
  }
  if (t.dataset.editTip) {
    const [key, id] = t.dataset.editTip.split('|')
    const item = getContent().tips[key]?.find((x) => x.id === id)
    if (!item) return true
    openEditModal({
      title: '编辑条目',
      fields: [{ key: 'text', label: '内容', type: 'textarea', value: item.text }],
      onSave: (v) =>
        updateContent((c) => {
          const x = c.tips[key]?.find((i) => i.id === id)
          if (x) x.text = v.text
          return c
        })
    })
    return true
  }
  if (t.dataset.delTip) {
    const [key, id] = t.dataset.delTip.split('|')
    if (!confirmDelete()) return true
    updateContent((c) => {
      c.tips[key] = (c.tips[key] || []).filter((x) => x.id !== id)
      return c
    })
    return true
  }

  if (t.dataset.addEmer != null) {
    openEditModal({
      title: '添加应急方案',
      fields: [
        { key: 'case', label: '突发情况', value: '' },
        { key: 'plan', label: '应对方案', type: 'textarea', value: '' }
      ],
      onSave: (v) =>
        updateContent((c) => {
          c.tips.emergencies.push({ id: uid('em'), case: v.case, plan: v.plan })
          return c
        })
    })
    return true
  }
  if (t.dataset.editEmer) {
    const item = getContent().tips.emergencies.find((x) => x.id === t.dataset.editEmer)
    if (!item) return true
    openEditModal({
      title: '编辑应急方案',
      fields: [
        { key: 'case', label: '突发情况', value: item.case },
        { key: 'plan', label: '应对方案', type: 'textarea', value: item.plan }
      ],
      onSave: (v) =>
        updateContent((c) => {
          const x = c.tips.emergencies.find((i) => i.id === item.id)
          if (x) Object.assign(x, { case: v.case, plan: v.plan })
          return c
        })
    })
    return true
  }
  if (t.dataset.delEmer && confirmDelete()) {
    updateContent((c) => {
      c.tips.emergencies = c.tips.emergencies.filter((x) => x.id !== t.dataset.delEmer)
      return c
    })
    return true
  }

  if (t.dataset.addExType != null) {
    openEditModal({
      title: '添加运动类型',
      fields: [{ key: 'name', label: '类型名称', value: '' }],
      onSave: (v) =>
        updateContent((c) => {
          const name = v.name.trim()
          if (name && !c.exerciseTypes.includes(name)) c.exerciseTypes.push(name)
          return c
        })
    })
    return true
  }

  return true
}

function bindEvents() {
  $all('.nav-btn, .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view))
  })
  $('#cta-tasks').addEventListener('click', () => setView('tasks'))
  $('#cta-share').addEventListener('click', openShareSheet)
  $('#share-btn').addEventListener('click', openShareSheet)
  $('#share-backdrop').addEventListener('click', closeShareSheet)
  $('#copy-link').addEventListener('click', copyShareLink)
  $('#native-share').addEventListener('click', nativeShare)
  bindSaveGuards()
  initEditModal()

  $('#panel').addEventListener('click', (e) => {
    if (handleContentEdits(e)) return

    const phase = e.target.closest('[data-phase]')
    if (phase) {
      state.phaseId = phase.dataset.phase
      state.showDay = false
      renderPanel()
      return
    }
    const day = e.target.closest('[data-day]')
    if (day) {
      state.showDay = true
      renderPanel()
      return
    }
    const check = e.target.closest('[data-check]')
    if (check) {
      toggleCheck(check.dataset.check)
      renderPanel()
      return
    }
    const shop = e.target.closest('[data-shop]')
    if (shop) {
      state.shopCat = shop.dataset.shop
      renderPanel()
      return
    }
    const shopCheck = e.target.closest('[data-shop-check]')
    if (shopCheck) {
      toggleShop(shopCheck.dataset.shopCheck)
      renderPanel()
      return
    }
    const tip = e.target.closest('[data-tip]')
    if (tip) {
      state.tipTab = Number(tip.dataset.tip)
      renderPanel()
      return
    }
    const person = e.target.closest('[data-weight-person]')
    if (person) {
      setWeightPerson(person.dataset.weightPerson)
      renderPanel()
      return
    }
    const exType = e.target.closest('[data-ex-type]')
    if (exType) {
      const input = $('#today-exercise')
      if (input) input.checked = true
      $all('[data-ex-type]').forEach((btn) => btn.classList.remove('active'))
      exType.classList.add('active')
      return
    }
    if (e.target.id === 'weight-goal-save') {
      setWeightGoals({
        startWeight: $('#weight-start').value,
        goalWeight: $('#weight-goal').value
      })
      showToast('目标已更新')
      renderPanel()
      return
    }
    if (e.target.id === 'weight-checkin') {
      const activeType = document.querySelector('[data-ex-type].active')
      const exercised = $('#today-exercise').checked
      upsertWeightEntry(todayKey(), {
        weight: $('#today-weight').value,
        exercise: exercised,
        exerciseType: exercised ? activeType?.dataset.exType || '' : '',
        note: $('#today-note').value.trim()
      })
      showToast('今日打卡已记录')
      renderPanel()
      return
    }
    const del = e.target.closest('[data-del-weight]')
    if (del) {
      removeWeightEntry(del.dataset.delWeight)
      showToast('记录已删除')
      renderPanel()
    }
  })
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}

async function boot() {
  document.documentElement.style.setProperty('--days', `'${daysUntil(WEDDING_DATE)}'`)
  await loadShareConfig()
  bindEvents()
  await initSync()
  const content = getContent()
  state.phaseId = content.phases[0]?.id || 'p1'
  state.shopCat = content.shopCategories[0]?.id || ''
  renderPanel()
  updateSyncUI()
  registerSW()
  requestAnimationFrame(() => document.body.classList.add('ready'))
}

boot()
