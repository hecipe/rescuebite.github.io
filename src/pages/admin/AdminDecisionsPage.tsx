import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { ShieldCheck, Search, Filter, RefreshCw, Clock, Tag } from 'lucide-react'
import type { DecisionLog } from '@/types/database.types'

export default function AdminDecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')

  useEffect(() => {
    fetchDecisions()
  }, [])

  async function fetchDecisions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('decision_log')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDecisions((data || []) as DecisionLog[])
    } catch (err) {
      console.error('Error fetching decision log:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredDecisions = decisions.filter((d) => {
    const matchesSearch =
      d.action.toLowerCase().includes(search.toLowerCase()) ||
      (d.reason && d.reason.toLowerCase().includes(search.toLowerCase())) ||
      (d.entity_id && d.entity_id.toLowerCase().includes(search.toLowerCase()))

    if (entityFilter === 'all') return matchesSearch
    return matchesSearch && d.entity_type === entityFilter
  })

  const entityTypes = Array.from(new Set(decisions.map((d) => d.entity_type)))

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="Nhật ký Quyết định & Kiểm toán"
        actions={
          <button
            onClick={fetchDecisions}
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
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Nhật Ký Quyết Định Hệ Thống (Audit Trail)</h2>
              <p className="text-sm text-slate-500">
                Lưu vết kiểm toán toàn bộ các thao tác nhạy cảm: duyệt quán, phạt điểm thứ hạng, phân quyền, đổi cài đặt
              </p>
            </div>
          </div>
          <div className="text-xs px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-600 self-start md:self-auto">
            Tổng số: <strong>{decisions.length}</strong> bản ghi kiểm toán
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo hành động, lý do, ID đối tượng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setEntityFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                entityFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả ({decisions.length})
            </button>
            {entityTypes.map((t) => {
              const count = decisions.filter((d) => d.entity_type === t).length
              return (
                <button
                  key={t}
                  onClick={() => setEntityFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    entityFilter === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Decisions Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Đối tượng</th>
                  <th className="px-6 py-3.5">Hành động ghi nhận</th>
                  <th className="px-6 py-3.5">Lý do / Giải trình</th>
                  <th className="px-4 py-3.5 text-right">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Đang tải nhật ký quyết định...
                    </td>
                  </tr>
                ) : filteredDecisions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Chưa có ghi nhận kiểm toán nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredDecisions.map((d) => {
                    const date = new Date(d.created_at)
                    const formattedDate = `${date.getHours().toString().padStart(2, '0')}:${date
                      .getMinutes()
                      .toString()
                      .padStart(2, '0')} - ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-mono">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formattedDate}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Tag className="w-3 h-3" />
                            {d.entity_type}
                          </span>
                          {d.entity_id && (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              #{d.entity_id.slice(0, 8)}...
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm">{d.action}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 italic">
                            {d.reason ? `"${d.reason}"` : <span className="text-slate-400 not-italic">— Không ghi chú —</span>}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap text-xs font-mono text-slate-500">
                          {d.actor_id ? `${d.actor_id.slice(0, 8)}...` : 'Hệ thống'}
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
