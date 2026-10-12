import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { MobileLayout, DesktopLayout, AuthLayout } from '@/components/layout/AppShell'

// Public & Buyer Pages
import AuthPage from '@/pages/auth/AuthPage'
import DiscoverPage from '@/pages/buyer/DiscoverPage'
import BagDetailPage from '@/pages/buyer/BagDetailPage'
import StoreDetailPage from '@/pages/buyer/StoreDetailPage'
import CheckoutPage from '@/pages/buyer/CheckoutPage'
import PaymentPage from '@/pages/buyer/PaymentPage'
import MyOrdersPage from '@/pages/buyer/MyOrdersPage'
import OrderDetailPage from '@/pages/buyer/OrderDetailPage'
import PickupPage from '@/pages/buyer/PickupPage'
import FavoritesPage from '@/pages/buyer/FavoritesPage'
import ImpactPage from '@/pages/buyer/ImpactPage'
import NotificationsPage from '@/pages/buyer/NotificationsPage'

// Store Owner Pages
import StoreApplyPage from '@/pages/store/StoreApplyPage'
import StoreDashboardPage from '@/pages/store/StoreDashboardPage'
import StoreBagsPage from '@/pages/store/StoreBagsPage'
import StoreOrdersPage from '@/pages/store/StoreOrdersPage'
import StoreRevenuePage from '@/pages/store/StoreRevenuePage'

// CRM & Operational Workspace Pages
import Customer360Page from '@/pages/crm/Customer360Page'
import TicketCenterPage from '@/pages/crm/TicketCenterPage'
import ServqualDashboardPage from '@/pages/crm/ServqualDashboardPage'
import StoreQualityPage from '@/pages/crm/StoreQualityPage'
import PartnerCrmPage from '@/pages/crm/PartnerCrmPage'
import StoreReviewPage from '@/pages/crm/StoreReviewPage'
import GoalsDashboardPage from '@/pages/crm/GoalsDashboardPage'
import ReconciliationAlertsPage from '@/pages/crm/ReconciliationAlertsPage'

// System Admin Management Pages
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'
import AdminDecisionsPage from '@/pages/admin/AdminDecisionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/auth" element={<AuthPage />} />
          </Route>

          {/* Buyer & Store Mobile Layout */}
          <Route element={<MobileLayout />}>
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/bag/:bagId" element={<BagDetailPage />} />
            <Route path="/store/:storeId" element={<StoreDetailPage />} />
            <Route path="/checkout/:bagId" element={<CheckoutPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/pickup/:identifier" element={<PickupPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Store Portal */}
            <Route path="/store/apply" element={<StoreApplyPage />} />
            <Route path="/store/dashboard" element={<StoreDashboardPage />} />
            <Route path="/store/bags" element={<StoreBagsPage />} />
            <Route path="/store/orders" element={<StoreOrdersPage />} />
            <Route path="/store/revenue" element={<StoreRevenuePage />} />
          </Route>

          {/* Staff & Admin Desktop Layout */}
          <Route element={<DesktopLayout />}>
            <Route path="/crm/customers" element={<Customer360Page />} />
            <Route path="/crm/tickets" element={<TicketCenterPage />} />
            <Route path="/crm/servqual" element={<ServqualDashboardPage />} />
            <Route path="/crm/store-quality" element={<StoreQualityPage />} />
            <Route path="/crm/partners" element={<PartnerCrmPage />} />
            <Route path="/crm/stores-review" element={<StoreReviewPage />} />
            <Route path="/crm/goals" element={<GoalsDashboardPage />} />
            <Route path="/crm/alerts" element={<ReconciliationAlertsPage />} />

            {/* Admin Management */}
            <Route path="/admin/stores" element={<StoreReviewPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/decisions" element={<AdminDecisionsPage />} />
          </Route>

          {/* Fallback & Root redirect */}
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
