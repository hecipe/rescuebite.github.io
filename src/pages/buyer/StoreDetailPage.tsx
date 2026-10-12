import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Store as StoreIcon, MapPin, Tag, Star, ArrowLeft, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Store, Bag, Review } from '@/types/database.types'
import { BagCard } from '@/components/buyer/BagCard'
import { LoadingPage, EmptyState } from '@/components/shared'
import { storeGradient } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const [store, setStore] = useState<Store | null>(null)
  const [bags, setBags] = useState<Bag[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!storeId) return
    fetchStoreData()
  }, [storeId])

  async function fetchStoreData() {
    setLoading(true)
    setError(null)
    try {
      // 1. Get store
      const { data: storeData, error: storeErr } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()

      if (storeErr) throw storeErr
      setStore(storeData as Store)

      // 2. Get active bags for this store
      const { data: bagData, error: bagErr } = await supabase
        .from('bags')
        .select('*, stores(*)')
        .eq('store_id', storeId)
        .in('status', ['OPEN', 'SOLD_OUT'])
        .order('created_at', { ascending: false })

      if (bagErr) throw bagErr
      setBags((bagData ?? []) as Bag[])

      // 3. Get recent reviews
      const { data: revData } = await supabase
        .from('reviews')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(5)

      setReviews((revData ?? []) as Review[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin quán.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingPage />
  if (error || !store) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="🏪"
          title="Không tìm thấy quán"
          description="Cửa hàng này không tồn tại hoặc đã ngừng hoạt động."
          action={
            <Button onClick={() => navigate('/discover')} variant="brand">
              Quay lại khám phá
            </Button>
          }
        />
      </div>
    )
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0'

  return (
    <div className="mx-auto max-w-2xl pb-24">
      {/* Store Header Banner */}
      <div
        className={`relative flex h-48 w-full flex-col justify-between bg-gradient-to-br ${storeGradient(
          store.name
        )} p-5 text-white`}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {store.category}
          </span>
          <h1 className="mt-2 text-2xl font-bold">{store.name}</h1>
          <p className="flex items-center gap-1 text-xs text-white/90 mt-1">
            <MapPin className="h-3.5 w-3.5" /> {store.address}, {store.district}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Highlights */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl border bg-white p-4 shadow-sm text-center">
          <div>
            <p className="text-xs text-slate-500 font-medium">Đánh giá</p>
            <p className="flex items-center justify-center gap-1 text-base font-bold text-amber-600 mt-0.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {avgRating}
            </p>
          </div>
          <div className="border-x border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Túi đang mở</p>
            <p className="text-base font-bold text-green-700 mt-0.5">
              {bags.filter((b) => b.status === 'OPEN').length} túi
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Khu vực</p>
            <p className="text-base font-bold text-slate-800 mt-0.5 truncate px-1">
              {store.district}
            </p>
          </div>
        </div>

        {/* Store Description */}
        {store.description && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Giới thiệu quán</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{store.description}</p>
          </div>
        )}

        {/* Surprise Bags List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-green-700" />
              Túi bất ngờ hôm nay ({bags.length})
            </h2>
          </div>

          {bags.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">Quán hiện chưa mở túi bất ngờ nào hôm nay.</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng quay lại vào khung giờ chiều hoặc tối nhé!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {bags.map((bag) => (
                <BagCard key={bag.id} bag={bag} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        {reviews.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-800">Đánh giá từ người mua gần đây</h2>
            <div className="space-y-2.5">
              {reviews.map((rev) => (
                <div key={rev.id} className="rounded-xl border bg-white p-3.5 shadow-sm text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500 font-semibold">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    {rev.matched_description && (
                      <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✓ Đúng cam kết
                      </span>
                    )}
                  </div>
                  {rev.comment && (
                    <p className="text-slate-700 mt-1">{rev.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
