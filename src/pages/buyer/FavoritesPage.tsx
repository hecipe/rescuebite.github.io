import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/layout/TopBar'
import { Heart, Store, Package, MapPin, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react'
import type { Favorite, Store as StoreType, Bag } from '@/types/database.types'

interface FavoriteWithStore extends Favorite {
  stores: StoreType & {
    bags: Bag[]
  }
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteWithStore[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchFavorites()
    } else {
      setLoading(false)
    }
  }, [user])

  async function fetchFavorites() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, stores(*, bags(*))')
        .eq('buyer_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFavorites((data || []) as FavoriteWithStore[])
    } catch (err) {
      console.error('Error fetching favorites:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveFavorite(favoriteId: string, storeId: string) {
    setRemovingId(storeId)
    try {
      const { error } = await supabase.from('favorites').delete().eq('id', favoriteId)
      if (error) throw error
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
    } catch (err) {
      console.error('Error removing favorite:', err)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <TopBar title="Cửa Hàng Yêu Thích" />

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Heart className="w-5 h-5 fill-white" />
              Quán Yêu Thích Của Bạn
            </h2>
            <p className="text-xs text-rose-100">
              Nhận thông báo ngay khi các quán này đăng túi thực phẩm bất ngờ mới!
            </p>
          </div>
          <span className="text-2xl font-black bg-white/20 px-3 py-1 rounded-xl">{favorites.length}</span>
        </div>

        {/* List of favorites */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Đang tải danh sách quán yêu thích...</div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800">Chưa có quán yêu thích nào</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Hãy bấm vào biểu tượng trái tim ở trang chi tiết quán để lưu lại những địa điểm bạn yêu thích nhé!
            </p>
            <Link
              to="/discover"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors"
            >
              Khám phá món ngon ngay
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => {
              const store = fav.stores
              if (!store) return null

              const activeBags = (store.bags || []).filter((b) => b.status === 'OPEN')

              return (
                <div key={fav.id} className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <Link to={`/store/${store.id}`} className="flex items-center gap-3 group flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                        🏪
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-sm sm:text-base">
                          {store.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {store.district} • {store.category}
                        </p>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleRemoveFavorite(fav.id, store.id)}
                      disabled={removingId === store.id}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                      title="Bỏ yêu thích"
                    >
                      <Heart className="w-5 h-5 fill-rose-500" />
                    </button>
                  </div>

                  {/* Active Bags from this Store */}
                  {activeBags.length > 0 ? (
                    <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100 space-y-2">
                      <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          Đang có {activeBags.length} túi bất ngờ mở bán!
                        </span>
                        <Link
                          to={`/store/${store.id}`}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5"
                        >
                          Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="space-y-1.5">
                        {activeBags.map((b) => (
                          <div
                            key={b.id}
                            className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">{b.category}</span>
                              <p className="text-[11px] text-slate-500">Còn lại: {b.remaining} túi</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-emerald-700">{b.price.toLocaleString('vi-VN')} đ</span>
                              <Link
                                to={`/bag/${b.id}`}
                                className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-800"
                              >
                                Đặt
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-xl text-center">
                      Hiện quán chưa có túi mở bán hôm nay. Bạn sẽ nhận thông báo khi quán đăng túi mới!
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
