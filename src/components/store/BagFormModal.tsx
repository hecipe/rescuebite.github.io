import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, Sparkles, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BAG_CATEGORIES } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Bag, ExampleDish } from '@/types/database.types'
import { parseError } from '@/lib/utils'

interface BagFormModalProps {
  storeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  copyFrom?: Bag | null
  editBag?: Bag | null
  onSuccess?: () => void
}

const DEFAULT_EMOJIS = ['🍱', '🥪', '🥐', '🥗', '🍣', '🍕', '🍰', '🍜', '☕', '🍲']

export function BagFormModal({
  storeId,
  open,
  onOpenChange,
  copyFrom,
  editBag,
  onSuccess,
}: BagFormModalProps) {
  const [category, setCategory] = useState<string>('Bánh & Ngọt')
  const [quantity, setQuantity] = useState<number>(5)
  const [price, setPrice] = useState<number>(45000)
  const [retailMin, setRetailMin] = useState<number>(90000)
  const [retailMax, setRetailMax] = useState<number>(120000)

  // Pickup times formatted as YYYY-MM-DDTHH:mm for datetime-local
  const [pickupStart, setPickupStart] = useState<string>('')
  const [pickupEnd, setPickupEnd] = useState<string>('')

  const [dishes, setDishes] = useState<ExampleDish[]>([
    { name: 'Bánh sừng bò bơ Pháp', emoji: '🥐' },
    { name: 'Bánh mì gối ngũ cốc', emoji: '🍞' },
  ])
  const [newDishName, setNewDishName] = useState('')
  const [newDishEmoji, setNewDishEmoji] = useState('🍱')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize dates and fields
  useEffect(() => {
    if (open) {
      setError(null)
      const now = new Date()

      // Default pickup window: today 17:00 to 19:00
      const start = new Date(now)
      start.setHours(17, 0, 0, 0)
      const end = new Date(now)
      end.setHours(19, 0, 0, 0)

      const formatIsoLocal = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000
        return new Date(d.getTime() - offset).toISOString().slice(0, 16)
      }

      const source = editBag || copyFrom

      if (source) {
        setCategory(source.category)
        setQuantity(source.quantity)
        setPrice(source.price)
        setRetailMin(source.retail_min)
        setRetailMax(source.retail_max)
        setDishes(source.example_dishes && source.example_dishes.length > 0 ? source.example_dishes : [])

        // If editing, use existing dates; if copying, shift to today
        if (editBag) {
          setPickupStart(formatIsoLocal(new Date(source.pickup_start)))
          setPickupEnd(formatIsoLocal(new Date(source.pickup_end)))
        } else {
          setPickupStart(formatIsoLocal(start))
          setPickupEnd(formatIsoLocal(end))
        }
      } else {
        setCategory('Bánh & Ngọt')
        setQuantity(5)
        setPrice(45000)
        setRetailMin(90000)
        setRetailMax(120000)
        setPickupStart(formatIsoLocal(start))
        setPickupEnd(formatIsoLocal(end))
        setDishes([
          { name: 'Bánh sừng bò bơ Pháp', emoji: '🥐' },
          { name: 'Bánh mì gối ngũ cốc', emoji: '🍞' },
        ])
      }
    }
  }, [open, copyFrom, editBag])

  function handleAddDish() {
    if (!newDishName.trim()) return
    setDishes([...dishes, { name: newDishName.trim(), emoji: newDishEmoji }])
    setNewDishName('')
  }

  function handleRemoveDish(index: number) {
    setDishes(dishes.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validations
    if (quantity <= 0) {
      setError('Số lượng túi phải lớn hơn 0')
      return
    }
    if (price <= 0) {
      setError('Giá bán phải lớn hơn 0 VNĐ')
      return
    }
    if (retailMin <= price) {
      setError('Giá gốc ước tính tối thiểu phải cao hơn giá bán túi')
      return
    }
    if (retailMax < retailMin) {
      setError('Giá gốc tối đa không thể nhỏ hơn giá gốc tối thiểu')
      return
    }

    const startDate = new Date(pickupStart)
    const endDate = new Date(pickupEnd)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Vui lòng chọn thời gian nhận túi hợp lệ')
      return
    }
    if (endDate <= startDate) {
      setError('Thời gian kết thúc nhận túi phải sau thời gian bắt đầu')
      return
    }

    setSubmitting(true)

    try {
      const bagData = {
        store_id: storeId,
        category,
        quantity,
        remaining: editBag ? editBag.remaining : quantity,
        price,
        retail_min: retailMin,
        retail_max: retailMax,
        example_dishes: dishes,
        pickup_start: startDate.toISOString(),
        pickup_end: endDate.toISOString(),
        status: 'OPEN' as const,
      }

      if (editBag) {
        const { error: updateErr } = await supabase
          .from('bags')
          .update(bagData)
          .eq('id', editBag.id)

        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('bags').insert(bagData)
        if (insertErr) throw insertErr
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="h-5 w-5 text-green-600" />
            {editBag ? 'Chỉnh sửa túi bất ngờ' : copyFrom ? 'Sao chép túi hôm qua' : 'Đăng túi bất ngờ mới'}
          </DialogTitle>
          <DialogDescription>
            Tạo túi surplus food nhanh chóng trong dưới 1 phút.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Danh mục túi *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAG_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs font-semibold text-slate-700">
                Số lượng túi *
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-semibold text-slate-700">
                Giá bán (VNĐ) *
              </Label>
              <Input
                id="price"
                type="number"
                step={1000}
                min={5000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="retailMin" className="text-xs font-semibold text-slate-700">
                Giá gốc từ (VNĐ) *
              </Label>
              <Input
                id="retailMin"
                type="number"
                step={1000}
                min={10000}
                value={retailMin}
                onChange={(e) => setRetailMin(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="retailMax" className="text-xs font-semibold text-slate-700">
                Đến (VNĐ) *
              </Label>
              <Input
                id="retailMax"
                type="number"
                step={1000}
                min={10000}
                value={retailMax}
                onChange={(e) => setRetailMax(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Pickup Window */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Clock className="h-4 w-4 text-green-700" />
              Khung giờ khách đến nhận túi *
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pickupStart" className="text-[11px] text-slate-500">
                  Bắt đầu nhận
                </Label>
                <Input
                  id="pickupStart"
                  type="datetime-local"
                  value={pickupStart}
                  onChange={(e) => setPickupStart(e.target.value)}
                  className="bg-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pickupEnd" className="text-[11px] text-slate-500">
                  Kết thúc nhận
                </Label>
                <Input
                  id="pickupEnd"
                  type="datetime-local"
                  value={pickupEnd}
                  onChange={(e) => setPickupEnd(e.target.value)}
                  className="bg-white text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Example Dishes List */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Món ăn mẫu gợi ý (hiển thị cho người mua)
            </Label>

            <div className="flex flex-wrap gap-2">
              {dishes.map((dish, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm"
                >
                  <span>{dish.emoji}</span>
                  <span className="font-medium">{dish.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDish(idx)}
                    className="text-slate-400 hover:text-red-500 ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Select value={newDishEmoji} onValueChange={setNewDishEmoji}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_EMOJIS.map((em) => (
                    <SelectItem key={em} value={em}>
                      {em}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Tên món ví dụ (bánh kem, cơm gà...)"
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddDish()
                  }
                }}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDish}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="sm"
              disabled={submitting}
            >
              {submitting ? 'Đang lưu túi...' : editBag ? 'Cập nhật túi' : 'Đăng túi mở bán ngay'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
