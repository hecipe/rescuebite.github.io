import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  Package,
} from 'lucide-react'
import { useMyStore } from '@/hooks/useMyStore'
import { useStoreOrders } from '@/hooks/useOrders'
import { StatusChip, LoadingPage, EmptyState } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatVND, formatDateTime, formatPickupWindow, parseError } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function StoreOrdersPage() {
  const navigate = useNavigate()
  const { store, loading: storeLoading } = useMyStore()
  const { orders, loading: ordersLoading, error, refetch } = useStoreOrders(store?.id)

  const [tab, setTab] = useState<'all' | 'awaiting' | 'completed'>('awaiting')
  const [claimCode, setClaimCode] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Lazy trigger expire_orders on store dashboard/orders load
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

  async function handleVerifyPickup(identifier: string) {
    if (!identifier.trim()) return
    setClaiming(true)
    setClaimSuccess(null)
    setClaimError(null)

    try {
      const { data, error: rpcErr } = await supabase.rpc('confirm_pickup', {
        p_identifier: identifier.trim(),
      })

      if (rpcErr) throw new Error(rpcErr.message)

      setClaimSuccess(`Xác thực nhận túi thành công cho đơn #${identifier.slice(0, 8).toUpperCase()}!`)
      setClaimCode('')
      await refetch()
    } catch (err) {
      setClaimError(parseError(err))
    } finally {
      setClaiming(false)
    }
  }

  if (storeLoading || ordersLoading) return <LoadingPage />

  if (!store) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="🏪"
          title="Bạn chưa có cửa hàng"
          description="Vui lòng đăng ký đối tác để xem danh sách đơn hàng."
          action={<Button onClick={() => navigate('/store/apply')} variant="brand">Đăng ký mở quán</Button>}
        />
      </div>
    )
  }

  const filteredOrders = orders.filter((order) => {
    if (tab === 'awaiting') return order.status === 'PAID_AWAITING_PICKUP'
    if (tab === 'completed') return order.status === 'PICKED_UP'
    return true
  })

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/store/dashboard')}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Đơn hàng nhận tại quầy</h1>
            <p className="text-xs text-slate-500">{store.name} • {orders.length} đơn đặt</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-8 px-2.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Làm mới
        </Button>
      </div>

      {/* Counter-Side Claim Box */}
      <div className="rounded-2xl border-2 border-green-600 bg-green-50/60 p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-green-900">
            🔍 Xác thực mã nhận túi tại quầy
          </h2>
          <p className="text-xs text-green-700 mt-0.5">
            Nhập mã đơn hàng hoặc mã nhận hộ 6 ký tự khách đưa cho nhân viên:
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="VD: 8B92D1 hoặc mã đơn..."
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleVerifyPickup(claimCode)
              }
            }}
            className="bg-white uppercase font-mono font-bold tracking-wider"
          />
          <Button
            variant="brand"
            disabled={claiming || !claimCode.trim()}
            onClick={() => handleVerifyPickup(claimCode)}
            className="shrink-0"
          >
            {claiming ? 'Đang kiểm tra...' : 'Xác thực & Giao túi'}
          </Button>
        </div>

        {claimSuccess && (
          <div className="rounded-xl bg-white border border-green-300 p-2.5 text-xs text-green-800 flex items-center gap-2 font-medium">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <span>{claimSuccess}</span>
          </div>
        )}

        {claimError && (
          <div className="rounded-xl bg-white border border-red-300 p-2.5 text-xs text-red-700 flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{claimError}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
        {[
          { id: 'awaiting', label: `Chờ nhận (${orders.filter((o) => o.status === 'PAID_AWAITING_PICKUP').length})` },
          { id: 'completed', label: `Đã giao (${orders.filter((o) => o.status === 'PICKED_UP').length})` },
          { id: 'all', label: `Tất cả (${orders.length})` },
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
          icon="📦"
          title="Không có đơn hàng nào"
          description="Hiện không có đơn hàng nào thuộc nhóm này."
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((ord) => {
            const bag = ord.bags as any
            const isAwaiting = ord.status === 'PAID_AWAITING_PICKUP'

            return (
              <div
                key={ord.id}
                className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        #{ord.id.slice(0, 8).toUpperCase()}
                      </span>
                      {ord.helper_code && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 font-mono">
                          Mã phụ: {ord.helper_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Đặt lúc: {formatDateTime(ord.created_at)}
                    </p>
                  </div>
                  <StatusChip status={ord.status} />
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{bag?.category || 'Túi bất ngờ'} × {ord.qty}</span>
                    <span className="font-bold text-green-700">{formatVND(ord.total_price)}</span>
                  </div>
                  {bag?.pickup_start && bag?.pickup_end && (
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>
                        Giờ khách đến: <strong>{formatPickupWindow(bag.pickup_start, bag.pickup_end)}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Claim confirmation action */}
                {isAwaiting && (
                  <div className="flex justify-end pt-1 border-t border-slate-100">
                    <Button
                      variant="brand"
                      size="sm"
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                      disabled={claiming}
                      onClick={() => handleVerifyPickup(ord.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Xác nhận đã giao túi
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
