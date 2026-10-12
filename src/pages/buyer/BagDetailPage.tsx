import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, AlertCircle, ShoppingBag, Store, ShieldCheck, Heart } from 'lucide-react'
import { useBag } from '@/hooks/useBags'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LoadingPage, EmptyState } from '@/components/shared'
import { formatVND, formatDateTime, formatPickupWindow, discountPct, storeGradient } from '@/lib/utils'

export default function BagDetailPage() {
  const { bagId } = useParams<{ bagId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { bag, loading, error } = useBag(bagId)
  const [isFavorite, setIsFavorite] = useState(false)

  if (loading) return <LoadingPage />
  if (error || !bag) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="🔍"
          title="Không tìm thấy túi"
          description="Túi bất ngờ này có thể đã kết thúc hoặc không tồn tại."
          action={
            <Button onClick={() => navigate('/discover')} variant="brand">
              Khám phá túi khác
            </Button>
          }
        />
      </div>
    )
  }

  const store = bag.stores
  const discount = discountPct(bag.price, bag.retail_min)
  const isSoldOut = bag.remaining <= 0 || bag.status !== 'OPEN'
  const exampleDishes = bag.example_dishes || []

  return (
    <div className="mx-auto max-w-lg pb-24">
      {/* Header Visual */}
      <div
        className={`relative flex h-60 w-full flex-col items-center justify-center bg-gradient-to-br ${storeGradient(
          store?.name || 'RescueBite'
        )} p-6 text-center text-white`}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        <div className="text-6xl drop-shadow-lg mb-2">
          {exampleDishes.length
            ? exampleDishes.map((d) => d.emoji || '🍱').slice(0, 3).join(' ')
            : '🍱 🥪 🥐'}
        </div>
        <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          {bag.category}
        </span>
      </div>

      {/* Content Container */}
      <div className="p-4 space-y-5">
        {/* Title & Pricing */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                Túi Bất Ngờ
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {store?.name || 'Cửa hàng đối tác'}
              </h1>
            </div>
            {discount > 0 && (
              <span className="rounded-xl bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                -{discount}%
              </span>
            )}
          </div>

          {/* Price details */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-extrabold text-green-700">
              {formatVND(bag.price)}
            </span>
            <span className="text-sm text-slate-400 line-through">
              Giá gốc: ~{formatVND(bag.retail_min)} - {formatVND(bag.retail_max)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
            <span className="text-slate-500">Tình trạng kho:</span>
            {isSoldOut ? (
              <span className="font-semibold text-slate-600">Đã hết túi</span>
            ) : (
              <span className="font-semibold text-emerald-600">
                Còn lại {bag.remaining} / {bag.quantity} túi
              </span>
            )}
          </div>
        </div>

        {/* Pickup Window Card */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-slate-800">Thời gian nhận túi</h4>
            <p className="text-green-700 font-bold mt-0.5">
              {formatPickupWindow(bag.pickup_start, bag.pickup_end)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatDateTime(bag.pickup_start)}
            </p>
          </div>
        </div>

        {/* Example Dishes & Surprise Bag Notice */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <span>Ví dụ món trong túi</span>
            <span className="text-xs font-normal text-slate-500">(tùy thuộc dư hôm nay)</span>
          </h3>

          {exampleDishes.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {exampleDishes.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.emoji || '🍽️'}</span>
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  {item.qty && (
                    <span className="text-xs text-slate-400">x{item.qty}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Món ăn tươi ngon theo thực đơn trong ngày.</p>
          )}

          {/* Mandatory notice */}
          <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Nội dung thực tế có thể khác</p>
              <p className="mt-0.5 text-amber-700">
                Túi bất ngờ gồm những món dư thừa thơm ngon cuối ngày, số lượng và chủng loại món cụ thể phụ thuộc vào tình hình bán tại quán.
              </p>
            </div>
          </div>
        </div>

        {/* Store Information */}
        {store && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Store className="h-4 w-4 text-green-700" />
              <span>Thông tin điểm bán</span>
            </h3>

            <div className="text-sm space-y-1.5">
              <p className="font-medium text-slate-800">{store.name}</p>
              <p className="flex items-start gap-1.5 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{store.address}, {store.district}</span>
              </p>
              {store.description && (
                <p className="text-xs text-slate-500 pt-1 border-t mt-2">
                  {store.description}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-2.5 flex items-center gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Cửa hàng đã ký cam kết đảm bảo vệ sinh an toàn thực phẩm.</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">Tổng thanh toán</p>
            <p className="text-xl font-bold text-green-700">{formatVND(bag.price)}</p>
          </div>

          <Button
            size="lg"
            variant={isSoldOut ? 'outline' : 'brand'}
            disabled={isSoldOut}
            onClick={() => {
              if (!user) {
                navigate('/auth')
              } else {
                navigate(`/checkout/${bag.id}`)
              }
            }}
            className="flex-1 max-w-[200px]"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            {isSoldOut ? 'Hết túi' : 'Đặt ngay'}
          </Button>
        </div>
      </div>
    </div>
  )
}
