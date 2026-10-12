import { useState, useEffect } from 'react'
import {
  Store,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingPage, EmptyState } from '@/components/shared'
import { rpcApproveStore, rpcLogDecision } from '@/lib/rpc'
import { formatDateTime, parseError } from '@/lib/utils'

export default function StoreReviewPage() {
  const { user } = useAuth()
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'approved' | 'suspended'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchStores()
  }, [])

  async function fetchStores() {
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const { data, error: err } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setStores(data || [])
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveStore(storeId: string, storeName: string) {
    if (!window.confirm(`Xác nhận phê duyệt cửa hàng "${storeName}"?`)) return
    setProcessingId(storeId)
    setError(null)
    try {
      try {
        await rpcApproveStore(storeId, 'Hồ sơ đạt tiêu chuẩn an toàn và thông tin đầy đủ.')
      } catch {
        // Fallback direct update for admin / sales
        await supabase
          .from('stores')
          .update({ status: 'approved' })
          .eq('id', storeId)

        // Try granting role
        const targetStore = stores.find((s) => s.id === storeId)
        if (targetStore?.owner_id) {
          await supabase.from('user_roles').upsert({
            user_id: targetStore.owner_id,
            role: 'store_owner',
            granted_by: user?.id,
          })
        }
      }

      setSuccessMsg(`Đã phê duyệt thành công cửa hàng "${storeName}"!`)
      await fetchStores()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setProcessingId(null)
    }
  }

  async function handleRejectStore(storeId: string, storeName: string) {
    const reason = window.prompt(`Nhập lý do từ chối/tạm hoãn cửa hàng "${storeName}":`, 'Thông tin địa chỉ chưa chính xác hoặc thiếu giấy phép.')
    if (reason === null) return

    setProcessingId(storeId)
    setError(null)
    try {
      await supabase
        .from('stores')
        .update({ status: 'suspended' })
        .eq('id', storeId)

      try {
        await rpcLogDecision('store', storeId, 'suspend', reason)
      } catch {
        // ignore
      }

      setSuccessMsg(`Đã từ chối cửa hàng "${storeName}".`)
      await fetchStores()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setProcessingId(null)
    }
  }

  const filteredStores = stores.filter((s) => s.status === tab)
  const pendingCount = stores.filter((s) => s.status === 'pending').length
  const approvedCount = stores.filter((s) => s.status === 'approved').length
  const suspendedCount = stores.filter((s) => s.status === 'suspended').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="h-6 w-6 text-green-700" />
            Thẩm định & Duyệt Hồ sơ Cửa hàng (Store Onboarding Review)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem xét đơn đăng ký đối tác mới, cấp quyền mở bán túi bất ngờ và kiểm soát chất lượng
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStores}
          className="text-xs h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Làm mới
        </Button>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 font-medium">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1 text-xs max-w-md">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 rounded-xl py-2 font-bold transition-all ${
            tab === 'pending'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Chờ duyệt ({pendingCount})
        </button>
        <button
          onClick={() => setTab('approved')}
          className={`flex-1 rounded-xl py-2 font-bold transition-all ${
            tab === 'approved'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Đã duyệt ({approvedCount})
        </button>
        <button
          onClick={() => setTab('suspended')}
          className={`flex-1 rounded-xl py-2 font-bold transition-all ${
            tab === 'suspended'
              ? 'bg-white text-red-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Từ chối / Khóa ({suspendedCount})
        </button>
      </div>

      {/* Stores List */}
      {loading ? (
        <LoadingPage />
      ) : filteredStores.length === 0 ? (
        <EmptyState
          icon="🏪"
          title={
            tab === 'pending'
              ? 'Không có cửa hàng nào đang chờ duyệt'
              : 'Chưa có cửa hàng trong danh mục này'
          }
          description="Tất cả các hồ sơ đối tác đã được giải quyết xong."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="rounded-2xl border bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{store.name}</h3>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[10px] font-semibold">
                      {store.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {store.address}, <strong>{store.district}</strong>
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    store.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : store.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {store.status === 'approved'
                    ? 'Đã duyệt'
                    : store.status === 'pending'
                    ? 'Chờ duyệt'
                    : 'Tạm khóa'}
                </span>
              </div>

              {store.description && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed border border-slate-100">
                  <p className="font-semibold text-slate-700 text-[11px] mb-0.5">Giới thiệu quán:</p>
                  {store.description}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>Nộp ngày: {formatDateTime(store.created_at)}</span>
                <span>Chủ quán ID: {store.owner_id ? store.owner_id.slice(0, 8) : '—'}</span>
              </div>

              {/* Action Buttons for Pending stores */}
              {store.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    disabled={processingId === store.id}
                    onClick={() => handleRejectStore(store.id, store.name)}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Từ chối hồ sơ
                  </Button>

                  <Button
                    variant="brand"
                    size="sm"
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                    disabled={processingId === store.id}
                    onClick={() => handleApproveStore(store.id, store.name)}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Phê duyệt đối tác
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
