import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useOrder } from '@/hooks/useOrders'
import { Button } from '@/components/ui/button'
import { LoadingPage, EmptyState } from '@/components/shared'
import { formatVND, parseError } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { order, loading, error, refetch } = useOrder(orderId)
  const [processing, setProcessing] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(600) // 10 minutes in seconds

  // Countdown timer
  useEffect(() => {
    if (!order?.hold_deadline) return
    const holdDeadline = new Date(order.hold_deadline).getTime()

    const tick = () => {
      const remaining = Math.max(0, Math.floor((holdDeadline - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [order?.hold_deadline])

  const formatCountdown = useCallback((secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }, [])

  if (loading) return <LoadingPage />
  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="🔍"
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng không tồn tại hoặc đã hết hạn."
          action={<Button onClick={() => navigate('/orders')} variant="brand">Xem đơn hàng của tôi</Button>}
        />
      </div>
    )
  }

  // If already paid, redirect to orders
  if (order.status === 'PAID_AWAITING_PICKUP') {
    navigate(`/orders/${orderId}`)
    return null
  }

  // If cancelled/expired
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-4">
        <div className="text-6xl">⏱️</div>
        <h2 className="text-xl font-bold text-slate-800">Đơn hàng đã hết hạn</h2>
        <p className="text-slate-500 text-sm">Bạn đã quá thời gian thanh toán 10 phút. Túi đã được trả lại kho.</p>
        <Button onClick={() => navigate('/discover')} variant="brand">Tìm túi khác</Button>
      </div>
    )
  }

  const bag = order.bags as any
  const store = bag?.stores as any
  const isExpired = timeLeft <= 0

  async function handlePayment(result: 'success' | 'fail') {
    if (!orderId) return
    setProcessing(true)
    setPayError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('simulate_payment', {
        p_order_id: orderId,
        p_result: result,
      })
      if (rpcErr) throw new Error(rpcErr.message)

      await refetch()

      if (result === 'success') {
        navigate(`/orders/${orderId}?paid=1`)
      } else {
        navigate('/discover?payment=failed')
      }
    } catch (err) {
      setPayError(parseError(err))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4 space-y-5">
      {/* Header */}
      <div className="text-center pt-4">
        <div className="text-5xl mb-3">💳</div>
        <h1 className="text-xl font-bold text-slate-900">Thanh toán mô phỏng</h1>
        <p className="text-sm text-slate-500 mt-1">Đây là thanh toán giả lập cho mục đích giáo dục.</p>
      </div>

      {/* Countdown timer */}
      <div
        className={`rounded-2xl border-2 p-5 text-center transition-colors ${
          isExpired
            ? 'border-red-200 bg-red-50'
            : timeLeft < 120
            ? 'border-orange-200 bg-orange-50'
            : 'border-green-200 bg-green-50'
        }`}
      >
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Thời gian còn lại
        </p>
        <p
          className={`text-5xl font-mono font-bold tabular-nums transition-colors ${
            isExpired ? 'text-red-600' : timeLeft < 120 ? 'text-orange-600' : 'text-green-700'
          }`}
        >
          {formatCountdown(timeLeft)}
        </p>
        {timeLeft < 120 && !isExpired && (
          <p className="text-xs text-orange-600 mt-2 font-medium">⚡ Sắp hết giờ! Chọn ngay.</p>
        )}
        {isExpired && (
          <p className="text-xs text-red-600 mt-2 font-medium">Đã hết thời gian thanh toán.</p>
        )}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>Đơn hàng sẽ tự hủy khi hết giờ</span>
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-slate-800">Chi tiết đơn hàng</h3>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-600">Cửa hàng</span>
            <span className="font-medium">{store?.name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Danh mục</span>
            <span className="font-medium">{bag?.category || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Số lượng</span>
            <span className="font-medium">{order.qty} túi</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold text-slate-900">Tổng cộng</span>
            <span className="font-bold text-green-700 text-base">{formatVND(order.total_price)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 p-2.5 text-xs text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Mã đơn hàng: <strong className="font-mono">{order.id.slice(-8).toUpperCase()}</strong></span>
        </div>
      </div>

      {/* Payment Simulation Buttons */}
      {!isExpired && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              🎭 Mô phỏng kết quả thanh toán
            </p>
          </div>

          <Button
            variant="brand"
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-base"
            disabled={processing}
            onClick={() => handlePayment('success')}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            ✅ Thanh toán THÀNH CÔNG
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 text-base"
            disabled={processing}
            onClick={() => handlePayment('fail')}
          >
            <XCircle className="h-5 w-5 mr-2" />
            ❌ Thanh toán THẤT BẠI
          </Button>

          {payError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 text-center">
              {payError}
            </div>
          )}

          <p className="text-center text-xs text-slate-400">
            Đây là thanh toán giả lập. Không có tiền thật nào được thu.
          </p>
        </div>
      )}

      {isExpired && (
        <Button
          variant="brand"
          size="lg"
          className="w-full"
          onClick={() => navigate('/discover')}
        >
          Tìm túi mới
        </Button>
      )}
    </div>
  )
}
