import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Receipt,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useMyStore } from '@/hooks/useMyStore'
import { Button } from '@/components/ui/button'
import { LoadingPage, EmptyState } from '@/components/shared'
import { formatVND, formatDateTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function StoreRevenuePage() {
  const navigate = useNavigate()
  const { store, loading: storeLoading } = useMyStore()

  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  const [dailyData, setDailyData] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!store?.id) return
    fetchRevenueData()
  }, [store?.id, timeRange])

  async function fetchRevenueData() {
    if (!store?.id) return
    setLoading(true)
    try {
      const days = timeRange === '7d' ? 7 : 30
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - days)
      sinceDate.setHours(0, 0, 0, 0)

      // Fetch completed orders for this store
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id, total_price, created_at, status,
          bags!inner(id, store_id)
        `)
        .eq('bags.store_id', store.id)
        .eq('status', 'PICKED_UP')
        .gte('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: true })

      // Aggregate revenue by date
      const dateMap: Record<string, { gross: number; net: number; count: number }> = {}

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateKey = `${d.getDate()}/${d.getMonth() + 1}`
        dateMap[dateKey] = { gross: 0, net: 0, count: 0 }
      }

      if (orders) {
        orders.forEach((ord) => {
          const d = new Date(ord.created_at)
          const dateKey = `${d.getDate()}/${d.getMonth() + 1}`
          if (dateMap[dateKey]) {
            dateMap[dateKey].gross += ord.total_price
            dateMap[dateKey].net += Math.round(ord.total_price * 0.85) // 85% after 15% platform commission
            dateMap[dateKey].count += 1
          }
        })
      }

      const chartData = Object.entries(dateMap).map(([date, val]) => ({
        date,
        'Doanh thu gộp': val.gross,
        'Thực nhận (85%)': val.net,
        donHang: val.count,
      }))

      setDailyData(chartData)

      // Fetch payouts history
      const { data: payoutList } = await supabase
        .from('store_payouts')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })

      setPayouts(payoutList || [])
    } finally {
      setLoading(false)
    }
  }

  if (storeLoading || loading) return <LoadingPage />

  if (!store) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="🏪"
          title="Bạn chưa có cửa hàng"
          description="Vui lòng đăng ký đối tác để xem báo cáo doanh thu."
          action={<Button onClick={() => navigate('/store/apply')} variant="brand">Đăng ký mở quán</Button>}
        />
      </div>
    )
  }

  const totalGross = dailyData.reduce((acc, curr) => acc + curr['Doanh thu gộp'], 0)
  const totalNet = dailyData.reduce((acc, curr) => acc + curr['Thực nhận (85%)'], 0)
  const totalCommission = totalGross - totalNet

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/store/dashboard')}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Doanh thu & Quyết toán</h1>
            <p className="text-xs text-slate-500">{store.name} • Chiết khấu nền tảng 15%</p>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs">
          <button
            onClick={() => setTimeRange('7d')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              timeRange === '7d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            7 ngày
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              timeRange === '30d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            30 ngày
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-3.5 shadow-sm space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Doanh thu gộp</p>
          <p className="text-lg font-bold text-slate-900 truncate">{formatVND(totalGross)}</p>
          <p className="text-[10px] text-slate-400">Tổng tiền bán túi</p>
        </div>

        <div className="rounded-2xl border bg-white p-3.5 shadow-sm space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Phí sàn (15%)</p>
          <p className="text-lg font-bold text-orange-600 truncate">{formatVND(totalCommission)}</p>
          <p className="text-[10px] text-slate-400">Vận hành nền tảng</p>
        </div>

        <div className="rounded-2xl border bg-white p-3.5 shadow-sm space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Thực nhận của quán</p>
          <p className="text-lg font-bold text-green-700 truncate">{formatVND(totalNet)}</p>
          <p className="text-[10px] text-slate-400">85% chuyển khoản</p>
        </div>
      </div>

      {/* Recharts Daily Bar Chart */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-green-700" />
            Biểu đồ doanh thu hàng ngày ({timeRange === '7d' ? '7 ngày qua' : '30 ngày qua'})
          </h2>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val / 1000}k`}
              />
              <Tooltip
                formatter={(value: any) => [`${formatVND(Number(value))}`, '']}
                labelFormatter={(label) => `Ngày ${label}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="Doanh thu gộp" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Thực nhận (85%)" fill="#15803d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 pt-1 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-slate-300" />
            <span>Doanh thu gộp</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-green-700" />
            <span>Thực nhận (85%)</span>
          </div>
        </div>
      </div>

      {/* Payout Table */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-slate-500" />
            Lịch sử kỳ quyết toán
          </h2>
        </div>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 p-6 text-center text-xs text-slate-400">
            Chưa có đợt quyết toán nào được ghi nhận. Quyết toán được thực hiện định kỳ theo chu kỳ tuần/tháng.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-800">
                    Kỳ: {p.period_start} – {p.period_end}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Gộp: {formatVND(p.gross)} • Hoa hồng: {formatVND(p.commission)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700">{formatVND(p.net)}</p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      p.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : p.status === 'disputed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {p.status === 'paid' ? 'Đã chi trả' : p.status === 'disputed' ? 'Khiếu nại' : 'Chờ chuyển'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
