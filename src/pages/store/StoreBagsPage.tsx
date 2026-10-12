import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Copy,
  Edit2,
  XCircle,
  ArrowLeft,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { useMyStore } from '@/hooks/useMyStore'
import { Button } from '@/components/ui/button'
import { LoadingPage, EmptyState } from '@/components/shared'
import { BagFormModal } from '@/components/store/BagFormModal'
import { BAG_STATUS_LABELS } from '@/lib/constants'
import { formatVND, formatPickupWindow, formatDateTime, parseError } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Bag } from '@/types/database.types'

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  OPEN: 'bg-green-100 text-green-800 font-bold',
  SOLD_OUT: 'bg-orange-100 text-orange-800',
  CLOSED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function StoreBagsPage() {
  const navigate = useNavigate()
  const { store, bags, loading, error, refetch } = useMyStore()

  const [showModal, setShowModal] = useState(false)
  const [copyFromBag, setCopyFromBag] = useState<Bag | null>(null)
  const [editBag, setEditBag] = useState<Bag | null>(null)

  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  function handleCreateNew() {
    setCopyFromBag(null)
    setEditBag(null)
    setShowModal(true)
  }

  function handleCopyYesterday(bag: Bag) {
    setCopyFromBag(bag)
    setEditBag(null)
    setShowModal(true)
  }

  function handleEditBag(bag: Bag) {
    setEditBag(bag)
    setCopyFromBag(null)
    setShowModal(true)
  }

  async function handleCancelBag(bagId: string) {
    if (!window.confirm('Hủy túi sẽ tự động hoàn tiền cho tất cả khách đã thanh toán. Bạn có chắc chắn muốn hủy?')) {
      return
    }

    setCancellingId(bagId)
    setCancelError(null)

    try {
      const { error: rpcErr } = await supabase.rpc('store_cancel_bag', {
        p_bag_id: bagId,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      await refetch()
    } catch (err) {
      setCancelError(parseError(err))
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return <LoadingPage />
  if (!store) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon="🏪"
          title="Bạn chưa có cửa hàng"
          description="Vui lòng đăng ký đối tác để quản lý túi."
          action={<Button onClick={() => navigate('/store/apply')} variant="brand">Đăng ký mở quán</Button>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/store/dashboard')}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý túi bất ngờ</h1>
            <p className="text-xs text-slate-500">{store.name} • Tổng cộng {bags.length} túi</p>
          </div>
        </div>

        <Button
          variant="brand"
          size="sm"
          onClick={handleCreateNew}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Đăng túi mới
        </Button>
      </div>

      {cancelError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Bag List */}
      {bags.length === 0 ? (
        <EmptyState
          icon="🍱"
          title="Chưa có túi nào được đăng"
          description="Đăng túi surplus food đầu tiên để người mua trong khu vực có thể tìm thấy bạn!"
          action={
            <Button onClick={handleCreateNew} variant="brand">
              Đăng túi ngay
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {bags.map((bag) => {
            const statusStyle = STATUS_BADGE_STYLES[bag.status] || 'bg-slate-100 text-slate-600'
            const isCancellable = bag.status === 'OPEN' || bag.status === 'SOLD_OUT' || bag.status === 'DRAFT'

            return (
              <div
                key={bag.id}
                className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                {/* Header: Category & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{bag.category}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] ${statusStyle}`}>
                        {BAG_STATUS_LABELS[bag.status] || bag.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Đăng lúc: {formatDateTime(bag.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-green-700">{formatVND(bag.price)}</p>
                    <p className="text-[11px] text-slate-400">
                      Gốc: {formatVND(bag.retail_min)} - {formatVND(bag.retail_max)}
                    </p>
                  </div>
                </div>

                {/* Stock & Timing details */}
                <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span>
                      Số lượng còn lại: <strong className="text-green-700">{bag.remaining}</strong> / {bag.quantity} túi
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Đã bán: <strong>{bag.quantity - bag.remaining}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-green-700" />
                    <span>
                      Nhận túi: <strong>{formatPickupWindow(bag.pickup_start, bag.pickup_end)}</strong> ({formatDateTime(bag.pickup_start).split(' ')[1]})
                    </span>
                  </div>

                  {bag.example_dishes && bag.example_dishes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {bag.example_dishes.map((dish, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-white px-2 py-0.5 text-[11px] text-slate-600 border border-slate-200"
                        >
                          {dish.emoji} {dish.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => handleCopyYesterday(bag)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    Sao chép sang hôm nay
                  </Button>

                  {bag.status === 'OPEN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => handleEditBag(bag)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      Sửa
                    </Button>
                  )}

                  {isCancellable && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={cancellingId === bag.id}
                      onClick={() => handleCancelBag(bag.id)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      {cancellingId === bag.id ? 'Đang hủy...' : 'Hủy túi'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bag Form Modal */}
      <BagFormModal
        storeId={store.id}
        open={showModal}
        onOpenChange={setShowModal}
        copyFrom={copyFromBag}
        editBag={editBag}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
