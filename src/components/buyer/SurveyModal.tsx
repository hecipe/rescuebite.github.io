import { useState } from 'react'
import { Award, Check, HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { SERVQUAL_DIMENSIONS } from '@/lib/constants'
import { parseError } from '@/lib/utils'

interface SurveyModalProps {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const DIMENSION_DESCRIPTIONS: Record<string, { exp: string; perc: string }> = {
  dim1: {
    exp: 'Kỳ vọng về sự sạch sẽ, bao bì và không gian nhận túi',
    perc: 'Thực tế nhận thấy về bao bì đóng gói và vệ sinh của quán',
  },
  dim2: {
    exp: 'Kỳ vọng quán chuẩn bị đúng giờ và túi đúng như cam kết',
    perc: 'Thực tế túi được chuẩn bị đúng hạn, đủ món, không bị hủy đột xuất',
  },
  dim3: {
    exp: 'Kỳ vọng nhân viên phục vụ nhanh chóng và nhiệt tình',
    perc: 'Thực tế tốc độ giao túi và thái độ hỗ trợ tại quầy',
  },
  dim4: {
    exp: 'Kỳ vọng an tâm về an toàn vệ sinh thực phẩm',
    perc: 'Thực tế sự tươi ngon và cảm giác tin cậy vào chất lượng món ăn',
  },
  dim5: {
    exp: 'Kỳ vọng cửa hàng thấu hiểu và lắng nghe khách cứu đồ ăn',
    perc: 'Thực tế sự niềm nở, trân trọng hành động cứu thực phẩm của bạn',
  },
}

export function SurveyModal({ orderId, open, onOpenChange, onSuccess }: SurveyModalProps) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Expectation defaults to 6 (high expectation), Perception defaults to 5
  const [ratings, setRatings] = useState<{
    dim1_exp: number
    dim1_perc: number
    dim2_exp: number
    dim2_perc: number
    dim3_exp: number
    dim3_perc: number
    dim4_exp: number
    dim4_perc: number
    dim5_exp: number
    dim5_perc: number
  }>({
    dim1_exp: 6,
    dim1_perc: 5,
    dim2_exp: 7,
    dim2_perc: 5,
    dim3_exp: 6,
    dim3_perc: 6,
    dim4_exp: 6,
    dim4_perc: 6,
    dim5_exp: 6,
    dim5_perc: 5,
  })

  function updateRating(key: string, val: number) {
    setRatings((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)
    setError(null)

    try {
      const { error: insertErr } = await supabase.from('survey_responses').insert({
        order_id: orderId,
        buyer_id: user.id,
        ...ratings,
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Award className="h-5 w-5 text-indigo-600" />
            Khảo sát chất lượng dịch vụ (SERVQUAL)
          </DialogTitle>
          <DialogDescription>
            Đánh giá 5 khía cạnh chất lượng theo thang điểm 1 (Rất kém) đến 7 (Rất xuất sắc) phục vụ nghiên cứu học thuật.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">Cảm ơn bạn đã tham gia khảo sát!</p>
            <p className="text-xs text-slate-500">Phản hồi của bạn đã được ghi nhận vào mô hình đo lường khoảng cách dịch vụ (SERVQUAL Gap).</p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">
              💡 <strong>Thang điểm 1 – 7</strong>: Hãy so sánh giữa <em>Kỳ vọng ban đầu</em> và <em>Thực tế cảm nhận</em> khi nhận túi.
            </div>

            {SERVQUAL_DIMENSIONS.map((dim, idx) => {
              const expKey = `${dim.key}_exp` as keyof typeof ratings
              const percKey = `${dim.key}_perc` as keyof typeof ratings
              const desc = DIMENSION_DESCRIPTIONS[dim.key]

              return (
                <div key={dim.key} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800">
                      {idx + 1}. {dim.label} ({dim.short})
                    </span>
                    <span className="text-xs font-mono text-slate-400">Dim {idx + 1}</span>
                  </div>

                  {/* Perception Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Thực tế cảm nhận:</span>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                        {ratings[percKey]} / 7
                      </span>
                    </div>
                    {desc && <p className="text-[11px] text-slate-400">{desc.perc}</p>}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updateRating(percKey, num)}
                          className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all ${
                            ratings[percKey] === num
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expectation Slider */}
                  <div className="space-y-1.5 border-t pt-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Kỳ vọng ban đầu:</span>
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {ratings[expKey]} / 7
                      </span>
                    </div>
                    {desc && <p className="text-[11px] text-slate-400">{desc.exp}</p>}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updateRating(expKey, num)}
                          className={`flex-1 py-1 rounded text-[11px] font-medium transition-all ${
                            ratings[expKey] === num
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Để sau
              </Button>
              <Button
                variant="brand"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : 'Gửi khảo sát SERVQUAL'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
