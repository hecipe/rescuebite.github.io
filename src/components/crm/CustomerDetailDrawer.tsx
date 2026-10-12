import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { X, Send, ShoppingBag, Clock, ShieldAlert, Award, Sparkles, CheckCircle2 } from 'lucide-react'
import type { BuyerSegment, Order } from '@/types/database.types'

interface CustomerDetailDrawerProps {
  customer: BuyerSegment | null
  onClose: () => void
}

const SEGMENT_MESSAGES: Record<string, string> = {
  Mới: 'Chào mừng bạn đến với RescueBite! Hãy trải nghiệm túi bất ngờ đầu tiên với mức giá ưu đãi đến 70% nhé.',
  'Thân thiết': 'Cảm ơn bạn đã là người bạn đồng hành tích cực của môi trường! Tặng bạn huy hiệu Chiến Binh Xanh và quyền đặt túi sớm.',
  'Đang hoạt động': 'Hôm nay các quán ngon quanh bạn vừa đăng thêm nhiều túi thực phẩm tươi ngon. Mở app đặt ngay nhé!',
  'Có nguy cơ rời bỏ': 'Đã lâu bạn chưa ghé RescueBite! Chúng tôi tặng bạn ưu đãi 20.000 VNĐ cho túi bất ngờ tiếp theo hôm nay.',
  'Đã rời bỏ': 'RescueBite rất nhớ bạn! Khu vực của bạn vừa có thêm 5 quán đối tác mới với nhiều món ngon chất lượng.',
}

export function CustomerDetailDrawer({ customer, onClose }: CustomerDetailDrawerProps) {
  const { role } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  useEffect(() => {
    if (!customer) return
    setCustomMessage(SEGMENT_MESSAGES[customer.segment] || SEGMENT_MESSAGES['Đang hoạt động'])
    setSendSuccess(false)
    fetchCustomerOrders(customer.buyer_id)
  }, [customer])

  async function fetchCustomerOrders(buyerId: string) {
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, bags(category, price, stores(name, district))')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setOrders((data || []) as Order[])
    } catch (err) {
      console.error('Error fetching customer orders:', err)
    } finally {
      setLoadingOrders(false)
    }
  }

  async function handleSendMessage() {
    if (!customer || !customMessage.trim()) return
    setSending(true)
    setSendSuccess(false)
    try {
      const { error } = await supabase.from('message_log').insert({
        from_role: (role as any) || 'sales_rep',
        to_buyer_id: customer.buyer_id,
        segment: customer.segment,
        message: customMessage.trim(),
      })

      if (error) throw error
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 4000)
    } catch (err) {
      console.error('Error sending CRM care message:', err)
      alert(err instanceof Error ? err.message : 'Lỗi gửi tin nhắn chăm sóc.')
    } finally {
      setSending(false)
    }
  }

  if (!customer) return null

  const totalSpent = orders
    .filter((o) => o.status === 'PICKED_UP')
    .reduce((sum, o) => sum + (o.total_price || 0), 0)

  const noShowCount = orders.filter((o) => o.status === 'NO_SHOW').length

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{customer.full_name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {customer.segment}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {customer.buyer_id.slice(0, 12)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lifetime Value & Behaviors */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border text-center">
              <span className="text-xs text-slate-500 font-medium">Đơn đã nhận</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">{customer.total_pickups}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border text-center">
              <span className="text-xs text-slate-500 font-medium">Giá trị LTV</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{totalSpent.toLocaleString('vi-VN')} đ</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border text-center">
              <span className="text-xs text-slate-500 font-medium">Lỡ hẹn (No-Show)</span>
              <p className={`text-xl font-bold mt-1 ${noShowCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {noShowCount}
              </p>
            </div>
          </div>

          {/* CRM Care Message Section */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-100 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Gợi Ý Thông Điệp Chăm Sóc Khách Hàng</span>
            </div>
            <p className="text-xs text-emerald-700">
              Mẫu tin nhắn tự động tối ưu hóa theo phân khúc <strong>"{customer.segment}"</strong>
            </p>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <div className="flex items-center justify-between pt-1">
              {sendSuccess ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã ghi vào nhật ký chăm sóc (message_log)!
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">Gửi thông điệp mô phỏng qua email/app push</span>
              )}
              <button
                onClick={handleSendMessage}
                disabled={sending || !customMessage.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Đang gửi...' : 'Gửi thử ngay'}
              </button>
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-500" />
              Lịch Sử Đơn Hàng Gần Đây ({orders.length})
            </h3>
            {loadingOrders ? (
              <p className="text-xs text-slate-400 py-4 text-center">Đang tải lịch sử đơn hàng...</p>
            ) : orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Khách hàng chưa có đơn hàng nào.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => {
                  const bagInfo = (o as any).bags
                  const storeName = bagInfo?.stores?.name || 'Quán đối tác'
                  return (
                    <div
                      key={o.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{storeName}</span>
                          <span className="text-slate-400 font-mono">#{o.id.slice(0, 6)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {bagInfo?.category || 'Túi cứu trợ'} • {o.qty} túi • {o.total_price?.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                          o.status === 'PICKED_UP'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'NO_SHOW'
                            ? 'bg-rose-100 text-rose-800'
                            : o.status === 'PAID_AWAITING_PICKUP'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
