import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Store,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Award,
} from 'lucide-react'
import { SwipeSlider } from '@/components/shared/SwipeSlider'
import { LoadingPage, EmptyState } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { ReviewModal } from '@/components/buyer/ReviewModal'
import { SurveyModal } from '@/components/buyer/SurveyModal'
import { supabase } from '@/lib/supabase'
import { formatPickupWindow, formatDateTime, parseError, storeGradient } from '@/lib/utils'

export default function PickupPage() {
  const { identifier } = useParams<{ identifier: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showSurveyModal, setShowSurveyModal] = useState(false)

  useEffect(() => {
    if (!identifier) return
    fetchOrder()
  }, [identifier])

  async function fetchOrder() {
    setLoading(true)
    setError(null)
    try {
      // Find order by ID or helper_code
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier || '')

      let query = supabase
        .from('orders')
        .select(`
          *,
          bags(
            id, category, price, retail_min, retail_max, example_dishes,
            pickup_start, pickup_end, status,
            stores(id, name, district, address)
          )
        `)

      if (isUUID) {
        query = query.eq('id', identifier)
      } else {
        query = query.eq('helper_code', identifier?.toUpperCase())
      }

      const { data, error: fetchErr } = await query.single()

      if (fetchErr) throw fetchErr
      setOrder(data)
      if (data.status === 'PICKED_UP') {
        setConfirmed(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tìm thấy đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmPickup() {
    if (!identifier) return
    setConfirming(true)
    setConfirmError(null)

    try {
      const { data, error: rpcErr } = await supabase.rpc('confirm_pickup', {
        p_identifier: identifier,
      })

      if (rpcErr) throw new Error(rpcErr.message)

      setConfirmed(true)
      // Prompt review modal after a short delay
      setTimeout(() => {
        setShowReviewModal(true)
      }, 1000)
    } catch (err) {
      setConfirmError(parseError(err))
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <LoadingPage />
  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="❓"
          title="Mã nhận túi không hợp lệ"
          description={error || 'Vui lòng kiểm tra lại mã hoặc liên hệ nhân viên cửa hàng.'}
          action={<Button onClick={() => navigate('/orders')} variant="brand">Về đơn hàng của tôi</Button>}
        />
      </div>
    )
  }

  const bag = order.bags as any
  const store = bag?.stores as any
  const displayCode = order.helper_code || order.id.slice(-6).toUpperCase()

  return (
    <div className="mx-auto max-w-lg pb-24 p-4 space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900">Màn hình nhận túi</h1>
          <p className="text-xs text-slate-500">Đưa mã này cho nhân viên tại quầy</p>
        </div>
      </div>

      {/* Big prominent code card */}
      <div className="rounded-3xl border-2 border-green-600 bg-gradient-to-b from-green-50 to-white p-6 text-center shadow-md space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-800">
          Mã xác nhận nhận túi
        </p>
        <div className="text-5xl font-mono font-black tracking-widest text-slate-900 py-2">
          {displayCode}
        </div>
        <p className="text-xs text-slate-500">
          {order.helper_code ? '🔑 Mã nhận hộ bạn bè' : '🛍️ Đơn hàng cá nhân'}
        </p>
      </div>

      {/* Confirmation Status Banner */}
      {confirmed && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Nhận túi thành công!</h2>
            <p className="text-xs text-emerald-700 mt-1">
              Bạn vừa giúp cứu một phần thức ăn khỏi lãng phí! Hãy thưởng thức ngon miệng nhé.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="brand"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setShowReviewModal(true)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Đánh giá túi
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-indigo-200 text-indigo-700"
              onClick={() => setShowSurveyModal(true)}
            >
              <Award className="h-3.5 w-3.5 mr-1" />
              Khảo sát SERVQUAL
            </Button>
          </div>
        </div>
      )}

      {/* Store & Bag info */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Store className="h-5 w-5 text-slate-600" />
          </div>
          <div className="text-xs space-y-0.5">
            <h3 className="font-bold text-sm text-slate-900">{store?.name}</h3>
            <p className="text-slate-500">{store?.address}, {store?.district}</p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
          <div className="flex justify-between font-semibold text-slate-800">
            <span>{bag?.category} × {order.qty} túi</span>
            <span className="text-green-700 font-bold">{order.total_price?.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          {bag?.pickup_start && bag?.pickup_end && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="h-3.5 w-3.5 text-green-700" />
              <span>Khung giờ: <strong>{formatPickupWindow(bag.pickup_start, bag.pickup_end)}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {confirmError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{confirmError}</span>
        </div>
      )}

      {/* Swipe Slider to Confirm */}
      {!confirmed && (
        <div className="space-y-2 pt-2">
          <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Xác nhận khi đã nhận được túi từ nhân viên:
          </p>
          <SwipeSlider
            label="Vuốt sang phải để xác nhận nhận túi"
            onConfirm={handleConfirmPickup}
            disabled={confirming}
            loading={confirming}
          />
        </div>
      )}

      {/* Review Modal */}
      {store && (
        <ReviewModal
          orderId={order.id}
          storeId={store.id}
          storeName={store.name}
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          onSuccess={() => setShowSurveyModal(true)}
        />
      )}

      {/* Survey Modal */}
      <SurveyModal
        orderId={order.id}
        open={showSurveyModal}
        onOpenChange={setShowSurveyModal}
      />
    </div>
  )
}
