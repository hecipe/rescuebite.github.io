import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { AlertCircle, CheckCircle2, Clock, Search, RefreshCw, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react'
import type { ReconciliationAlert } from '@/types/database.types'

export default function ReconciliationAlertsPage() {
  const [alerts, setAlerts] = useState<ReconciliationAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')
  const [search, setSearch] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [])

  async function fetchAlerts() {
    setLoading(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase
        .from('reconciliation_alerts')
        .select('*, orders(id, total_price, status, buyer_id)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlerts((data || []) as ReconciliationAlert[])
    } catch (err) {
      console.error('Error fetching reconciliation alerts:', err)
      setFeedback({ text: 'Lỗi tải danh sách cảnh báo đối soát.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleResolveAlert(alertId: string) {
    setResolvingId(alertId)
    setFeedback(null)
    try {
      const { error } = await supabase
        .from('reconciliation_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId)

      if (error) throw error

      setFeedback({ text: 'Đã đánh dấu giải quyết đối soát thành công!', type: 'success' })
      await fetchAlerts()
    } catch (err) {
      console.error('Error resolving alert:', err)
      setFeedback({ text: err instanceof Error ? err.message : 'Lỗi cập nhật cảnh báo.', type: 'error' })
    } finally {
      setResolvingId(null)
    }
  }

  const unresolvedCount = alerts.filter((a) => !a.resolved_at).length
  const resolvedCount = alerts.filter((a) => a.resolved_at).length

  const filteredAlerts = alerts.filter((a) => {
    const matchesFilter =
      filter === 'all' || (filter === 'unresolved' && !a.resolved_at) || (filter === 'resolved' && a.resolved_at)

    const matchesSearch =
      (a.detail && a.detail.toLowerCase().includes(search.toLowerCase())) ||
      a.alert_type.toLowerCase().includes(search.toLowerCase()) ||
      (a.order_id && a.order_id.toLowerCase().includes(search.toLowerCase()))

    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="N7 Cảnh báo Đối soát Tài chính & Đơn hàng"
        actions={
          <button
            onClick={fetchAlerts}
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
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hàng Đợi Xử Lý Cảnh Báo Đối Soát (Reconciliation Queue)</h2>
              <p className="text-sm text-slate-500">
                Phát hiện các sai lệch tài chính, thanh toán trễ sau khi đơn hủy, hoặc sự cố hoàn tiền tự động
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              {unresolvedCount} cảnh báo chưa xử lý
            </span>
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            {feedback.text}
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo chi tiết, mã đơn, loại cảnh báo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('unresolved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filter === 'unresolved'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cần xử lý ({unresolvedCount})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filter === 'resolved'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Đã đối soát ({resolvedCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả ({alerts.length})
            </button>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Loại cảnh báo</th>
                  <th className="px-6 py-3.5">Mô tả sự cố & Đơn hàng liên quan</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái đối soát</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Đang tải danh sách cảnh báo đối soát...
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Không có cảnh báo nào trong mục này. Hệ thống tài chính hoạt động đồng bộ hoàn hảo!
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((a) => {
                    const isResolved = !!a.resolved_at
                    const order = (a as any).orders

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(a.created_at).toLocaleString('vi-VN')}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {a.alert_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm">{a.detail}</p>
                          {a.order_id && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span className="font-mono">Đơn #{a.order_id.slice(0, 8)}...</span>
                              {order && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-slate-700">
                                    {order.total_price?.toLocaleString('vi-VN')} đ
                                  </span>
                                  <span>•</span>
                                  <span className="px-2 py-0.2 bg-slate-100 rounded text-[10px] font-semibold">
                                    {order.status}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          {isResolved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã giải quyết
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              Chờ xử lý
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {!isResolved ? (
                            <button
                              onClick={() => handleResolveAlert(a.id)}
                              disabled={resolvingId === a.id}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                            >
                              {resolvingId === a.id ? 'Đang lưu...' : 'Xác nhận đối soát'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">
                              Xong: {new Date(a.resolved_at!).toLocaleDateString('vi-VN')}
                            </span>
                          )}
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
    </div>
  )
}
