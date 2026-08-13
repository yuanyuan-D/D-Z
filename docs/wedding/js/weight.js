export const PEOPLE = [
  { id: 'dong', name: '小董' },
  { id: 'zhao', name: '小赵' }
]

export const EXERCISE_TYPES = ['有氧', '力量', '瑜伽普拉提', '散步快走', '舞蹈', '其他']

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatShortDate(key) {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}

export function getActiveProfile(weightData) {
  const id = weightData.activePerson || 'dong'
  return {
    id,
    name: PEOPLE.find((p) => p.id === id)?.name || id,
    profile: weightData.people[id]
  }
}

export function sortedWeightPoints(profile) {
  return Object.entries(profile.entries || {})
    .filter(([, e]) => e && e.weight != null && !Number.isNaN(Number(e.weight)))
    .map(([date, e]) => ({ date, weight: Number(e.weight), exercise: !!e.exercise }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function sortedLogs(profile) {
  return Object.entries(profile.entries || {})
    .map(([date, e]) => ({ date, ...e }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function summarize(profile) {
  const points = sortedWeightPoints(profile)
  const logs = sortedLogs(profile)
  const latest = points.length ? points[points.length - 1] : null
  const first = points.length ? points[0] : null
  const start = profile.startWeight != null ? Number(profile.startWeight) : first?.weight
  const goal = profile.goalWeight != null ? Number(profile.goalWeight) : null
  const deltaFromStart =
    latest && start != null ? Number((latest.weight - start).toFixed(1)) : null
  const toGoal = latest && goal != null ? Number((latest.weight - goal).toFixed(1)) : null
  const exerciseDays = logs.filter((l) => l.exercise).length
  let streak = 0
  const day = new Date()
  for (;;) {
    const key = todayKey(day)
    const entry = profile.entries?.[key]
    if (entry?.exercise) {
      streak += 1
      day.setDate(day.getDate() - 1)
      continue
    }
    break
  }
  return {
    latest,
    start,
    goal,
    deltaFromStart,
    toGoal,
    exerciseDays,
    logDays: logs.length,
    streak,
    points
  }
}

export function buildWeightChart(points, goalWeight) {
  if (!points.length) {
    return `<div class="chart-empty">暂无体重数据，先记录今天的体重吧</div>`
  }

  const width = 640
  const height = 240
  const pad = { t: 24, r: 20, b: 36, l: 44 }
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const weights = points.map((p) => p.weight)
  if (goalWeight != null) weights.push(Number(goalWeight))
  let min = Math.min(...weights)
  let max = Math.max(...weights)
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  min -= span * 0.12
  max += span * 0.12

  const xAt = (i) => pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const yAt = (w) => pad.t + ((max - w) / (max - min)) * innerH

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.weight).toFixed(1)}`)
    .join(' ')

  const area =
    points.length > 1
      ? `${line} L${xAt(points.length - 1).toFixed(1)},${(pad.t + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(pad.t + innerH).toFixed(1)} Z`
      : ''

  const dots = points
    .map((p, i) => {
      const x = xAt(i)
      const y = yAt(p.weight)
      return `
        <circle class="chart-dot ${p.exercise ? 'exercised' : ''}" cx="${x}" cy="${y}" r="4.5">
          <title>${p.date} · ${p.weight} kg${p.exercise ? ' · 已运动' : ''}</title>
        </circle>`
    })
    .join('')

  const labels = points
    .map((p, i) => {
      if (points.length > 8 && i !== 0 && i !== points.length - 1 && i % 2 !== 0) return ''
      return `<text class="chart-label" x="${xAt(i)}" y="${height - 10}" text-anchor="middle">${formatShortDate(p.date)}</text>`
    })
    .join('')

  const yTicks = [min, (min + max) / 2, max]
    .map((v) => {
      const y = yAt(v)
      return `
        <line class="chart-grid" x1="${pad.l}" y1="${y}" x2="${width - pad.r}" y2="${y}" />
        <text class="chart-ylabel" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${v.toFixed(1)}</text>`
    })
    .join('')

  const goalLine =
    goalWeight != null
      ? `
      <line class="chart-goal" x1="${pad.l}" y1="${yAt(goalWeight)}" x2="${width - pad.r}" y2="${yAt(goalWeight)}" />
      <text class="chart-goal-label" x="${width - pad.r}" y="${yAt(goalWeight) - 6}" text-anchor="end">目标 ${Number(goalWeight).toFixed(1)}kg</text>`
      : ''

  return `
    <svg class="weight-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="体重变化曲线">
      ${yTicks}
      ${goalLine}
      ${area ? `<path class="chart-area" d="${area}" />` : ''}
      <path class="chart-line" d="${line}" fill="none" />
      ${dots}
      ${labels}
    </svg>`
}
