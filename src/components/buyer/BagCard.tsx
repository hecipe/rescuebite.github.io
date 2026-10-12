import { Link } from 'react-router-dom'
import { Clock, MapPin, Sparkles } from 'lucide-react'
import { formatVND, formatPickupWindow, discountPct, storeGradient } from '@/lib/utils'
import type { Bag } from '@/types/database.types'

interface BagCardProps {
  bag: Bag
}

export function BagCard({ bag }: BagCardProps) {
  const store = bag.stores
  const discount = discountPct(bag.price, bag.retail_min)
  const isSoldOut = bag.remaining <= 0 || bag.status === 'SOLD_OUT'
  const isPenalized = (store?.rank_penalty ?? 0) > 0

  // Build emoji string from example dishes or default
  const emojis = bag.example_dishes?.length
    ? bag.example_dishes.map((d) => d.emoji || '🍱').slice(0, 4).join(' ')
    : '🍱 🥪 🥐'

  return (
    <Link
      to={`/bag/${bag.id}`}
      className={`group block overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-md ${
        isSoldOut ? 'opacity-70 grayscale-[30%]' : ''
      }`}
    >
      {/* Visual Header with Gradient & Emojis */}
      <div
        className={`relative flex h-32 w-full flex-col items-center justify-center bg-gradient-to-br ${storeGradient(
          store?.name || 'RescueBite'
        )} p-4 text-center transition-transform group-hover:scale-[1.01]`}
      >
        <span className="text-4xl drop-shadow-md select-none">{emojis}</span>
        <span className="mt-1 rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {bag.category}
        </span>

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 rounded-xl bg-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            -{discount}%
          </div>
        )}

        {/* Status / Stock Badge */}
        <div className="absolute top-3 right-3">
          {isSoldOut ? (
            <span className="rounded-xl bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-white">
              Hết túi
            </span>
          ) : (
            <span className="rounded-xl bg-emerald-600/90 px-2.5 py-0.5 text-xs font-semibold text-white">
              Còn {bag.remaining} túi
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Store Name & District */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-green-700 transition-colors">
              {store?.name || 'Cửa hàng'}
            </h3>
            <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{store?.district || 'Hồ Chí Minh'}</span>
            </p>
          </div>
          {isPenalized && (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
              Đang cải thiện
            </span>
          )}
        </div>

        {/* Pickup Time Window */}
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5">
          <Clock className="h-3.5 w-3.5 text-green-600 shrink-0" />
          <span>Nhận: {formatPickupWindow(bag.pickup_start, bag.pickup_end)}</span>
        </div>

        {/* Price & Retail Estimate */}
        <div className="mt-3 flex items-baseline justify-between border-t pt-2.5">
          <div>
            <span className="text-base font-bold text-green-700">{formatVND(bag.price)}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 line-through">
              ~{formatVND(bag.retail_min)} - {formatVND(bag.retail_max)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
