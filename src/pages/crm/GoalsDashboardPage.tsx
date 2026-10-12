import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { Target, RefreshCw, CheckCircle2, TrendingUp, Sparkles, DollarSign, Package, Leaf, Store, Users, Edit3, Save, X } from 'lucide-react'
import type { GoalKpi, GoalTarget } from '@/types/database.types'

const METRIC_LABELS: Record<string, { title: string; desc: string; icon: any; isLowerBetter?: boolean }> = {
  sell_through_rate: {
    title: 'Tỷ Lệ Bán Hết (Sell-Through Rate)',
    desc: 'Số túi đã được đặt chia cho tổng số lượng túi đăng bán',
    icon: Package,
  },
  pickup_completion_rate: {
    title: 'Tỷ Lệ Nhận Túi Thành Công',
    desc: 'Tỷ lệ khách đến nhận túi đúng giờ trên tổng số đơn đã thanh toán',
    icon: CheckCircle2,
  },
  active_partner_rate: {
    title: 'Tỷ Lệ Quán Hoạt Động',
    desc: 'Tỷ lệ quán đã duyệt có đăng bán túi trong 7 ngày gần nhất',
    icon: Store,
  },
  average_rating: {
    title: 'Điểm Đánh Giá Trung Bình',
    desc: 'Điểm hài lòng trung bình của khách hàng sau khi nhận túi (1–5 sao)',
    icon: Sparkles,
  },
  complaint_rate: {
    title: 'Tỷ Lệ Khiếu Nại (Complaint Rate)',
    desc: 'Tỷ lệ đơn phát sinh ticket khiếu nại (Chỉ số càng thấp càng tốt)',
    icon: TrendingUp,
    isLowerBetter: true,
  },
  repeat_purchase_30d: {
    title: 'Tỷ Lệ Mua Lại Trong 30 Ngày',
    desc: 'Tỷ lệ khách hàng đặt từ 2 đơn trở lên trong vòng 1 tháng qua',
    icon: Users,
  },
  bags_rescued: {
    title: 'Tổng Số Túi Thực Phẩm Giải Cứu',
    desc: 'Tổng số phần ăn bất ngờ đã được người mua nhận thành công',
    icon: Package,
  },
  co2e_avoided_kg: {
    title: 'Khí Thải CO2e Đã Giảm Giảm Thiểu (kg)',
    desc: 'Quy đổi 2.7 kg CO2e tránh phát thải cho mỗi túi thực phẩm cứu trợ',
    icon: Leaf,
  },
  fee_revenue_vnd: {
    title: 'Doanh Thu Phí Sàn Thu Nhận (VNĐ)',
    desc: 'Doanh thu hoa hồng 15% nền tảng thu được từ các đơn hoàn tất',
    icon: DollarSign,
  },
}

