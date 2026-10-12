import { useState, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  Clock,
  User,
  Store,
  Package,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  UserCheck,
  Send,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TicketNotesList } from './TicketNotesList'
import {
  formatVND,
  formatDateTime,
  formatPickupWindow,
  parseError,
} from '@/lib/utils'
import {
  rpcAssignTicket,
  rpcResolveTicket,
  rpcSupportRefund,
  rpcLogDecision,
} from '@/lib/rpc'
import type { TicketStatus, TicketPriority } from '@/types/database.types'

interface TicketContextDrawerProps {
  ticketId: string | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function TicketContextDrawer({
  ticketId,
  open,
  onClose,
  onUpdated,
}: TicketContextDrawerProps) {
  const { user } = useAuth()
  const [ticket, setTicket] = useState<any>(null)
  const [order, setOrder] = useState<any>(null)
  const [buyerProfile, setBuyerProfile] = useState<any>(null)
  const [storeData, setStoreData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [resolutionText, setResolutionText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!ticketId || !open) return
    fetchTicketContext()
  }, [ticketId, open])

  async function fetchTicketContext() {
    if (!ticketId) return
    setLoading(true)
    setError(null)
    setActionSuccess(null)

    try {
      // 1. Fetch ticket details
      const { data: tData, error: tErr } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (tErr) throw tErr
      setTicket(tData)
      setRefundAmount(tData.refund_amount || 0)
      setResolutionText(tData.resolution || '')

      // 2. Fetch order context (if linked)
      if (tData.order_id) {
        const { data: oData } = await supabase
          .from('orders')
          .select(`
            *,
            bags(
              id, category, price, pickup_start, pickup_end,
              stores(id, name, district, address, rank_penalty, status)
            )
          `)
          .eq('id', tData.order_id)
          .single()

        if (oData) {
          setOrder(oData)
          setRefundAmount(oData.total_price)
          if (oData.bags?.stores) {
            setStoreData(oData.bags.stores)
          }
        }
      }

      // 3. Fetch buyer profile
      if (tData.buyer_id) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', tData.buyer_id)
          .maybeSingle()

        if (pData) setBuyerProfile(pData)
      }
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  // Action 1: Refund Trigger
  async function handleRefund() {
    if (!ticket || !order) return
    if (refundAmount <= 0 || refundAmount > order.total_price) {
      setError(`Số tiền hoàn phải từ 1 đến ${formatVND(order.total_price)}`)
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      try {
        await rpcSupportRefund(ticket.id, refundAmount)
      } catch {
        // Fallback direct update for support role if RPC isn't deployed yet
        await supabase
          .from('orders')
          .update({ status: 'REFUNDED' })
          .eq('id', order.id)
        await supabase
          .from('tickets')
          .update({
            status: 'Đã xử lý',
            refund_amount: refundAmount,
            resolution: `Đã hoàn ${formatVND(refundAmount)} cho khách`,
          })
          .eq('id', ticket.id)
      }

      setActionSuccess(`Đã hoàn thành công ${formatVND(refundAmount)}!`)
      await fetchTicketContext()
      onUpdated()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Action 2: Mark No-Show manually
  async function handleMarkNoShow() {
    if (!order) return
    setActionLoading(true)
    setError(null)
    try {
      await supabase
        .from('orders')
        .update({ status: 'NO_SHOW' })
        .eq('id', order.id)

      await supabase.from('ticket_notes').insert({
        ticket_id: ticket.id,
        author_id: user?.id,
        body: 'Hỗ trợ viên đã cập nhật đơn hàng thành Không đến nhận (NO_SHOW)',
      })

      setActionSuccess('Đã cập nhật trạng thái đơn sang NO_SHOW.')
      await fetchTicketContext()
      onUpdated()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Action 3: Penalize store rank_penalty
  async function handlePenalizeStore(points: number) {
    if (!storeData) return
    setActionLoading(true)
    setError(null)
    try {
      const newPenalty = (storeData.rank_penalty || 0) + points
      await supabase
        .from('stores')
        .update({ rank_penalty: newPenalty })
        .eq('id', storeData.id)

      try {
        await rpcLogDecision(
          'store',
          storeData.id,
          'penalty',
          `Khiếu nại ticket #${ticket.id.slice(0, 8)}: Phạt +${points} điểm thứ hạng`
        )
      } catch {
        // ignore log error
      }

      await supabase.from('ticket_notes').insert({
        ticket_id: ticket.id,
        author_id: user?.id,
        body: `Đã xử phạt quán ${storeData.name} +${points} điểm thứ hạng giảm hiển thị.`,
      })

      setActionSuccess(`Đã cộng phạt +${points} điểm thứ hạng cho ${storeData.name}!`)
      await fetchTicketContext()
      onUpdated()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Action 4: Assign to me
  async function handleAssignToMe() {
    if (!ticket || !user) return
    setActionLoading(true)
    setError(null)
    try {
      try {
        await rpcAssignTicket(ticket.id, user.id, 24)
      } catch {
        await supabase
          .from('tickets')
          .update({ assignee_id: user.id, status: 'Đang xử lý' })
          .eq('id', ticket.id)
      }

      setActionSuccess('Đã gán phiếu hỗ trợ cho bạn!')
      await fetchTicketContext()
      onUpdated()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Action 5: Resolve ticket
  async function handleResolveTicket() {
    if (!ticket) return
    if (!resolutionText.trim()) {
      setError('Vui lòng nhập kết luận giải quyết khiếu nại.')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      try {
        await rpcResolveTicket(ticket.id, resolutionText.trim(), refundAmount || 0)
      } catch {
        await supabase
          .from('tickets')
          .update({
            status: 'Đã xử lý',
            resolution: resolutionText.trim(),
            refund_amount: refundAmount || 0,
          })
          .eq('id', ticket.id)
      }

      setActionSuccess('Đã giải quyết ticket thành công!')
      await fetchTicketContext()
      onUpdated()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (!open) return null

  const isOverdue = ticket?.sla_due_at && new Date(ticket.sla_due_at).getTime() < Date.now()

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl border-l bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Phiếu #{ticket?.id ? ticket.id.slice(0, 8).toUpperCase() : '...'}
                </h3>
                {ticket?.priority && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      ticket.priority === 'Khẩn'
                        ? 'bg-red-100 text-red-700'
                        : ticket.priority === 'Cao'
                        ? 'bg-orange-100 text-orange-700'
                        : ticket.priority === 'Trung bình'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ticket.priority}
                  </span>
                )}
                {ticket?.status && (
                  <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold">
                    {ticket.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Danh mục: <strong className="text-slate-700">{ticket?.category}</strong> • Tạo lúc: {ticket?.created_at ? formatDateTime(ticket.created_at) : '...'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Action Feedback Banner */}
            {actionSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SLA countdown warning */}
            {ticket?.sla_due_at && (
              <div
                className={`rounded-xl border p-3 flex items-center justify-between text-xs ${
                  isOverdue
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    Hạn cam kết SLA: <strong>{formatDateTime(ticket.sla_due_at)}</strong>
                  </span>
                </div>
                {isOverdue && (
                  <span className="rounded bg-red-600 text-white px-2 py-0.5 text-[10px] font-bold">
                    QUÁ HẠN SLA
                  </span>
                )}
              </div>
            )}

            {/* Complaint Description */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nội dung khiếu nại của khách
              </h4>
              <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                {ticket?.description || 'Không có mô tả.'}
              </p>
            </div>

            {/* Order Context Card */}
            {order ? (
              <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-green-700" />
                    Ngữ cảnh đơn hàng #{order.id.slice(0, 8).toUpperCase()}
                  </h4>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-400 text-[11px]">Người mua</span>
                    <p className="font-bold text-slate-800 flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      {buyerProfile?.full_name || 'Khách hàng'}
                    </p>
                    <p className="text-[11px] text-slate-500">{buyerProfile?.phone || 'Chưa có SĐT'}</p>
                    <p className="text-[11px] text-slate-500">{buyerProfile?.district || 'TP.HCM'}</p>
                  </div>

                  <div className="space-y-1 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-400 text-[11px]">Cửa hàng bị phản ánh</span>
                    <p className="font-bold text-slate-800 flex items-center gap-1">
                      <Store className="h-3 w-3 text-green-700" />
                      {storeData?.name || 'Quán đối tác'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{storeData?.address}</p>
                    <p className="text-[11px] text-orange-600 font-semibold">
                      Điểm phạt hiện tại: {storeData?.rank_penalty || 0} pts
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-3 text-xs flex justify-between items-center bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-800">{order.bags?.category} × {order.qty}</p>
                    <p className="text-[11px] text-slate-500">
                      Giờ nhận: {order.bags?.pickup_start ? formatPickupWindow(order.bags.pickup_start, order.bags.pickup_end) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px]">Tổng đơn</span>
                    <p className="font-extrabold text-green-700 text-sm">{formatVND(order.total_price)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-center text-xs text-slate-400">
                Phiếu yêu cầu này không liên kết với đơn hàng cụ thể nào.
              </div>
            )}

            {/* One-Click Support Actions Bar */}
            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Hành động một chạm (One-Click Actions)
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. Quick Assign */}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-xs h-9 justify-start"
                  disabled={actionLoading || ticket?.assignee_id === user?.id}
                  onClick={handleAssignToMe}
                >
                  <UserCheck className="h-4 w-4 mr-1.5 text-blue-600" />
                  {ticket?.assignee_id === user?.id ? 'Đang phụ trách' : 'Nhận xử lý ticket này'}
                </Button>

                {/* 2. Quick Mark No-Show */}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-xs h-9 justify-start"
                  disabled={actionLoading || !order || order?.status === 'NO_SHOW'}
                  onClick={handleMarkNoShow}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5 text-slate-600" />
                  Chuyển đơn No-Show
                </Button>

                {/* 3. Penalize Store (+10 pts) */}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-xs h-9 justify-start border-orange-200 text-orange-700 hover:bg-orange-50"
                  disabled={actionLoading || !storeData}
                  onClick={() => handlePenalizeStore(10)}
                >
                  <ShieldAlert className="h-4 w-4 mr-1.5 text-orange-600" />
                  Phạt quán (+10 điểm)
                </Button>

                {/* 4. Penalize Store (+30 pts) */}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-xs h-9 justify-start border-red-200 text-red-700 hover:bg-red-50"
                  disabled={actionLoading || !storeData}
                  onClick={() => handlePenalizeStore(30)}
                >
                  <ShieldAlert className="h-4 w-4 mr-1.5 text-red-600" />
                  Phạt nặng quán (+30 điểm)
                </Button>
              </div>

              {/* Refund Section */}
              {order && order.status !== 'REFUNDED' && (
                <div className="rounded-xl bg-white border p-3 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Kích hoạt hoàn tiền cho khách:
                    </span>
                    <span className="text-slate-500 text-[11px]">Tối đa {formatVND(order.total_price)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step={1000}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      placeholder="Số tiền hoàn (VNĐ)"
                      className="text-xs h-9"
                    />
                    <Button
                      variant="brand"
                      size="sm"
                      disabled={actionLoading || refundAmount <= 0}
                      onClick={handleRefund}
                      className="shrink-0 h-9 bg-emerald-600 hover:bg-emerald-700 text-xs"
                    >
                      Xác nhận hoàn tiền
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Resolution Form */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Kết luận giải quyết khiếu nại (Đóng ticket)
              </h4>
              <Textarea
                rows={2}
                placeholder="Nhập nội dung giải quyết (VD: Đã hoàn tiền cho khách, quán đã cam kết kiểm tra đồ ăn trước khi giao...)"
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="text-xs"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="brand"
                  disabled={actionLoading || !resolutionText.trim()}
                  onClick={handleResolveTicket}
                  className="text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Đóng & Giải quyết ticket
                </Button>
              </div>
            </div>

            {/* Internal Notes Component */}
            {ticket && (
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <TicketNotesList ticketId={ticket.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
