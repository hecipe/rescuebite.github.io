import { useState } from 'react'
import { Star, Check, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { parseError } from '@/lib/utils'

interface ReviewModalProps {
  orderId: string
  storeId: string
  storeName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReviewModal({
  orderId,
  storeId,
  storeName,
  open,
  onOpenChange,
  onSuccess,
}: ReviewModalProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [matchedDescription, setMatchedDescription] = useState<boolean>(true)
  const [comment, setComment] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)
    setError(null)

    try {
      const { error: insertErr } = await supabase.from('reviews').insert({
        order_id: orderId,
        buyer_id: user.id,
        store_id: storeId,
        rating,
        matched_description: matchedDescription,
        comment: comment.trim() || null,
      })

      if (insertErr) throw insertErr

      setSubmitted(true)
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
      }, 1200)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Đánh giá túi bất ngờ
          </DialogTitle>
          <DialogDescription>
            {storeName ? `Chia sẻ trải nghiệm của bạn tại ${storeName}` : 'Đánh giá giúp cộng đồng giải cứu thực phẩm tốt hơn.'}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">Cảm ơn bạn đã đánh giá!</p>
            <p className="text-xs text-slate-500">Đóng góp của bạn giúp cộng đồng chọn lựa dễ dàng hơn.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Star Rating */}
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-slate-500">Mức độ hài lòng của bạn</p>
              <div className="flex justify-center items-center gap-1.5 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-amber-600">
                {rating === 5 && 'Tuyệt vời! 🌟'}
                {rating === 4 && 'Rất tốt 👍'}
                {rating === 3 && 'Tạm ổn 👌'}
                {rating === 2 && 'Chưa hài lòng 🙁'}
                {rating === 1 && 'Rất thất vọng 😞'}
              </p>
            </div>

            {/* Matched Description Question */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Túi có đúng với mô tả / giá trị cam kết không?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMatchedDescription(true)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold border transition-all ${
                    matchedDescription
                      ? 'border-green-600 bg-green-50 text-green-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  👍 Đúng cam kết
                </button>
                <button
                  type="button"
                  onClick={() => setMatchedDescription(false)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold border transition-all ${
                    !matchedDescription
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  👎 Không đúng mô tả
                </button>
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Nhận xét chi tiết (tùy chọn)</label>
              <Textarea
                rows={3}
                placeholder="Món ăn bên trong có ngon không? Nhân viên quán phục vụ thế nào?..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="text-xs"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Bỏ qua
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
