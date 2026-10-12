import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ShoppingBag, Star, Heart, Zap, LayoutDashboard, Package, BarChart3, Users, Ticket, TrendingUp, Target, Settings, LogOut, AlertCircle, UserCheck } from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database.types'

// ============================================================
// MOBILE BOTTOM NAV (buyer / store_owner)
// ============================================================

const buyerNav = [
  { to: '/discover', icon: Home, label: 'Khám phá' },
  { to: '/orders', icon: ShoppingBag, label: 'Đơn hàng' },
  { to: '/favorites', icon: Heart, label: 'Yêu thích' },
  { to: '/impact', icon: Zap, label: 'Tác động' },
]

const storeNav = [
  { to: '/store/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/store/bags', icon: Package, label: 'Túi của tôi' },
  { to: '/store/orders', icon: ShoppingBag, label: 'Đơn hàng' },
  { to: '/store/revenue', icon: BarChart3, label: 'Doanh thu' },
]

export function MobileBottomNav({ role }: { role: UserRole | null }) {
  const nav = role === 'store_owner' ? storeNav : buyerNav
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-sm md:hidden">
      <div className="flex">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors',
                isActive ? 'text-green-700' : 'text-slate-500'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// ============================================================
// DESKTOP LEFT SIDEBAR (CRM / admin)
// ============================================================

const crmNav = [
  { to: '/crm/customers', icon: Users, label: 'N1 Khách hàng' },
  { to: '/crm/tickets', icon: Ticket, label: 'N2 Phiếu hỗ trợ' },
  { to: '/crm/servqual', icon: TrendingUp, label: 'N3 SERVQUAL' },
  { to: '/crm/store-quality', icon: Star, label: 'N4 Chất lượng CH' },
  { to: '/crm/partners', icon: UserCheck, label: 'N5 CRM đối tác' },
  { to: '/crm/stores-review', icon: Package, label: 'Duyệt đối tác quán' },
  { to: '/crm/goals', icon: Target, label: 'N6 Mục tiêu KPI' },
  { to: '/crm/alerts', icon: AlertCircle, label: 'N7 Cảnh báo' },
]

const adminNav = [
  { to: '/admin/stores', icon: Package, label: 'Duyệt cửa hàng' },
  { to: '/admin/users', icon: Users, label: 'Người dùng' },
  { to: '/admin/settings', icon: Settings, label: 'Cài đặt' },
  { to: '/admin/decisions', icon: BarChart3, label: 'Nhật ký quyết định' },
]

interface DesktopSidebarProps {
  role: UserRole | null
}

export function DesktopSidebar({ role }: DesktopSidebarProps) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r bg-white fixed left-0 top-0 bottom-0 z-30">
      <div className="flex items-center gap-3 border-b p-4">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {(role === 'support_agent' || role === 'sales_rep' || role === 'admin') && (
          <>
            <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">CRM</div>
            {crmNav
              .filter((item) => {
                if (role === 'sales_rep') return ['/crm/customers', '/crm/partners', '/crm/stores-review', '/crm/goals'].includes(item.to)
                if (role === 'support_agent') return ['/crm/customers', '/crm/tickets', '/crm/servqual', '/crm/store-quality', '/crm/alerts'].includes(item.to)
                return true
              })
              .map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
          </>
        )}

        {role === 'admin' && (
          <>
            <div className="mt-4 px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quản trị</div>
            {adminNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
