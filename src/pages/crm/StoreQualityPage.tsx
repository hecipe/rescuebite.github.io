import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { rpcUpdateStoreRankPenalties, rpcLogDecision } from '@/lib/rpc'
import { Star, AlertTriangle, ShieldAlert, CheckCircle2, Search, RefreshCw, ArrowDownRight, Award, Zap } from 'lucide-react'
import type { StoreQuality } from '@/types/database.types'

export default function StoreQualityPage() {
  const [stores, setStores] = useState<StoreQuality[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [syncing, setSyncing] = useState(false)
  const [selectedStore, setSelectedStore] = useState<StoreQuality | null>(null)
  const [penaltyPoints, setPenaltyPoints] = useState(10)
  const [penaltyReason, setPenaltyReason] = useState('')
  const [submittingPenalty, setSubmittingPenalty] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchStoreQuality()
  }, [])

  async function fetchStoreQuality() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('v_store_quality')
        .select('*')
        .order('quality_score', { ascending: false })

      if (error) throw error
      setStores((data || []) as StoreQuality[])
    } catch (err) {
      console.error('Error fetching store quality:', err)
      setFeedback({ text: 'Lỗi tải dữ liệu chất lượng cửa hàng.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleAutoSyncPenalties() {
    setSyncing(true)
    setFeedback(null)
    try {
      await rpcUpdateStoreRankPenalties()
      setFeedback({
        text: 'Đã tự động đồng bộ điểm phạt thứ hạng (rank_penalty) theo điểm chất lượng thành công!',
        type: 'success',
      })
      await fetchStoreQuality()
    } catch (err) {
      console.error('Error syncing penalties:', err)
      setFeedback({ text: err instanceof Error ? err.message : 'Lỗi đồng bộ điểm phạt.', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleApplyPenalty() {
    if (!selectedStore) return
    setSubmittingPenalty(true)
    setFeedback(null)
    try {
      const newPenalty = (selectedStore.rank_penalty || 0) + penaltyPoints
      // 1. Update store rank_penalty
      const { error: storeErr } = await supabase
        .from('stores')
        .update({ rank_penalty: newPenalty })
        .eq('id', selectedStore.store_id)

      if (storeErr) throw storeErr

      // 2. Log decision
      try {
        await rpcLogDecision(
          'stores',
          selectedStore.store_id,
          `Phạt +${penaltyPoints} điểm thứ hạng (Tổng: ${newPenalty})`,
          penaltyReason || 'Cảnh cáo vi phạm chất lượng phục vụ'
        )
      } catch (logErr) {
        console.warn('Could not log decision:', logErr)
      }

      setFeedback({
        text: `Đã áp dụng phạt +${penaltyPoints} điểm thứ hạng cho "${selectedStore.store_name}". Điểm phạt mới: ${newPenalty}.`,
        type: 'success',
      })
      setSelectedStore(null)
      setPenaltyReason('')
      await fetchStoreQuality()
    } catch (err) {
      console.error('Error applying penalty:', err)
      setFeedback({ text: err instanceof Error ? err.message : 'Lỗi áp dụng phạt điểm.', type: 'error' })
    } finally {
      setSubmittingPenalty(false)
    }
  }

  const goodCount = stores.filter((s) => s.quality_status === 'Tốt').length
  const warnCount = stores.filter((s) => s.quality_status === 'Cần nhắc nhở').length
  const badCount = stores.filter((s) => s.quality_status === 'Giảm ưu tiên hiển thị').length

  const filteredStores = stores.filter((s) => {
    const matchesSearch =
      s.store_name.toLowerCase().includes(search.toLowerCase()) ||
      s.district.toLowerCase().includes(search.toLowerCase())

    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && s.quality_status === statusFilter
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="N4 Đánh giá & Giám sát Chất lượng Cửa hàng"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSyncPenalties}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 shadow-sm disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Đang đồng bộ...' : 'Tự động tính điểm phạt'}
            </button>
            <button
              onClick={fetchStoreQuality}
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
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bảng Xếp Hạng & Chỉ Số Chất Lượng Quán Đối Tác</h2>
              <p className="text-sm text-slate-500">
                Tính toán theo công thức: 50% Điểm đánh giá sao + 30% Tỷ lệ không khiếu nại + 20% Tỷ lệ đúng mô tả
              </p>
            </div>
          </div>
          <div className="text-xs px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-600 self-start md:self-auto">
            Tổng số: <strong>{stores.length}</strong> đối tác đang hoạt động
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            {feedback.text}
          </div>
        )}

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setStatusFilter(statusFilter === 'Tốt' ? 'all' : 'Tốt')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              statusFilter === 'Tốt' ? 'bg-emerald-700 text-white shadow-md' : 'bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${statusFilter === 'Tốt' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Trạng thái: Tốt (≥ 70 điểm)
              </span>
              <Award className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{goodCount} quán</p>
            <p className={`text-xs mt-1 ${statusFilter === 'Tốt' ? 'text-emerald-200' : 'text-slate-400'}`}>
              Hiển thị bình thường ở đầu danh sách
            </p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'Cần nhắc nhở' ? 'all' : 'Cần nhắc nhở')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              statusFilter === 'Cần nhắc nhở' ? 'bg-amber-600 text-white shadow-md' : 'bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${statusFilter === 'Cần nhắc nhở' ? 'text-amber-100' : 'text-slate-500'}`}>
                Cần nhắc nhở (55 – 69 điểm)
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{warnCount} quán</p>
            <p className={`text-xs mt-1 ${statusFilter === 'Cần nhắc nhở' ? 'text-amber-200' : 'text-slate-400'}`}>
              Cần liên hệ hỗ trợ nâng cao chất lượng
            </p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'Giảm ưu tiên hiển thị' ? 'all' : 'Giảm ưu tiên hiển thị')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              statusFilter === 'Giảm ưu tiên hiển thị' ? 'bg-rose-700 text-white shadow-md' : 'bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${statusFilter === 'Giảm ưu tiên hiển thị' ? 'text-rose-100' : 'text-slate-500'}`}>
                Giảm ưu tiên hiển thị (&lt; 55 điểm)
              </span>
              <ArrowDownRight className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{badCount} quán</p>
            <p className={`text-xs mt-1 ${statusFilter === 'Giảm ưu tiên hiển thị' ? 'text-rose-200' : 'text-slate-400'}`}>
              Đẩy xuống cuối kết quả tìm kiếm
            </p>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm quán đối tác theo tên hoặc quận..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Quality Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Quán đối tác</th>
                  <th className="px-4 py-3.5">Khu vực</th>
                  <th className="px-4 py-3.5 text-center">Đánh giá sao</th>
                  <th className="px-4 py-3.5 text-center">Đơn đã giao</th>
                  <th className="px-4 py-3.5 text-center">Khiếu nại</th>
                  <th className="px-4 py-3.5 text-center">Đúng mô tả</th>
                  <th className="px-4 py-3.5 text-center">Điểm chất lượng</th>
                  <th className="px-4 py-3.5 text-center">Điểm phạt thứ hạng</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      Đang tải bảng điểm chất lượng cửa hàng...
                    </td>
                  </tr>
                ) : filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      Không tìm thấy quán nào trong danh sách.
                    </td>
                  </tr>
                ) : (
                  filteredStores.map((s) => {
                    const isGood = s.quality_status === 'Tốt'
                    const isWarn = s.quality_status === 'Cần nhắc nhở'
                    const statusColor = isGood
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : isWarn
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'

                    const matchedPct =
                      s.review_count > 0 ? ((s.matched_count / s.review_count) * 100).toFixed(0) : '100'

                    return (
                      <tr key={s.store_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <div>
                            {s.store_name}
                            <span
                              className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}
                            >
                              {s.quality_status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600 text-xs">{s.district}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {s.avg_rating > 0 ? s.avg_rating.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-xs">{s.pickup_count}</td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`font-mono text-xs font-bold ${
                              s.complaint_count > 0 ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            {s.complaint_count}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-xs">{matchedPct}%</td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-extrabold text-slate-900 text-sm">{s.quality_score}</span>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                              s.rank_penalty > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            +{s.rank_penalty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedStore(s)
                              setPenaltyPoints(10)
                              setPenaltyReason('')
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors shadow-sm"
                          >
                            Phạt thứ hạng
                          </button>
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

      {/* Penalty Modal */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Phạt Thứ Hạng Hiển Thị</h3>
                <p className="text-xs text-slate-500">Quán: {selectedStore.store_name}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700 block">Số điểm phạt bổ sung (Rank Penalty)</label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 20, 50].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setPenaltyPoints(pts)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      penaltyPoints === pts
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    +{pts} điểm
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold text-slate-700 block pt-1">Lý do phạt (Lưu vào Decision Log)</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Khách phản ánh túi giao thiếu món, quán đóng cửa trước giờ hẹn..."
                value={penaltyReason}
                onChange={(e) => setPenaltyReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyPenalty}
                disabled={submittingPenalty}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {submittingPenalty ? 'Đang lưu...' : `Xác nhận phạt +${penaltyPoints} điểm`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
