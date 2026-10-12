import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { TrendingUp, RefreshCw, AlertOctagon, Lightbulb, CheckCircle2, HelpCircle, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ServqualGap } from '@/types/database.types'

export default function ServqualDashboardPage() {
  const [gaps, setGaps] = useState<ServqualGap[]>([])
  const [totalResponses, setTotalResponses] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchServqualData()
  }, [])

  async function fetchServqualData() {
    setLoading(true)
    try {
      // 1. Fetch gaps view
      const { data: gapData, error: gapErr } = await supabase
        .from('v_servqual_gaps')
        .select('*')
        .order('dim_order', { ascending: true })

      if (gapErr) throw gapErr
      setGaps((gapData || []) as ServqualGap[])

      // 2. Count survey responses
      const { count, error: countErr } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })

      if (countErr) throw countErr
      setTotalResponses(count || 0)
    } catch (err) {
      console.error('Error fetching SERVQUAL data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Find lowest gap (worst deficit)
  const sortedByGap = [...gaps].sort((a, b) => a.gap - b.gap)
  const worstGap = sortedByGap.length > 0 ? sortedByGap[0] : null

  // Chart data format
  const chartData = gaps.map((g) => ({
    dimension: g.dimension,
    'Kỳ vọng (Expectation)': Number(g.avg_expectation),
    'Cảm nhận (Perception)': Number(g.avg_perception),
    'Chênh lệch (Gap)': Number(g.gap),
  }))

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="N3 SERVQUAL – Phân tích Chất lượng Dịch vụ"
        actions={
          <button
            onClick={fetchServqualData}
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
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mô Hình 5 Chiều Chất Lượng Dịch Vụ (SERVQUAL Gaps)</h2>
              <p className="text-sm text-slate-500">
                Đo lường khoảng cách giữa Kỳ vọng trước khi đặt và Cảm nhận thực tế khi nhận túi (Thang đo Likert 1–7)
              </p>
            </div>
          </div>
          <div className="text-xs px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-600 self-start md:self-auto">
            Tổng số khảo sát thu thập: <strong>{totalResponses}</strong> lượt đánh giá
          </div>
        </div>

        {/* Worst Gap Highlight Card */}
        {worstGap && (
          <div className="bg-gradient-to-r from-rose-500 to-red-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-white/20 rounded-2xl">
                <AlertOctagon className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/25 text-white uppercase tracking-wider">
                  Điểm Nghẽn Chất Lượng Lớn Nhất
                </div>
                <h3 className="text-lg font-bold">
                  Chiều: <span className="underline decoration-white/60">{worstGap.dimension}</span> (Khoảng cách âm{' '}
                  {worstGap.gap})
                </h3>
                <p className="text-xs text-rose-100 max-w-2xl leading-relaxed">
                  Kỳ vọng trung bình của khách hàng là <strong>{worstGap.avg_expectation}/7</strong>, nhưng cảm nhận thực tế chỉ đạt <strong>{worstGap.avg_perception}/7</strong>. Đây là nguyên nhân hàng đầu dẫn đến tỷ lệ khách hàng rời bỏ hoặc yêu cầu hoàn tiền.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 bg-white/10 px-5 py-3 rounded-2xl border border-white/20">
              <span className="text-[11px] uppercase tracking-wider text-rose-200 block">Gap Score</span>
              <span className="text-3xl font-extrabold">{worstGap.gap}</span>
            </div>
          </div>
        )}

        {/* Chart Comparison */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              So Sánh Kỳ Vọng (Expectation) vs Cảm Nhận (Perception)
            </h3>
            <span className="text-xs text-slate-400">Thang điểm 1 (Rất kém) → 7 (Rất hài lòng)</span>
          </div>

          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} />
                <YAxis domain={[0, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} / 7`, name]}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="Kỳ vọng (Expectation)" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Cảm nhận (Perception)" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gap Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Bảng Tổng Hợp Chi Tiết Khoảng Cách (SERVQUAL Gap Table)</h3>
            <span className="text-xs text-slate-500">Công thức: Gap = Perception - Expectation</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">STT</th>
                  <th className="px-6 py-3.5">Chiều chất lượng (Dimension)</th>
                  <th className="px-4 py-3.5 text-center">Kỳ vọng trung bình</th>
                  <th className="px-4 py-3.5 text-center">Cảm nhận thực tế</th>
                  <th className="px-4 py-3.5 text-center">Khoảng cách (Gap)</th>
                  <th className="px-6 py-3.5 text-right">Đánh giá trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Đang tải kết quả SERVQUAL...
                    </td>
                  </tr>
                ) : gaps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Chưa có dữ liệu khảo sát nào.
                    </td>
                  </tr>
                ) : (
                  gaps.map((g, idx) => {
                    const isWorst = worstGap?.dimension === g.dimension
                    const isNegative = g.gap < 0
                    return (
                      <tr
                        key={g.dimension}
                        className={`transition-colors ${isWorst ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            {g.dimension}
                            {isWorst && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Cần khắc phục gấp
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-600">{g.avg_expectation}</td>
                        <td className="px-4 py-4 text-center font-bold text-indigo-700">{g.avg_perception}</td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${
                              g.gap < -0.5
                                ? 'bg-rose-100 text-rose-800'
                                : isNegative
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {g.gap > 0 ? `+${g.gap}` : g.gap}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              g.gap >= 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : g.gap >= -0.5
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {g.gap >= 0 ? 'Vượt kỳ vọng' : g.gap >= -0.5 ? 'Chấp nhận được' : 'Không đạt kỳ vọng'}
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

        {/* SERVQUAL Gap 5 Diagnostic & Operational Guide */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Lý Thuyết Vận Hành: Giải Pháp Thu Hẹp Khoảng Cách SERVQUAL Gap 5
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">1. Tại sao "Độ tin cậy" (Reliability) thường có khoảng cách âm?</h4>
              <p>
                Trong mô hình túi thực phẩm bất ngờ (Surprise Bag), người mua thường có tâm lý so sánh định giá niêm yết với các món nhận được. Khi quán đối tác đóng gói không đều tay, giao thiếu món kèm, hoặc quán đóng cửa sớm hơn giờ hẹn, cảm nhận về độ tin cậy lập tức suy giảm mạnh.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">2. Khuyến nghị hành động dành cho Đội ngũ Quản trị & CRM</h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                <li>
                  <strong className="text-white">Chuẩn hóa giá trị tối thiểu:</strong> Yêu cầu tổng giá trị thực phẩm trong túi luôn đạt ít nhất 3x giá bán ưu đãi.
                </li>
                <li>
                  <strong className="text-white">Chế tài trừ điểm thứ hạng:</strong> Tự động tăng <code>rank_penalty</code> với các quán có khiếu nại "không đúng mô tả".
                </li>
                <li>
                  <strong className="text-white">Kiểm soát khung giờ đón:</strong> Nhắc nhở quán bật tính năng cảnh báo nếu hết túi sớm để khách không đến lỡ hẹn.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
