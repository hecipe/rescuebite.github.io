import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { TopBar } from '@/components/layout/TopBar'
import { Bell, CheckCheck, Package, ShoppingBag, AlertCircle, Sparkles, ChevronRight, RefreshCw } from 'lucide-react'
import type { Notification } from '@/types/database.types'

const NOTIF_ICONS: Record<string, any> = {
  new_bag: Package,
  order: ShoppingBag,
  refund: Sparkles,
  default: Bell,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { markAsRead, markAllAsRead, refresh } = useNotifications()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (user) {
      fetchNotifications()
    } else {
      setLoading(false)
    }
  }, [user])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications((data || []) as Notification[])
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.read_at) {
      await markAsRead(n.id)
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item))
      )
    }

    // Navigate based on payload
    const payload = n.payload as Record<string, any>
    if (payload?.bag_id) {
      navigate(`/bag/${payload.bag_id}`)
    } else if (payload?.order_id) {
      navigate(`/orders/${payload.order_id}`)
    } else if (payload?.store_id) {
      navigate(`/store/${payload.store_id}`)
    }
  }

  async function handleMarkAllRead() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((item) => ({ ...item, read_at: new Date().toISOString() })))
    await refresh()
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read_at
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <TopBar title="Thông Báo" />

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'unread' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Đọc tất cả
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Đang tải thông báo...</div>
        ) : filteredNotifs.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Không có thông báo nào</h3>
            <p className="text-xs text-slate-400">Bạn sẽ nhận được cập nhật đơn hàng và túi mới tại đây.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifs.map((n) => {
              const isUnread = !n.read_at
              const Icon = NOTIF_ICONS[n.type] || NOTIF_ICONS.default

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isUnread
                      ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isUnread ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs sm:text-sm font-bold ${
                          isUnread ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-slate-600 leading-relaxed">{n.body}</p>}
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {new Date(n.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 self-center shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
