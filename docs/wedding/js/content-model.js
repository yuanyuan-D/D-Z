import {
  overview,
  phases,
  daySchedule,
  shopCategories,
  budget,
  tips
} from './plan.js'
import { EXERCISE_TYPES } from './weight.js'

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function asTextItem(value, prefix, index) {
  if (value && typeof value === 'object' && value.id) {
    return { id: value.id, text: value.text ?? String(value) }
  }
  return { id: `${prefix}_${index}`, text: String(value ?? '') }
}

function normalizePhases(list) {
  return (list || []).map((phase, pi) => ({
    id: phase.id || `p${pi + 1}`,
    name: phase.name || `阶段${pi + 1}`,
    range: phase.range || '',
    focus: phase.focus || '',
    months: (phase.months || []).map((month, mi) => ({
      id: month.id || `m_${pi}_${mi}`,
      label: month.label || `月份${mi + 1}`,
      groups: (month.groups || []).map((group, gi) => ({
        id: group.id || `${month.id || `m_${pi}_${mi}`}_g${gi}`,
        title: group.title || '分组',
        tasks: (group.tasks || []).map((task, ti) => {
          if (typeof task === 'string') {
            return { id: `${month.id || `m_${pi}_${mi}`}-${gi}-${ti}`, text: task }
          }
          return {
            id: task.id || uid('task'),
            text: task.text || ''
          }
        })
      }))
    }))
  }))
}

export function normalizeContent(raw) {
  const base = createDefaultContent()
  if (!raw || typeof raw !== 'object') return base

  const overviewIn = raw.overview || {}
  const budgetIn = raw.budget || {}

  return {
    overview: {
      ...base.overview,
      ...overviewIn,
      stages: (overviewIn.stages || base.overview.stages).map((s, i) => ({
        id: s.id || `s${i + 1}`,
        time: s.time || '',
        name: s.name || '',
        goal: s.goal || ''
      })),
      roles: (overviewIn.roles || base.overview.roles).map((r, i) => ({
        id: r.id || `role_${i}`,
        role: r.role || '',
        duty: r.duty || ''
      }))
    },
    phases: normalizePhases(raw.phases || base.phases),
    daySchedule: (raw.daySchedule || base.daySchedule).map((d, i) => ({
      id: d.id || `day_${i}`,
      time: d.time || '',
      item: d.item || '',
      owner: d.owner || ''
    })),
    shopCategories: (raw.shopCategories || base.shopCategories).map((cat, ci) => ({
      id: cat.id || `shopcat_${ci}`,
      name: cat.name || '采购分类',
      items: (cat.items || []).map((it, ii) => ({
        id: it.id || `${cat.id || `shopcat_${ci}`}_${ii}`,
        cat: it.cat || '',
        name: it.name || '',
        qty: it.qty || '',
        note: it.note || ''
      }))
    })),
    budget: {
      region: budgetIn.region ?? base.budget.region,
      tables: budgetIn.tables ?? base.budget.tables,
      baseNote: budgetIn.baseNote ?? base.budget.baseNote,
      total: Number(budgetIn.total ?? base.budget.total) || 0,
      allocations: (budgetIn.allocations || base.budget.allocations).map((a, i) => ({
        id: a.id || `alloc_${i}`,
        name: a.name || '',
        ratio: a.ratio || '',
        amount: a.amount || '',
        tip: a.tip || ''
      })),
      saveTips: (budgetIn.saveTips || base.budget.saveTips).map((t, i) => asTextItem(t, 'st', i)),
      hiddenFees: (budgetIn.hiddenFees || base.budget.hiddenFees).map((t, i) => asTextItem(t, 'hf', i))
    },
    tips: {
      body: (raw.tips?.body || base.tips.body).map((t, i) => asTextItem(t, 'tb', i)),
      contract: (raw.tips?.contract || base.tips.contract).map((t, i) => asTextItem(t, 'tc', i)),
      emergencies: (raw.tips?.emergencies || base.tips.emergencies).map((e, i) => ({
        id: e.id || `em_${i}`,
        case: e.case || '',
        plan: e.plan || ''
      })),
      dayRules: (raw.tips?.dayRules || base.tips.dayRules).map((t, i) => asTextItem(t, 'td', i))
    },
    exerciseTypes: Array.isArray(raw.exerciseTypes) && raw.exerciseTypes.length
      ? raw.exerciseTypes.map(String)
      : clone(EXERCISE_TYPES)
  }
}

export function createDefaultContent() {
  const o = clone(overview)
  o.stages = o.stages.map((s, i) => ({ ...s, id: s.id || `s${i + 1}` }))
  o.roles = o.roles.map((r, i) => ({ ...r, id: `role_${i}` }))

  const b = clone(budget)
  b.allocations = b.allocations.map((a, i) => ({ ...a, id: `alloc_${i}` }))
  b.saveTips = b.saveTips.map((t, i) => ({ id: `st_${i}`, text: t }))
  b.hiddenFees = b.hiddenFees.map((t, i) => ({ id: `hf_${i}`, text: t }))

  const t = clone(tips)
  t.body = t.body.map((x, i) => ({ id: `tb_${i}`, text: x }))
  t.contract = t.contract.map((x, i) => ({ id: `tc_${i}`, text: x }))
  t.emergencies = t.emergencies.map((e, i) => ({ ...e, id: `em_${i}` }))
  t.dayRules = t.dayRules.map((x, i) => ({ id: `td_${i}`, text: x }))

  return {
    overview: o,
    phases: normalizePhases(clone(phases)),
    daySchedule: clone(daySchedule).map((d, i) => ({ ...d, id: `day_${i}` })),
    shopCategories: clone(shopCategories).map((cat) => ({
      ...cat,
      items: cat.items.map((it, i) => ({ ...it, id: `${cat.id}_${i}` }))
    })),
    budget: b,
    tips: t,
    exerciseTypes: clone(EXERCISE_TYPES)
  }
}

export function flattenTasks(phasesList) {
  const list = []
  ;(phasesList || []).forEach((phase) => {
    ;(phase.months || []).forEach((month) => {
      ;(month.groups || []).forEach((group) => {
        ;(group.tasks || []).forEach((task) => {
          const id = typeof task === 'string' ? null : task.id
          const text = typeof task === 'string' ? task : task.text
          if (!id) return
          list.push({
            id,
            text,
            phaseId: phase.id,
            monthId: month.id,
            monthLabel: month.label,
            groupTitle: group.title
          })
        })
      })
    })
  })
  return list
}

export const PHASE_MAP = { s1: 'p1', s2: 'p2', s3: 'p3', s4: 'p4', s5: 'p5' }
