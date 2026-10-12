import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Clock, ArrowRight, Store, RefreshCw, XCircle } from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import { StatusChip, LoadingPage, EmptyState } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { formatVND, formatDateTime, formatPickupWindow, parseError } from '@/lib/utils'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const { orders, loading, error, refetch } = useOrders()
  const [tab, setTab] = useState<'all' | 'awaiting' | 'completed' | 'cancelled'>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // Real-time listener for orders update
  useEffect(() => {
    const channel = supabase
      .channel('buyer-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  async function handleCancelOrder(orderId: string) {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return
    setCancellingId(orderId)
    setCancelError(null)

    try {
      const { error: rpcErr } = await supabase.rpc('cancel_order', {
        p_order_id: orderId,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      await refetch()
    } catch (err) {
      setCancelError(parseError(err))
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return <LoadingPage />

  const filteredOrders = orders.filter((order) => {
    if (tab === 'awaiting') return order.status === 'PAID_AWAITING_PICKUP' || order.status === 'PENDING_PAYMENT'
    if (tab === 'completed') return order.status === 'PICKED_UP'
    if (tab === 'cancelled') return order.status === 'CANCELLED' || order.status === 'REFUNDED' || order.status === 'NO_SHOW'
    return true
  })

  return (
    <div className="mx-auto max-w-lg pb-24 p-4 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Đơn hàng của tôi</h1>
          <p className="text-xs text-slate-500">Theo dõi trạng thái và thời gian nhận túi</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-8 px-2 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Làm mới
        </Button>
      </div>

      {cancelError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'awaiting', label: 'Chờ nhận' },
          { id: 'completed', label: 'Đã nhận' },
          { id: 'cancelled', label: 'Hủy/Hoàn' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 rounded-lg py-1.5 font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon="🛍️"
          title="Chưa có đơn hàng nào"
          description="Hãy khám phá các túi đồ ăn tươi ngon và đặt ngay hôm nay!"
          action={
            <Button onClick={() => navigate('/discover')} variant="brand">
              Khám phá túi ngay
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const bag = order.bags as any
            const store = bag?.stores as any

            return (
              <div
                key={order.id}
                className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                {/* Header: Store name & Status chip */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-slate-400" />
                      {store?.name || 'Cửa hàng RescueBite'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Mã đơn: <span className="font-mono font-medium">{order.id.slice(0, 8).toUpperCase()}</span>
                    </p>
                  </div>
                  <StatusChip status={order.status} />
                </div>

                {/* Bag summary */}
                <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between font-medium text-slate-800">
                    <span>{bag?.category || 'Túi bất ngờ'} × {order.qty}</span>
                    <span className="font-bold text-green-700">{formatVND(order.total_price)}</span>
                  </div>

                  {bag?.pickup_start && bag?.pickup_end && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Nhận hàng: <strong>{formatPickupWindow(bag.pickup_start, bag.pickup_end)}</strong></span>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400">
                    Đặt lúc: {formatDateTime(order.created_at)}
                  </p>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 h-8"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    Chi tiết đơn hàng
                  </Button>

                  <div className="flex items-center gap-2">
                    {order.status === 'PENDING_PAYMENT' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-red-600 border-red-200 hover:bg-red-50 h-8"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          {cancellingId === order.id ? 'Đang hủy...' : 'Hủy đơn'}
                        </Button>
                        <Button
                          variant="brand"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => navigate(`/payment/${order.id}`)}
                        >
                          Thanh toán
                        </Button>
                      </>
                    )}

                    {order.status === 'PAID_AWAITING_PICKUP' && (
                      <Button
                        variant="brand"
                        size="sm"
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => navigate(`/pickup/${order.id}`)}
                      >
                        Mở mã nhận túi
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}

                    {order.status === 'PICKED_UP' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => navigate(`/orders/${order.id}?review=true`)}
                      >
                        Đánh giá túi
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
