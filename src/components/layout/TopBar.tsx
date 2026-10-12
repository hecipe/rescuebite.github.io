import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bell, ArrowLeft, LogOut, ChevronDown, UserCheck, Shield } from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { cn, getInitials } from '@/lib/utils'
import { DEMO_ACCOUNTS } from '@/lib/constants'

const ROLE_LABELS: Record<string, string> = {
  buyer: 'Người mua',
  store_owner: 'Chủ quán',
  support_agent: 'Hỗ trợ',
  sales_rep: 'Kinh doanh',
  admin: 'Quản trị',
}

const ROLE_COLORS: Record<string, string> = {
  buyer: 'bg-emerald-100 text-emerald-700',
  store_owner: 'bg-orange-100 text-orange-700',
  support_agent: 'bg-blue-100 text-blue-700',
  sales_rep: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
}

interface TopBarProps {
  title?: string
  showBack?: boolean
  transparent?: boolean
}

export function TopBar({ title, showBack, transparent }: TopBarProps) {
  const navigate = useNavigate()
  const { user, role, signOut, signIn } = useAuth()
  const { unreadCount } = useNotifications()
  const [showMenu, setShowMenu] = useState(false)
  const [switching, setSwitching] = useState(false)

  const displayName = user?.user_metadata?.full_name || user?.email || ''
  const roleLabel = role ? ROLE_LABELS[role] : ''
  const roleColor = role ? ROLE_COLORS[role] : 'bg-slate-100 text-slate-600'

  async function handleSignOut() {
    setShowMenu(false)
    await signOut()
    navigate('/auth')
  }

  async function handleQuickSwitch(acc: typeof DEMO_ACCOUNTS[number]) {
    setSwitching(true)
    try {
      await signIn(acc.email, acc.password)
      setShowMenu(false)
      if (acc.role === 'buyer') navigate('/discover')
      else if (acc.role === 'store_owner') navigate('/store/dashboard')
      else navigate('/crm/customers')
    } catch {
      // ignore
    } finally {
      setSwitching(false)
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 px-4',
        transparent
          ? 'bg-transparent'
          : 'border-b bg-white/95 backdrop-blur-sm'
      )}
    >
      {showBack ? (
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <Link to="/discover">
          <Logo size="sm" />
        </Link>
      )}

      {title && (
        <h1 className="flex-1 text-sm font-semibold text-slate-800 truncate">{title}</h1>
      )}

      {!title && <div className="flex-1" />}

      <div className="flex items-center gap-2">
        {user && (
          <Link
            to="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 rounded-full pl-1 pr-2 py-0.5 hover:bg-slate-100 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-700 text-white text-xs font-bold">
                {getInitials(displayName)}
              </div>
              {role && (
                <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', roleColor)}>
                  {roleLabel}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 w-64 rounded-2xl border bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-3 border-b bg-slate-50/60">
                    <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    {role && (
                      <span className={cn('mt-1.5 inline-flex text-[10px] font-semibold rounded-full px-2 py-0.5', roleColor)}>
                        {roleLabel}
                      </span>
                    )}
                  </div>

                  {/* Fast role switcher for testing */}
                  <div className="p-2 border-b">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ⚡ Đổi nhanh vai trò (Demo):
                    </p>
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.role}
                          disabled={switching || role === acc.role}
                          onClick={() => handleQuickSwitch(acc)}
                          className={cn(
                            'text-left px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                            role === acc.role
                              ? 'bg-green-50 text-green-700 font-bold cursor-default'
                              : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigation links based on role */}
                  <div className="p-1">
                    {role === 'store_owner' ? (
                      <Link
                        to="/store/dashboard"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                      >
                        🏪 Quản lý quán của tôi
                      </Link>
                    ) : (
                      <Link
                        to="/store/apply"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                      >
                        🏪 Đăng ký mở quán
                      </Link>
                    )}
                    <Link
                      to="/orders"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      🛍️ Đơn hàng của tôi
                    </Link>
                  </div>

                  <div className="border-t p-1">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!user && (
          <Link
            to="/auth"
            className="rounded-xl bg-green-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-green-800 transition-colors"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  )
}

// Desktop top bar for CRM/admin (complements the sidebar)
interface AdminTopBarProps {
  title: string
  actions?: React.ReactNode
}

export function AdminTopBar({ title, actions }: AdminTopBarProps) {
  const { user, role, signOut, signIn } = useAuth()
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const [showMenu, setShowMenu] = useState(false)
  const [switching, setSwitching] = useState(false)

  const displayName = user?.user_metadata?.full_name || user?.email || ''
  const roleLabel = role ? ROLE_LABELS[role] : ''
  const roleColor = role ? ROLE_COLORS[role] : 'bg-slate-100 text-slate-600'

  async function handleSignOut() {
    setShowMenu(false)
    await signOut()
    navigate('/auth')
  }

  async function handleQuickSwitch(acc: typeof DEMO_ACCOUNTS[number]) {
    setSwitching(true)
    try {
      await signIn(acc.email, acc.password)
      setShowMenu(false)
      if (acc.role === 'buyer') navigate('/discover')
      else if (acc.role === 'store_owner') navigate('/store/dashboard')
      else navigate('/crm/customers')
    } catch {
      // ignore
    } finally {
      setSwitching(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-white px-6">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-3">
        {actions}
        <Link
          to="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-white text-xs font-bold">
                {getInitials(displayName)}
              </div>
              <span className="text-xs font-medium text-slate-700">{displayName.split(' ').pop()}</span>
              {role && (
                <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', roleColor)}>
                  {roleLabel}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-2xl border bg-white shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-slate-50">
                    <p className="text-xs font-bold text-slate-800 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>

                  {/* Fast role switcher */}
                  <div className="p-2 border-b">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ⚡ Đổi nhanh vai trò:
                    </p>
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.role}
                          disabled={switching || role === acc.role}
                          onClick={() => handleQuickSwitch(acc)}
                          className={cn(
                            'text-left px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                            role === acc.role
                              ? 'bg-green-50 text-green-700 font-bold cursor-default'
                              : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
