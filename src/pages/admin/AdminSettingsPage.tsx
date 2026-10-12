import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { rpcSetAppSetting, rpcRefreshDemo } from '@/lib/rpc'
import { Settings, Save, RefreshCw, CheckCircle2, AlertTriangle, Clock, Percent, Sparkles, ShieldCheck } from 'lucide-react'
import type { AppSetting } from '@/types/database.types'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    hold_minutes: '10',
    cancel_deadline_minutes: '60',
    commission_pct: '15',
    demo_ignore_window: 'false',
  })
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [refreshingDemo, setRefreshingDemo] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('app_settings').select('*')
      if (error) throw error
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((s: AppSetting) => {
          map[s.key] = s.value
        })
        setSettings((prev) => ({ ...prev, ...map }))
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setStatusMessage({ text: 'Lỗi tải cấu hình cài đặt.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSetting(key: string, value: string) {
    setSavingKey(key)
    setStatusMessage(null)
    try {
      await rpcSetAppSetting(key, value)
      setStatusMessage({ text: `Đã lưu thành công tham số "${key}" = "${value}".`, type: 'success' })
    } catch (err) {
      console.error('Error saving setting:', err)
      setStatusMessage({ text: err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình.', type: 'error' })
    } finally {
      setSavingKey(null)
    }
  }

  async function handleSaveAll() {
    setSavingKey('all')
    setStatusMessage(null)
    try {
      for (const [key, value] of Object.entries(settings)) {
        await rpcSetAppSetting(key, value)
      }
      setStatusMessage({ text: 'Đã lưu toàn bộ thiết lập hệ thống thành công!', type: 'success' })
    } catch (err) {
      console.error('Error saving all settings:', err)
      setStatusMessage({ text: err instanceof Error ? err.message : 'Lỗi lưu thiết lập.', type: 'error' })
    } finally {
      setSavingKey(null)
    }
  }

  async function handleRefreshDemo() {
    setRefreshingDemo(true)
    setStatusMessage(null)
    try {
      await rpcRefreshDemo()
      setStatusMessage({
        text: 'Đã làm mới dữ liệu demo thành công! Khung giờ nhận của các túi thực phẩm đã được dời sang thời điểm hiện tại.',
        type: 'success',
      })
    } catch (err) {
      console.error('Error refreshing demo:', err)
      setStatusMessage({ text: err instanceof Error ? err.message : 'Lỗi làm mới dữ liệu demo.', type: 'error' })
    } finally {
      setRefreshingDemo(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="Cài đặt Hệ thống"
        actions={
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border rounded-xl hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cấu Hình Tham Số Vận Hành Nền Tảng</h2>
              <p className="text-sm text-slate-500">
                Điều chỉnh các thông số nghiệp vụ tài chính, thời gian giao dịch và môi trường demo
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={savingKey !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingKey === 'all' ? 'Đang lưu...' : 'Lưu toàn bộ thay đổi'}
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            {statusMessage.text}
          </div>
        )}

        {/* Settings Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Setting 1: Commission Rate */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Percent className="w-5 h-5" />
                </div>
                <span>Tỷ Lệ Hoa Hồng Nền Tảng (Commission %)</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                commission_pct
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tỷ lệ phần trăm doanh thu sàn khấu trừ từ mỗi đơn hàng hoàn thành (đã nhận túi). Mặc định là 15%. Phần còn lại thuộc về doanh thu thực nhận của quán đối tác.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.commission_pct || '15'}
                  onChange={(e) => setSettings({ ...settings, commission_pct: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">%</span>
              </div>
              <button
                onClick={() => handleSaveSetting('commission_pct', settings.commission_pct)}
                disabled={savingKey === 'commission_pct'}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                {savingKey === 'commission_pct' ? 'Lưu...' : 'Cập nhật'}
              </button>
            </div>
          </div>

          {/* Setting 2: Hold Minutes */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <span>Thời Gian Giữ Chỗ Đơn Hàng (Hold Minutes)</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
                hold_minutes
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Thời gian tối đa (phút) hệ thống tạm giữ số lượng túi cho khách hàng thanh toán. Sau thời hạn này, đơn chưa thanh toán sẽ tự động bị hủy và nhả lại túi cho người khác.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={settings.hold_minutes || '10'}
                  onChange={(e) => setSettings({ ...settings, hold_minutes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">phút</span>
              </div>
              <button
                onClick={() => handleSaveSetting('hold_minutes', settings.hold_minutes)}
                disabled={savingKey === 'hold_minutes'}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                {savingKey === 'hold_minutes' ? 'Lưu...' : 'Cập nhật'}
              </button>
            </div>
          </div>

          {/* Setting 3: Cancel Deadline Minutes */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <Clock className="w-5 h-5" />
                </div>
                <span>Hạn Hủy Đơn Hoàn Tiền (Cancel Deadline)</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg">
                cancel_deadline_minutes
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khoảng thời gian (phút) kể từ khi thanh toán thành công mà người mua được phép tự hủy đơn nhận lại 100% tiền hoàn tự động. Sau thời hạn này, khách hàng phải liên hệ bộ phận hỗ trợ.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={settings.cancel_deadline_minutes || '60'}
                  onChange={(e) => setSettings({ ...settings, cancel_deadline_minutes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">phút</span>
              </div>
              <button
                onClick={() => handleSaveSetting('cancel_deadline_minutes', settings.cancel_deadline_minutes)}
                disabled={savingKey === 'cancel_deadline_minutes'}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                {savingKey === 'cancel_deadline_minutes' ? 'Lưu...' : 'Cập nhật'}
              </button>
            </div>
          </div>

          {/* Setting 4: Demo Ignore Window */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span>Bỏ Qua Khung Giờ Khi Nhận Túi (Demo Mode)</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                demo_ignore_window
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khi kích hoạt chế độ này, người mua hoặc quán có thể xác nhận nhận túi thành công ngay lập tức ở bất kỳ thời điểm nào mà không bị chặn bởi khung giờ đón túi thực tế.
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-slate-600">
                Trạng thái:{' '}
                <strong className={settings.demo_ignore_window === 'true' ? 'text-emerald-600' : 'text-slate-500'}>
                  {settings.demo_ignore_window === 'true' ? 'ĐANG BẬT (Demo)' : 'TẮT (Kiểm tra giờ thật)'}
                </strong>
              </span>
              <button
                onClick={() => {
                  const newVal = settings.demo_ignore_window === 'true' ? 'false' : 'true'
                  setSettings({ ...settings, demo_ignore_window: newVal })
                  handleSaveSetting('demo_ignore_window', newVal)
                }}
                disabled={savingKey === 'demo_ignore_window'}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  settings.demo_ignore_window === 'true'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {settings.demo_ignore_window === 'true' ? 'Tắt chế độ' : 'Bật chế độ'}
              </button>
            </div>
          </div>
        </div>

        {/* Demo Fast Forward & Refresh Section */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-200">
                <Sparkles className="w-3.5 h-3.5" />
                Công cụ thuyết trình Demo
              </div>
              <h3 className="text-lg font-bold">Làm Mới & Dịch Chuyển Khung Giờ Túi Demo</h3>
              <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                Gọi trực tiếp hàm RPC <code className="bg-black/30 px-1 py-0.5 rounded font-mono">refresh_demo()</code> trong PostgreSQL. Hệ thống sẽ tự động dời khung giờ mở bán và nhận túi của tất cả các túi trong hệ thống về thời điểm hiện tại và tương lai gần (trong vòng 2 giờ tới), giúp ban giám khảo và người xem có thể trải nghiệm toàn bộ luồng mua và nhận túi ngay lập tức.
              </p>
            </div>
            <button
              onClick={handleRefreshDemo}
              disabled={refreshingDemo}
              className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingDemo ? 'animate-spin' : ''}`} />
              {refreshingDemo ? 'Đang cập nhật...' : 'Làm mới dữ liệu demo ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
