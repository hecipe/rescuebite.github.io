import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { CustomerDetailDrawer } from '@/components/crm/CustomerDetailDrawer'
import { Users, Search, Download, RefreshCw, ChevronRight, UserPlus, Heart, Activity, AlertTriangle, UserMinus } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { BuyerSegment } from '@/types/database.types'

const SEGMENT_COLORS: Record<string, string> = {
  Mới: '#3b82f6', // blue
  'Thân thiết': '#10b981', // emerald
  'Đang hoạt động': '#06b6d4', // cyan
  'Có nguy cơ rời bỏ': '#f59e0b', // amber
  'Đã rời bỏ': '#ef4444', // rose
}

const SEGMENT_ICONS: Record<string, any> = {
  Mới: UserPlus,
  'Thân thiết': Heart,
  'Đang hoạt động': Activity,
  'Có nguy cơ rời bỏ': AlertTriangle,
  'Đã rời bỏ': UserMinus,
}

export default function Customer360Page() {
  const [buyers, setBuyers] = useState<BuyerSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSegment, setSelectedSegment] = useState<string>('all')
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerSegment | null>(null)

  useEffect(() => {
    fetchBuyerSegments()
  }, [])

  async function fetchBuyerSegments() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('v_buyer_segments').select('*')
      if (error) throw error
      setBuyers((data || []) as BuyerSegment[])
    } catch (err) {
      console.error('Error fetching buyer segments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Count by segment
  const segmentCounts: Record<string, number> = {
    Mới: 0,
    'Thân thiết': 0,
    'Đang hoạt động': 0,
    'Có nguy cơ rời bỏ': 0,
    'Đã rời bỏ': 0,
  }

  buyers.forEach((b) => {
    if (segmentCounts[b.segment] !== undefined) {
      segmentCounts[b.segment]++
    }
  })

  const chartData = Object.entries(segmentCounts).map(([name, value]) => ({
    name,
    value,
    color: SEGMENT_COLORS[name] || '#94a3b8',
  }))

  const filteredBuyers = buyers.filter((b) => {
    const matchesSearch = b.full_name.toLowerCase().includes(search.toLowerCase())
    if (selectedSegment === 'all') return matchesSearch
    return matchesSearch && b.segment === selectedSegment
  })

  function handleExportCsv() {
    if (filteredBuyers.length === 0) return
    const headers = ['Mã khách hàng', 'Họ và tên', 'Phân khúc', 'Số lần nhận túi', 'Đơn đầu tiên', 'Đơn gần nhất']
    const rows = filteredBuyers.map((b) => [
      b.buyer_id,
      `"${b.full_name}"`,
      b.segment,
      b.total_pickups,
      b.first_order_at ? new Date(b.first_order_at).toLocaleDateString('vi-VN') : '',
      b.last_order_at ? new Date(b.last_order_at).toLocaleDateString('vi-VN') : '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RescueBite_KhachHang_${selectedSegment}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="N1 Phân tích Khách hàng 360"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filteredBuyers.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 shadow-sm disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất CSV
            </button>
            <button
              onClick={fetchBuyerSegments}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border rounded-xl hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Phân Khúc & Chân Dung Khách Hàng (Customer 360)</h2>
              <p className="text-sm text-slate-500">
                Theo dõi tần suất đặt hàng, phân nhóm người mua và gửi thông điệp chăm sóc tái kích hoạt (Re-engagement)
              </p>
            </div>
          </div>
          <div className="text-xs px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-600 self-start md:self-auto">
            Tổng người mua có phát sinh đơn: <strong>{buyers.length}</strong>
          </div>
        </div>

        {/* Analytics & Segment Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Segment Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(segmentCounts).map(([seg, count]) => {
              const Icon = SEGMENT_ICONS[seg] || Users
              const color = SEGMENT_COLORS[seg] || '#10b981'
              const isSelected = selectedSegment === seg
              return (
                <button
                  key={seg}
                  onClick={() => setSelectedSegment(isSelected ? 'all' : seg)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md border-slate-900 scale-[1.02]'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${color}20`, color: color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">{((count / (buyers.length || 1)) * 100).toFixed(0)}%</span>
                  </div>
                  <h4 className={`text-xs font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{seg}</h4>
                  <p className="text-xl font-bold mt-0.5">{count}</p>
                </button>
              )
            })}
          </div>

          {/* Recharts Pie Chart */}
          <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 self-start">
              Tỷ Lệ Phân Nhóm Khách Hàng
            </h4>
            <div className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} khách hàng`, name]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng theo tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSegment('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedSegment === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả ({buyers.length})
            </button>
            {Object.keys(segmentCounts).map((seg) => (
              <button
                key={seg}
                onClick={() => setSelectedSegment(seg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedSegment === seg
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border text-slate-600 hover:bg-slate-100'
                }`}
              >
                {seg} ({segmentCounts[seg]})
              </button>
            ))}
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Khách hàng</th>
                  <th className="px-4 py-3.5">Phân khúc</th>
                  <th className="px-4 py-3.5 text-center">Tổng đơn đã nhận</th>
                  <th className="px-4 py-3.5">Đơn đầu tiên</th>
                  <th className="px-4 py-3.5">Đơn gần nhất</th>
                  <th className="px-6 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Đang tải danh sách phân khúc khách hàng...
                    </td>
                  </tr>
                ) : filteredBuyers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Không tìm thấy khách hàng trong phân khúc này.
                    </td>
                  </tr>
                ) : (
                  filteredBuyers.map((b) => {
                    const color = SEGMENT_COLORS[b.segment] || '#10b981'
                    return (
                      <tr
                        key={b.buyer_id}
                        onClick={() => setSelectedBuyer(b)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs"
                              style={{ backgroundColor: `${color}20`, color: color }}
                            >
                              {b.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{b.full_name}</p>
                              <p className="text-xs text-slate-400 font-mono">#{b.buyer_id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                            style={{
                              backgroundColor: `${color}15`,
                              borderColor: `${color}40`,
                              color: color,
                            }}
                          >
                            {b.segment}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-800">{b.total_pickups}</td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {b.first_order_at ? new Date(b.first_order_at).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {b.last_order_at ? new Date(b.last_order_at).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                            Xem hồ sơ 360
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer customer={selectedBuyer} onClose={() => setSelectedBuyer(null)} />
    </div>
  )
}
