import { useState } from 'react'
import { Filter, Search, Sparkles } from 'lucide-react'
import { useBags } from '@/hooks/useBags'
import { BagCard } from '@/components/buyer/BagCard'
import { EmptyState, BagCardSkeleton } from '@/components/shared'
import { DISTRICTS, BAG_CATEGORIES } from '@/lib/constants'

export default function DiscoverPage() {
  const [day, setDay] = useState<'today' | 'tomorrow'>('today')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { bags, loading, error, refetch } = useBags({
    day,
    district: selectedDistrict || undefined,
    category: selectedCategory || undefined,
  })

  // Filter bags client-side by store name search
  const filteredBags = bags.filter((bag) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      bag.stores?.name.toLowerCase().includes(q) ||
      bag.category.toLowerCase().includes(q) ||
      bag.stores?.district.toLowerCase().includes(q)
    )
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:py-6">
      {/* Hero Banner */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Chung tay giảm lãng phí thực phẩm</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Túi Bất Ngờ Hôm Nay 🍱
            </h1>
            <p className="mt-1 text-emerald-100 text-sm max-w-md">
              Cứu các phần ăn thơm ngon chưa bán hết với giá giảm đến 50-70% từ các tiệm bánh, nhà hàng uy tín.
            </p>
          </div>
        </div>
      </div>

      {/* Date Tabs (Hôm nay / Ngày mai) */}
      <div className="mb-4 flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setDay('today')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            day === 'today'
              ? 'bg-green-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border'
          }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setDay('tomorrow')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            day === 'tomorrow'
              ? 'bg-green-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border'
          }`}
        >
          Ngày mai
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên quán, món ăn hoặc khu vực..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* District select */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 shadow-sm"
          >
            <option value="">Tất cả quận / huyện</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Category pills */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 shadow-sm"
          >
            <option value="">Tất cả danh mục</option>
            {BAG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(selectedDistrict || selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDistrict('')
                setSelectedCategory('')
                setSearchQuery('')
              }}
              className="text-xs text-orange-600 hover:underline px-2 py-1 font-medium"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Bags Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BagCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold mb-2">Không thể tải danh sách túi</p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      ) : filteredBags.length === 0 ? (
        <EmptyState
          icon="🥡"
          title="Không tìm thấy túi phù hợp"
          description="Hiện chưa có túi nào theo bộ lọc của bạn. Hãy thử chọn quận khác hoặc quay lại vào khung giờ chiều tối nhé!"
        />
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>Tìm thấy {filteredBags.length} túi bất ngờ</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBags.map((bag) => (
              <BagCard key={bag.id} bag={bag} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
