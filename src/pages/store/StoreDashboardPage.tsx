import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  Package,
  Clock,
  TrendingUp,
  Plus,
  RefreshCw,
  AlertTriangle,
  Store as StoreIcon,
  CheckCircle,
} from 'lucide-react'
import { useMyStore } from '@/hooks/useMyStore'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LoadingPage, EmptyState, StatusChip } from '@/components/shared'
import { BagFormModal } from '@/components/store/BagFormModal'
import { formatVND, formatDateTime, formatPickupWindow } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function StoreDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { store, bags, loading, error, refetch } = useMyStore()

  const [todayOrders, setTodayOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [showBagModal, setShowBagModal] = useState(false)

  const [expiring, setExpiring] = useState(false)
  const [expireMessage, setExpireMessage] = useState<string | null>(null)

  // Lazy call expire_orders on load as fallback for pg_cron
  useEffect(() => {
    async function lazyExpire() {
      try {
        await supabase.rpc('expire_orders')
      } catch {
        // ignore background fallback error
      }
    }
    lazyExpire()
  }, [])

  useEffect(() => {
    if (!store?.id) return
    fetchTodayOrders()
  }, [store?.id])

  async function fetchTodayOrders() {
    if (!store?.id) return
    setLoadingOrders(true)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          bags!inner(id, store_id, category, price, pickup_start, pickup_end)
        `)
        .eq('bags.store_id', store.id)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      setTodayOrders(data || [])
    } finally {
      setLoadingOrders(false)
    }
  }

  async function handleSimulateExpire() {
    setExpiring(true)
    setExpireMessage(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('expire_orders')
      if (rpcErr) throw rpcErr

      const res = data as any
      setExpireMessage(
        `Đã quét: Hủy ${res.cancelled_pending || 0} đơn quá hạn thanh toán, chuyển ${res.no_show || 0} đơn sang vắng mặt (No-Show), đóng ${res.closed_bags || 0} túi hết giờ.`
      )
      await refetch()
      await fetchTodayOrders()
    } catch (err) {
      setExpireMessage('Lỗi quét hết giờ.')
    } finally {
      setExpiring(false)
    }
  }

  if (loading) return <LoadingPage />

  if (!store) {
    return (
      <div className="mx-auto max-w-lg p-6 space-y-4">
        <EmptyState
          icon="🏪"
          title="Bạn chưa có cửa hàng nào"
          description="Đăng ký đối tác với RescueBite để bắt đầu đăng túi giải cứu thực phẩm."
          action={
            <Button onClick={() => navigate('/store/apply')} variant="brand">
              Đăng ký mở quán ngay
            </Button>
          }
        />
      </div>
    )
  }

  const openBags = bags.filter((b) => b.status === 'OPEN')
  const totalBagsRemaining = openBags.reduce((sum, b) => sum + b.remaining, 0)
  const todayRevenue = todayOrders
    .filter((o) => o.status === 'PICKED_UP' || o.status === 'PAID_AWAITING_PICKUP')
    .reduce((sum, o) => sum + o.total_price, 0)

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 space-y-5">
      {/* Header Profile */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 font-bold text-xl">
            🏪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{store.name}</h1>
              {store.status === 'pending' && (
                <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-bold text-yellow-800">
                  Chờ duyệt
                </span>
              )}
              {store.status === 'approved' && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-800">
                  Đang hoạt động
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{store.address}, {store.district}</p>
          </div>
        </div>

        <Button
          variant="brand"
          size="sm"
          onClick={() => setShowBagModal(true)}
          className="h-9 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Đăng túi mới
        </Button>
      </div>

      {/* Pending status warning */}
      {store.status === 'pending' && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3.5 text-xs text-yellow-800 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 mt-0.5" />
          <span>
            Cửa hàng của bạn đang ở trạng thái <strong>Chờ duyệt</strong>. Sau khi quản trị viên phê duyệt, các túi bạn đăng sẽ tự động xuất hiện trên trang Khám phá cho người mua.
          </span>
        </div>
      )}

      {/* Simulator Notification */}
      {expireMessage && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-800 flex items-start gap-2.5">
          <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
          <span>{expireMessage}</span>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-3.5 shadow-sm space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Túi đang mở</p>
          <p className="text-2xl font-bold text-green-700">{openBags.length}</p>
          <p className="text-[10px] text-slate-400">Còn {totalBagsRemaining} túi có sẵn</p>
        </div>

        <div className="rounded-2xl border bg-white p-3.5 shadow-sm space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Đơn hôm nay</p>
          <p className="text-2xl font-bold text-slate-900">{todayOrders.length}</p>
          <p className="text-[10px] text-slate-400">
            {todayOrders.filter((o) => o.status === 'PAID_AWAITING_PICKUP').length} chờ nhận
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-3.5 shadow-sm space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Doanh thu dự kiến</p>
          <p className="text-xl font-bold text-orange-600 truncate">{formatVND(todayRevenue)}</p>
          <p className="text-[10px] text-slate-400">Chưa trừ hoa hồng 15%</p>
        </div>

        <div className="rounded-2xl border bg-white p-3.5 shadow-sm space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Điểm uy tín</p>
          <p className="text-2xl font-bold text-blue-600">
            {store.rank_penalty > 0 ? `-${store.rank_penalty}` : 'Tốt ⭐'}
          </p>
          <p className="text-[10px] text-slate-400">Thứ hạng hiển thị</p>
        </div>
      </div>

      {/* Staff Actions & Expire Simulator */}
      <div className="rounded-2xl border bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-slate-800">Công cụ giả lập vận hành</p>
          <p className="text-slate-500">
            Quét và đóng tự động các đơn hết 10 phút thanh toán hoặc quá giờ nhận túi.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={expiring}
          onClick={handleSimulateExpire}
          className="shrink-0 text-xs border-slate-300"
        >
          <Clock className="h-3.5 w-3.5 mr-1 text-slate-600" />
          {expiring ? 'Đang quét...' : 'Giả lập hết giờ'}
        </Button>
      </div>

      {/* Navigation shortcuts */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/store/bags"
          className="flex flex-col items-center justify-center rounded-2xl border bg-white p-4 text-center shadow-sm hover:border-green-500 transition-colors"
        >
          <ShoppingBag className="h-6 w-6 text-green-700 mb-1" />
          <span className="text-xs font-bold text-slate-800">Quản lý túi</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{bags.length} túi đã tạo</span>
        </Link>

        <Link
          to="/store/orders"
          className="flex flex-col items-center justify-center rounded-2xl border bg-white p-4 text-center shadow-sm hover:border-blue-500 transition-colors"
        >
          <Package className="h-6 w-6 text-blue-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">Đơn hàng</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Kiểm tra & xác nhận</span>
        </Link>

        <Link
          to="/store/revenue"
          className="flex flex-col items-center justify-center rounded-2xl border bg-white p-4 text-center shadow-sm hover:border-orange-500 transition-colors"
        >
          <TrendingUp className="h-6 w-6 text-orange-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">Doanh thu</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Biểu đồ & Quyết toán</span>
        </Link>
      </div>

      {/* Active Bags Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Túi đang mở bán ({openBags.length})</h2>
          <Link to="/store/bags" className="text-xs text-green-700 hover:underline font-medium">
            Xem tất cả
          </Link>
        </div>

        {openBags.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-center space-y-2">
            <p className="text-xs text-slate-500">Hôm nay quán chưa mở bán túi bất ngờ nào.</p>
            <Button
              variant="brand"
              size="sm"
              onClick={() => setShowBagModal(true)}
              className="text-xs"
            >
              + Đăng túi ngay bây giờ
            </Button>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {openBags.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border bg-white p-3.5 shadow-sm text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{b.category}</span>
                    <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                      Còn {b.remaining}/{b.quantity} túi
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5">
                    Khung giờ: {formatPickupWindow(b.pickup_start, b.pickup_end)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700">{formatVND(b.price)}</p>
                  <p className="text-[10px] text-slate-400 line-through">{formatVND(b.retail_min)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bag Form Modal */}
      <BagFormModal
        storeId={store.id}
        open={showBagModal}
        onOpenChange={setShowBagModal}
        onSuccess={() => {
          refetch()
          fetchTodayOrders()
        }}
      />
    </div>
  )
}
