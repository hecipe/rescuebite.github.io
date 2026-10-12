import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShoppingBag, Clock, Store, AlertCircle, ChevronRight } from 'lucide-react'
import { useBag } from '@/hooks/useBags'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LoadingPage, EmptyState } from '@/components/shared'
import {
  formatVND,
  formatPickupWindow,
  formatDateTime,
  discountPct,
  storeGradient,
  parseError,
} from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function CheckoutPage() {
  const { bagId } = useParams<{ bagId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { bag, loading, error } = useBag(bagId)
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)

  if (loading) return <LoadingPage />
  if (error || !bag) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="🔍"
          title="Không tìm thấy túi"
          description="Túi bất ngờ này không còn khả dụng."
          action={<Button onClick={() => navigate('/discover')} variant="brand">Khám phá túi khác</Button>}
        />
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  const isSoldOut = bag.remaining <= 0 || bag.status !== 'OPEN'
  const discount = discountPct(bag.price, bag.retail_min)
  const store = bag.stores

  async function handlePlaceOrder() {
    if (!bagId) return
    setPlacing(true)
    setPlaceError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('place_order', {
        p_bag_id: bagId,
        p_qty: 1,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      const orderId = data as string
      navigate(`/payment/${orderId}`)
    } catch (err) {
      setPlaceError(parseError(err))
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      {/* Visual Header */}
      <div
        className={`relative flex h-48 w-full flex-col items-center justify-center bg-gradient-to-br ${storeGradient(store?.name || '')} p-6 text-center text-white`}
      >
        <div className="text-5xl mb-2">
          {bag.example_dishes?.slice(0, 3).map((d) => d.emoji || '🍱').join(' ') || '🍱 🥪 🥐'}
        </div>
        <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          {bag.category}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Store & Bag Summary */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500 font-medium">Túi bất ngờ từ</p>
              <h2 className="text-lg font-bold text-slate-900">{store?.name}</h2>
              <p className="text-xs text-slate-500">{store?.district}</p>
            </div>
            {discount > 0 && (
              <span className="rounded-xl bg-orange-500 px-2.5 py-1 text-xs font-bold text-white">
                -{discount}%
              </span>
            )}
          </div>

          {/* Example dishes */}
          {bag.example_dishes && bag.example_dishes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {bag.example_dishes.slice(0, 4).map((dish, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                >
                  {dish.emoji} {dish.name}
                </span>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200/70 p-2.5 text-xs text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
            <span>Nội dung thực tế có thể khác – đây là túi bất ngờ!</span>
          </div>
        </div>

        {/* Pickup Window */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
            <Clock className="h-5 w-5 text-green-700" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-800">Thời gian nhận túi</p>
            <p className="text-green-700 font-bold">{formatPickupWindow(bag.pickup_start, bag.pickup_end)}</p>
            <p className="text-xs text-slate-500">{formatDateTime(bag.pickup_start)}</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-800">Tóm tắt đơn hàng</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Túi bất ngờ × 1</span>
              <span className="font-medium">{formatVND(bag.price)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-xs">
              <span>Giá gốc ước tính</span>
              <span className="line-through">{formatVND(bag.retail_min)}–{formatVND(bag.retail_max)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold text-slate-900">
              <span>Tổng thanh toán</span>
              <span className="text-green-700 text-base">{formatVND(bag.price)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-xs text-blue-700">
            💳 Sau khi đặt, bạn có <strong>10 phút</strong> để hoàn tất thanh toán mô phỏng.
          </div>
        </div>

        {/* Store Address */}
        {store && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">
              <Store className="h-5 w-5 text-slate-500" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-800">{store.name}</p>
              <p className="text-slate-500 text-xs">{store.address}, {store.district}</p>
            </div>
          </div>
        )}

        {/* Remaining stock warning */}
        {bag.remaining <= 3 && !isSoldOut && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 text-center font-medium">
            ⚡ Chỉ còn {bag.remaining} túi – nhanh tay đặt ngay!
          </div>
        )}

        {/* Error */}
        {placeError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {placeError}
          </div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 p-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">Thanh toán</p>
            <p className="text-xl font-bold text-green-700">{formatVND(bag.price)}</p>
          </div>
          <Button
            size="lg"
            variant={isSoldOut ? 'outline' : 'brand'}
            disabled={isSoldOut || placing}
            onClick={handlePlaceOrder}
            className="flex-1 max-w-[200px]"
          >
            {placing ? (
              <span className="animate-pulse">Đang đặt...</span>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4 mr-2" />
                {isSoldOut ? 'Hết túi' : 'Xác nhận đặt túi'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
