import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/layout/TopBar'
import { Zap, Leaf, Award, Share2, CheckCircle2, ShoppingBag, ArrowRight, Sparkles, TrendingUp } from 'lucide-react'
import type { Order, Bag } from '@/types/database.types'

interface PickedUpOrder extends Order {
  bags?: Bag
}

const BADGES = [
  { id: 'b1', name: 'Tân Binh Xanh', count: 1, icon: '🌱', desc: 'Giải cứu phần ăn đầu tiên' },
  { id: 'b2', name: 'Hiệp Sĩ Ẩm Thực', count: 3, icon: '🛡️', desc: 'Đã giải cứu từ 3 túi bất ngờ' },
  { id: 'b3', name: 'Chiến Binh Môi Trường', count: 5, icon: '🌿', desc: 'Đạt mốc 5 túi thực phẩm' },
  { id: 'b4', name: 'Đại Sứ Trái Đất', count: 10, icon: '🌍', desc: 'Giải cứu hơn 10 phần ăn' },
]

export default function ImpactPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<PickedUpOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      fetchMyImpact()
    } else {
      setLoading(false)
    }
  }, [user])

  async function fetchMyImpact() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, bags(*)')
        .eq('buyer_id', user!.id)
        .eq('status', 'PICKED_UP')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders((data || []) as PickedUpOrder[])
    } catch (err) {
      console.error('Error fetching impact:', err)
    } finally {
      setLoading(false)
    }
  }

  const bagsRescued = orders.reduce((sum, o) => sum + (o.qty || 1), 0)
  const co2eAvoided = Number((bagsRescued * 2.7).toFixed(1))

  // Estimate saved money
  const totalPaid = orders.reduce((sum, o) => sum + (o.total_price || 0), 0)
  const estimatedRetail = orders.reduce((sum, o) => {
    const retailMin = o.bags?.retail_min || (o.total_price ? o.total_price * 2.5 : 100000)
    return sum + retailMin * (o.qty || 1)
  }, 0)
  const moneySaved = Math.max(0, estimatedRetail - totalPaid)

  // Equivalencies
  const treesPlanted = (co2eAvoided / 20).toFixed(1)
  const motorbikeKm = Math.round(co2eAvoided * 25)

  function handleShare() {
    const shareText = `Tôi vừa giải cứu thành công ${bagsRescued} túi thực phẩm bất ngờ và giảm thiểu ${co2eAvoided} kg CO2e cùng RescueBite! Hãy cùng chung tay giảm lãng phí thực phẩm nhé! 🌿🍱`
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <TopBar title="Tác Động Môi Trường" />

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        {/* Hero Eco Card */}
        <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 rounded-3xl p-6 text-white shadow-lg space-y-4 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10 text-[180px] select-none pointer-events-none">
            🌱
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-100">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Dấu Ấn Xanh Của Bạn
            </span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép!' : 'Chia sẻ'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl">
              <span className="text-[11px] text-emerald-200 block uppercase font-bold tracking-wider">Túi giải cứu</span>
              <span className="text-2xl sm:text-3xl font-black mt-1 block">{bagsRescued}</span>
              <span className="text-[10px] text-emerald-300">phần ăn</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl">
              <span className="text-[11px] text-emerald-200 block uppercase font-bold tracking-wider">CO2e giảm thải</span>
              <span className="text-2xl sm:text-3xl font-black mt-1 block">{co2eAvoided}</span>
              <span className="text-[10px] text-emerald-300">kg CO2</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl">
              <span className="text-[11px] text-emerald-200 block uppercase font-bold tracking-wider">Tiết kiệm được</span>
              <span className="text-xl sm:text-2xl font-black mt-1 block truncate">
                {(moneySaved / 1000).toFixed(0)}k
              </span>
              <span className="text-[10px] text-emerald-300">VNĐ</span>
            </div>
          </div>
        </div>

        {/* Fun Eco Equivalencies */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-emerald-600" />
            Tương Đương Với Những Hành Động Xanh
          </h3>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <span className="text-3xl">🌳</span>
              <div>
                <p className="text-lg font-extrabold text-emerald-900">{treesPlanted}</p>
                <p className="text-[11px] text-emerald-700 leading-tight">Cây xanh hấp thụ CO2 trong 1 năm</p>
              </div>
            </div>

            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 flex items-center gap-3">
              <span className="text-3xl">🛵</span>
              <div>
                <p className="text-lg font-extrabold text-teal-900">{motorbikeKm} km</p>
                <p className="text-[11px] text-teal-700 leading-tight">Quãng đường xe máy không thải khí độc</p>
              </div>
            </div>
          </div>
        </div>

        {/* Badges and Milestones */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Huy Hiệu & Cột Mốc Danh Dự
            </h3>
            <span className="text-xs font-bold text-emerald-700">
              {BADGES.filter((b) => bagsRescued >= b.count).length}/{BADGES.length} đã mở khóa
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BADGES.map((b) => {
              const isUnlocked = bagsRescued >= b.count
              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    isUnlocked
                      ? 'bg-amber-50/60 border-amber-200 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <span className={`text-3xl block mb-1 ${!isUnlocked && 'grayscale'}`}>{b.icon}</span>
                  <h4 className="text-xs font-bold leading-tight">{b.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-1">{b.desc}</p>
                  <span
                    className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isUnlocked ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isUnlocked ? 'Đã đạt' : `Cần ${b.count} túi`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Call to action */}
        <div className="bg-slate-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800">Tiếp tục hành trình xanh hôm nay!</h4>
            <p className="text-xs text-slate-500">Mỗi túi thực phẩm bạn cứu là một hành động bảo vệ trái đất.</p>
          </div>
          <Link
            to="/discover"
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors shrink-0 flex items-center gap-1"
          >
            Đặt túi ngay
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