export default function GoalsDashboardPage() {
  const [kpis, setKpis] = useState<GoalKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMetric, setEditingMetric] = useState<string | null>(null)
  const [tempTarget, setTempTarget] = useState<number>(0)
  const [savingTarget, setSavingTarget] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Macro Platform Overview
  const [macroStats, setMacroStats] = useState({
    gmv: 0,
    bagsRescued: 0,
    co2eAvoided: 0,
    activeStores: 0,
    activeUsers: 0,
  })

  useEffect(() => {
    fetchGoalsAndMacro()
  }, [])

  async function fetchGoalsAndMacro() {
    setLoading(true)
    setFeedback(null)
    try {
      // 1. Fetch KPI view
      const { data: kpiData, error: kpiErr } = await supabase.from('v_goal_kpis').select('*')
      if (kpiErr) throw kpiErr
      setKpis((kpiData || []) as GoalKpi[])

      // 2. Fetch GMV from orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_price, buyer_id')
        .eq('status', 'PICKED_UP')

      const gmv = (ordersData || []).reduce((sum, o) => sum + (o.total_price || 0), 0)
      const bagsRescued = ordersData?.length || 0
      const co2eAvoided = Math.round(bagsRescued * 2.7)
      const uniqueBuyers = new Set(ordersData?.map((o) => o.buyer_id)).size

      // 3. Count active stores
      const { count: storeCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      setMacroStats({
        gmv,
        bagsRescued,
        co2eAvoided,
        activeStores: storeCount || 0,
        activeUsers: uniqueBuyers,
      })
    } catch (err) {
      console.error('Error fetching goals data:', err)
      setFeedback({ text: 'Lỗi tải mục tiêu KPI.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTarget(metric: string) {
    setSavingTarget(true)
    setFeedback(null)
    try {
      const { error } = await supabase
        .from('goals_targets')
        .update({ target: tempTarget, updated_at: new Date().toISOString() })
        .eq('metric', metric)

      if (error) throw error

      setFeedback({ text: `Đã cập nhật mục tiêu mới cho chỉ số "${metric}".`, type: 'success' })
      setEditingMetric(null)
      await fetchGoalsAndMacro()
    } catch (err) {
      console.error('Error saving target:', err)
      setFeedback({ text: err instanceof Error ? err.message : 'Lỗi cập nhật mục tiêu.', type: 'error' })
    } finally {
      setSavingTarget(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="N6 Phân tích Nền tảng & Mục tiêu KPI"
        actions={
          <button
            onClick={fetchGoalsAndMacro}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border rounded-xl hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tổng Quan Phân Tích Nền Tảng & Mục Tiêu KPI</h2>
              <p className="text-sm text-slate-500">
                Theo dõi hiệu suất vận hành sàn (Platform Health Metrics) và tiến độ hoàn thành các mục tiêu chiến lược
              </p>
            </div>
          </div>
          <div className="text-xs px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-600 self-start md:self-auto">
            Tổng cộng: <strong>{kpis.length}</strong> chỉ số đo lường
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {feedback.text}
          </div>
        )}

        {/* 1. Macro Platform Overview Section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Chỉ Số Vĩ Mô Toàn Sàn (Gross Platform Analytics)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* GMV */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
                <span>GMV (Tổng giá trị GD)</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="text-xl font-extrabold mt-2">{macroStats.gmv.toLocaleString('vi-VN')} đ</p>
              <p className="text-[11px] text-emerald-100 mt-1">Đơn hàng hoàn tất</p>
            </div>

            {/* Bags Rescued */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
                <span>Thực phẩm giải cứu</span>
                <Package className="w-4 h-4" />
              </div>
              <p className="text-xl font-extrabold mt-2">{macroStats.bagsRescued.toLocaleString()} túi</p>
              <p className="text-[11px] text-amber-100 mt-1">Tránh bị vứt bỏ</p>
            </div>

            {/* CO2e Avoided */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-800 text-white p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
                <span>CO2e giảm thải</span>
                <Leaf className="w-4 h-4" />
              </div>
              <p className="text-xl font-extrabold mt-2">{macroStats.co2eAvoided.toLocaleString()} kg</p>
              <p className="text-[11px] text-green-100 mt-1">Tác động môi trường</p>
            </div>

            {/* Active Stores */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
                <span>Quán đối tác hoạt động</span>
                <Store className="w-4 h-4" />
              </div>
              <p className="text-xl font-extrabold mt-2">{macroStats.activeStores} quán</p>
              <p className="text-[11px] text-blue-100 mt-1">Đã phê duyệt</p>
            </div>

            {/* Active Users */}
            <div className="bg-gradient-to-br from-purple-600 to-violet-800 text-white p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
                <span>Người mua tích cực</span>
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xl font-extrabold mt-2">{macroStats.activeUsers} khách</p>
              <p className="text-[11px] text-purple-100 mt-1">Đã hoàn thành nhận túi</p>
            </div>
          </div>
        </div>

        {/* 2. Strategic KPI Cards with Progress Bars and Inline Edit */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chi Tiết Tiến Độ Hoàn Thành Mục Tiêu (KPIs vs Targets)
            </h3>
            <span className="text-xs text-slate-400">Nhấp vào biểu tượng bút để chỉnh sửa chỉ tiêu mục tiêu</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((k) => {
              const config = METRIC_LABELS[k.metric] || {
                title: k.metric,
                desc: 'Chỉ số đo lường',
                icon: Target,
              }
              const Icon = config.icon
              const isLowerBetter = config.isLowerBetter ?? false

              // Progress computation
              const progressPct =
                k.target > 0
                  ? isLowerBetter
                    ? Math.max(0, Math.min(100, (1 - (k.current_value - k.target) / k.target) * 100))
                    : Math.min(100, Math.max(0, (k.current_value / k.target) * 100))
                  : 0

              const isSuccess = isLowerBetter ? k.current_value <= k.target : k.current_value >= k.target
              const isEditing = editingMetric === k.metric

              return (
                <div key={k.metric} className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{config.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{config.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMetric(k.metric)
                        setTempTarget(k.target)
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Sửa mục tiêu"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Value vs Target */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900">
                        {typeof k.current_value === 'number'
                          ? k.unit === 'VNĐ'
                            ? k.current_value.toLocaleString('vi-VN')
                            : k.current_value
                          : k.current_value}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 ml-1">{k.unit}</span>
                    </div>

                    <div className="text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempTarget}
                            onChange={(e) => setTempTarget(Number(e.target.value))}
                            className="w-20 px-2 py-0.5 border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => handleSaveTarget(k.metric)}
                            disabled={savingTarget}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            title="Lưu"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingMetric(null)}
                            className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                            title="Hủy"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Mục tiêu:{' '}
                          <strong className="text-slate-700">
                            {k.unit === 'VNĐ' ? k.target.toLocaleString('vi-VN') : k.target} {k.unit}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSuccess ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={isSuccess ? 'text-emerald-700 font-bold' : 'text-amber-700 font-medium'}>
                        {isSuccess ? '✓ Đạt chỉ tiêu' : 'Chưa đạt chỉ tiêu'}
                      </span>
                      <span className="font-mono text-slate-400">{progressPct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
