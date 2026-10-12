import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Store,
  MapPin,
  Share2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Award,
  Copy,
  Check,
} from 'lucide-react'
import { useOrder } from '@/hooks/useOrders'
import { useAuth } from '@/hooks/useAuth'
import { StatusChip, LoadingPage, EmptyState } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { ReviewModal } from '@/components/buyer/ReviewModal'
import { SurveyModal } from '@/components/buyer/SurveyModal'
import {
  formatVND,
  formatDateTime,
  formatPickupWindow,
  parseError,
  storeGradient,
} from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { order, loading, error, refetch } = useOrder(orderId)

  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [helperCode, setHelperCode] = useState<string | null>(null)
  const [generatingHelper, setGeneratingHelper] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const [showReviewModal, setShowReviewModal] = useState(searchParams.get('review') === 'true')
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [hasSurveyed, setHasSurveyed] = useState(false)

  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Fetch order events audit trail & review status
  useEffect(() => {
    if (!orderId) return
    fetchAuditTrail()
    checkReviewAndSurvey()
  }, [orderId])

  useEffect(() => {
    if (order?.helper_code) {
      setHelperCode(order.helper_code)
    }
  }, [order?.helper_code])

  async function fetchAuditTrail() {
    if (!orderId) return
    setLoadingEvents(true)
    const { data } = await supabase
      .from('order_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (data) setEvents(data)
    setLoadingEvents(false)
  }

  async function checkReviewAndSurvey() {
    if (!orderId) return
    // Check if review exists
    const { data: rev } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()
    if (rev) setHasReviewed(true)

    // Check if survey exists
    const { data: surv } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()
    if (surv) setHasSurveyed(true)
  }

  async function handleGenerateHelperCode() {
    if (!orderId) return
    setGeneratingHelper(true)
    setActionError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('generate_helper_code', {
        p_order_id: orderId,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      setHelperCode(data as string)
      await refetch()
    } catch (err) {
      setActionError(parseError(err))
    } finally {
      setGeneratingHelper(false)
    }
  }

  function handleCopyHelperCode() {
    if (!helperCode) return
    navigator.clipboard.writeText(helperCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function handleCancelOrder() {
    if (!orderId) return
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return
    setCancelling(true)
    setActionError(null)
    try {
      const { error: rpcErr } = await supabase.rpc('cancel_order', {
        p_order_id: orderId,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      await refetch()
      await fetchAuditTrail()
    } catch (err) {
      setActionError(parseError(err))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <LoadingPage />
  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="📦"
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng không tồn tại hoặc bạn không có quyền xem."
          action={<Button onClick={() => navigate('/orders')} variant="brand">Về danh sách đơn hàng</Button>}
        />
      </div>
    )
  }

  const bag = order.bags as any
  const store = bag?.stores as any
  const isPaid = order.status === 'PAID_AWAITING_PICKUP'
  const isPending = order.status === 'PENDING_PAYMENT'
  const isPickedUp = order.status === 'PICKED_UP'

  return (
    <div className="mx-auto max-w-lg pb-28 p-4 space-y-4">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900">Chi tiết đơn hàng</h1>
          <p className="text-xs text-slate-500 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <StatusChip status={order.status} />
      </div>

      {searchParams.get('paid') === '1' && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Thanh toán thành công!
          </div>
          <p className="text-xs text-emerald-700">
            Đơn hàng đã được xác nhận. Vui lòng đến cửa hàng trong khung giờ nhận túi.
          </p>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Store & Bag Summary */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">Cửa hàng</p>
            <Link
              to={`/store/${store?.id}`}
              className="text-base font-bold text-slate-900 hover:text-green-700 transition-colors flex items-center gap-1.5"
            >
              <Store className="h-4 w-4 text-green-700" />
              {store?.name}
            </Link>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {store?.address}, {store?.district}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-2">
          <div className="flex justify-between font-semibold text-slate-800">
            <span>{bag?.category || 'Túi bất ngờ'} × {order.qty} túi</span>
            <span className="text-green-700 font-bold text-sm">{formatVND(order.total_price)}</span>
          </div>
          {bag?.pickup_start && bag?.pickup_end && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="h-3.5 w-3.5 text-green-700" />
              <span>Khung giờ nhận: <strong>{formatPickupWindow(bag.pickup_start, bag.pickup_end)}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Helper Code Delegation Card (For PAID_AWAITING_PICKUP) */}
      {isPaid && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-blue-700" />
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                Nhờ bạn bè nhận hộ
              </h3>
            </div>
            {!helperCode && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                disabled={generatingHelper}
                onClick={handleGenerateHelperCode}
              >
                {generatingHelper ? 'Đang tạo...' : 'Tạo mã nhận hộ'}
              </Button>
            )}
          </div>

          {helperCode ? (
            <div className="rounded-xl bg-white p-3 border border-blue-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Mã nhận hộ bí mật:</p>
                <p className="text-xl font-mono font-bold text-blue-700 tracking-wider">
                  {helperCode}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyHelperCode}
                className="text-xs h-8 gap-1.5"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? 'Đã chép' : 'Sao chép'}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-blue-700/80">
              Bạn bận? Hãy tạo mã 6 ký tự để gửi cho bạn bè ghé cửa hàng lấy túi thay bạn.
            </p>
          )}
        </div>
      )}

      {/* Review & Survey actions after pickup */}
      {isPickedUp && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Phản hồi & Đánh giá
          </h3>
          <div className="flex gap-2">
            <Button
              variant="brand"
              size="sm"
              className="flex-1 text-xs h-9"
              onClick={() => setShowReviewModal(true)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-300" />
              {hasReviewed ? 'Sửa đánh giá' : 'Đánh giá túi'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => setShowSurveyModal(true)}
            >
              <Award className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              {hasSurveyed ? 'Đã làm SERVQUAL' : 'Khảo sát SERVQUAL'}
            </Button>
          </div>
        </div>
      )}

      {/* Audit Trail Timeline */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Nhật ký trạng thái đơn hàng
        </h3>
        {loadingEvents ? (
          <p className="text-xs text-slate-400">Đang tải tiến trình...</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có sự kiện nào.</p>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-1">
            {events.map((ev, index) => (
              <div key={ev.id || index} className="relative pl-5">
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-green-600" />
                <p className="text-xs font-semibold text-slate-800">
                  {ev.note || ev.to_status}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatDateTime(ev.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 p-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          {isPending && (
            <>
              <Button
                variant="outline"
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex-1"
                disabled={cancelling}
                onClick={handleCancelOrder}
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </Button>
              <Button
                variant="brand"
                className="flex-1"
                onClick={() => navigate(`/payment/${order.id}`)}
              >
                Thanh toán ngay
              </Button>
            </>
          )}

          {isPaid && (
            <>
              <Button
                variant="outline"
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex-1"
                disabled={cancelling}
                onClick={handleCancelOrder}
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đơn (hoàn tiền)'}
              </Button>
              <Button
                variant="brand"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => navigate(`/pickup/${order.id}`)}
              >
                Mở màn hình nhận túi
              </Button>
            </>
          )}

          {!isPending && !isPaid && (
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => navigate('/discover')}
            >
              Tiếp tục khám phá túi khác
            </Button>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {store && (
        <ReviewModal
          orderId={order.id}
          storeId={store.id}
          storeName={store.name}
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          onSuccess={() => {
            setHasReviewed(true)
            setShowSurveyModal(true)
          }}
        />
      )}

      {/* Survey Modal */}
      <SurveyModal
        orderId={order.id}
        open={showSurveyModal}
        onOpenChange={setShowSurveyModal}
        onSuccess={() => setHasSurveyed(true)}
      />
    </div>
  )
}
