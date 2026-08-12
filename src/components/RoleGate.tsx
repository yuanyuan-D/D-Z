import type { Member } from '../sync/familySync'
import type { Role } from '../types'

type Props = {
  onPick: (role: Role) => void
  userName: string
  onUserNameChange: (name: string) => void
  members?: Member[]
  status?: 'idle' | 'connecting' | 'online' | 'offline'
  error?: string
}

export function RoleGate({
  onPick,
  userName,
  onUserNameChange,
  members = [],
  status = 'idle',
  error = '',
}: Props) {
  const canEnter = userName.trim().length > 0
  const others = members.filter((m) => m.name && m.name !== '家人')

  return (
    <section className="role-gate">
      <div className="role-gate__bg" aria-hidden="true" />
      <div className="role-gate__content">
        <p className="brand">小董和小赵的家</p>
        <h1>今晚吃什么，家里说了算</h1>
        <p className="role-gate__sub">
          打开同一链接即可同步菜单和点单——厨房管菜单，餐厅来点单。
        </p>

        <label className="field home-name">
          <span>你的用户名</span>
          <input
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            onBlur={() => {
              if (userName.trim()) onUserNameChange(userName.trim())
            }}
            placeholder="例如：小董 / 小赵"
            maxLength={20}
            autoComplete="nickname"
          />
        </label>

        <p className="sync-status">
          {status === 'online'
            ? others.length > 0
              ? `已同步 · 在线：${others.map((m) => m.name).join('、')}`
              : '已连接，用户名会同步给其他设备'
            : status === 'connecting'
              ? '正在连接家庭数据…'
              : error || '等待连接…'}
        </p>

        <div className="role-gate__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canEnter}
            onClick={() => {
              onUserNameChange(userName.trim())
              onPick('guest')
            }}
          >
            进入餐厅
            <span>浏览菜单 · 点单</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!canEnter}
            onClick={() => {
              onUserNameChange(userName.trim())
              onPick('merchant')
            }}
          >
            进入厨房
            <span>管理菜单 · 看订单</span>
          </button>
        </div>
        {!canEnter && <p className="home-name-tip">先填写用户名，再进入</p>}
      </div>
    </section>
  )
}
