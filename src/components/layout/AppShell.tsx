import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { MobileBottomNav } from './Navigation'
import { DesktopSidebar } from './Navigation'
import { TopBar } from './TopBar'
import { LoadingPage } from '@/components/shared'
import type { UserRole } from '@/types/database.types'

// ============================================================
// BUYER / STORE LAYOUT (mobile-first, bottom nav)
// ============================================================
interface MobileLayoutProps {
  requiredRole?: UserRole | UserRole[]
  showTopBar?: boolean
  topBarTitle?: string
}

export function MobileLayout({ requiredRole, showTopBar = true, topBarTitle }: MobileLayoutProps) {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (!user) return <Navigate to="/auth" replace />

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (role && !roles.includes(role)) {
      // Redirect to appropriate home for their role
      if (role === 'admin' || role === 'support_agent' || role === 'sales_rep') {
        return <Navigate to="/crm/customers" replace />
      }
      if (role === 'store_owner') return <Navigate to="/store/dashboard" replace />
      return <Navigate to="/discover" replace />
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {showTopBar && <TopBar title={topBarTitle} />}
      <main className="pb-20">
        <Outlet />
      </main>
      <MobileBottomNav role={role} />
    </div>
  )
}

// ============================================================
// DESKTOP CRM / ADMIN LAYOUT (sidebar)
// ============================================================
interface DesktopLayoutProps {
  requiredRole?: UserRole | UserRole[]
}

export function DesktopLayout({ requiredRole }: DesktopLayoutProps) {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (!user) return <Navigate to="/auth" replace />

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (role && !roles.includes(role)) {
      return <Navigate to="/discover" replace />
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 lg:flex">
      <DesktopSidebar role={role} />
      <div className="flex-1 lg:ml-60">
        <Outlet />
      </div>
    </div>
  )
}

// ============================================================
// PUBLIC LAYOUT (no auth required)
// ============================================================
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Outlet />
    </div>
  )
}

// ============================================================
// AUTH GUARD (redirect if already logged in)
// ============================================================
export function AuthLayout() {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (user && role) {
    // Redirect to appropriate home
    if (role === 'admin' || role === 'support_agent' || role === 'sales_rep') {
      return <Navigate to="/crm/customers" replace />
    }
    if (role === 'store_owner') return <Navigate to="/store/dashboard" replace />
    return <Navigate to="/discover" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50">
      <Outlet />
    </div>
  )
}
