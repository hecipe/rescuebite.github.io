import { useState, useEffect } from 'react'
import {
  Ticket,
  Search,
  Filter,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  ChevronRight,
  UserCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingPage, EmptyState } from '@/components/shared'
import { TicketContextDrawer } from '@/components/crm/TicketContextDrawer'
import { formatDateTime, parseError } from '@/lib/utils'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/lib/constants'

export default function TicketCenterPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [activeQueue, setActiveQueue] = useState<'all' | 'new' | 'in_progress' | 'urgent' | 'resolved'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Selected ticket for drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tickets')
        .select(`
          *,
          orders(id, total_price, status)
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setTickets(data || [])
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSelectTicket(id: string) {
    setSelectedTicketId(id)
    setDrawerOpen(true)
  }

  // Queue filtering
  const filteredTickets = tickets.filter((t) => {
    // 1. Queue Tab
    if (activeQueue === 'new' && t.status !== 'Mới') return false
    if (activeQueue === 'in_progress' && t.status !== 'Đang xử lý') return false
    if (activeQueue === 'urgent' && t.priority !== 'Khẩn' && t.priority !== 'Cao') return false
    if (activeQueue === 'resolved' && t.status !== 'Đã xử lý' && t.status !== 'Đóng') return false

    // 2. Category
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false

    // 3. Priority
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false

    // 4. Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchId = t.id.toLowerCase().includes(term)
      const matchDesc = (t.description || '').toLowerCase().includes(term)
      const matchCat = (t.category || '').toLowerCase().includes(term)
      if (!matchId && !matchDesc && !matchCat) return false
    }

    return true
  })

  const newCount = tickets.filter((t) => t.status === 'Mới').length
  const inProgressCount = tickets.filter((t) => t.status === 'Đang xử lý').length
  const urgentCount = tickets.filter((t) => t.priority === 'Khẩn' || t.priority === 'Cao').length
  const resolvedCount = tickets.filter((t) => t.status === 'Đã xử lý' || t.status === 'Đóng').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="h-6 w-6 text-green-700" />
            Trung tâm Xử lý Khiếu nại (Support Ticket Center)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân hệ CRM giải quyết sự cố, bảo vệ quyền lợi người mua và duy trì chất lượng cửa hàng
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchTickets}
          className="text-xs h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Làm mới
        </Button>
      </div>

      {/* Queue Stat Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveQueue('all')}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeQueue === 'all'
              ? 'border-green-600 bg-green-50/50 shadow-sm ring-1 ring-green-600'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Tất cả ticket</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{tickets.length}</p>
        </button>

        <button
          onClick={() => setActiveQueue('new')}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeQueue === 'new'
              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-blue-600 uppercase">Mới tiếp nhận</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{newCount}</p>
        </button>

        <button
          onClick={() => setActiveQueue('in_progress')}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeQueue === 'in_progress'
              ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-amber-600 uppercase">Đang xử lý</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{inProgressCount}</p>
        </button>

        <button
          onClick={() => setActiveQueue('urgent')}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeQueue === 'urgent'
              ? 'border-red-600 bg-red-50/50 shadow-sm ring-1 ring-red-600'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-red-600 uppercase">Khẩn cấp / Cao</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{urgentCount}</p>
        </button>

        <button
          onClick={() => setActiveQueue('resolved')}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeQueue === 'resolved'
              ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-emerald-600 uppercase">Đã giải quyết</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{resolvedCount}</p>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Tìm theo mã ticket hoặc nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 text-xs h-9">
              <SelectValue placeholder="Danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {TICKET_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 text-xs h-9">
              <SelectValue placeholder="Mức độ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mức độ</SelectItem>
              {TICKET_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ticket List Table */}
      {loading ? (
        <LoadingPage />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="Không có phiếu nào trong hàng đợi này"
          description="Tất cả khiếu nại đã được phân loại hoặc không khớp với bộ lọc."
        />
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Mã Phiếu</th>
                  <th className="py-3.5 px-4">Danh mục</th>
                  <th className="py-3.5 px-4">Nội dung</th>
                  <th className="py-3.5 px-4">Ưu tiên</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Cam kết SLA</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTickets.map((t) => {
                  const isOverdue = t.sla_due_at && new Date(t.sla_due_at).getTime() < Date.now()
                  const priorityColor =
                    t.priority === 'Khẩn'
                      ? 'bg-red-100 text-red-700'
                      : t.priority === 'Cao'
                      ? 'bg-orange-100 text-orange-700'
                      : t.priority === 'Trung bình'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-slate-100 text-slate-600'

                  const statusColor =
                    t.status === 'Mới'
                      ? 'bg-blue-100 text-blue-800'
                      : t.status === 'Đang xử lý'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800'

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleSelectTicket(t.id)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{t.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{t.category}</span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {t.description}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityColor}`}>
                          {t.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {t.sla_due_at ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className={`h-3.5 w-3.5 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`} />
                            <span className={isOverdue ? 'font-bold text-red-600' : 'text-slate-600'}>
                              {formatDateTime(t.sla_due_at).split(' ')[0]}
                            </span>
                            {isOverdue && (
                              <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1 rounded">
                                Trễ
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectTicket(t.id)
                          }}
                        >
                          Xử lý <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Context Drawer */}
      <TicketContextDrawer
        ticketId={selectedTicketId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={fetchTickets}
      />
    </div>
  )
}
