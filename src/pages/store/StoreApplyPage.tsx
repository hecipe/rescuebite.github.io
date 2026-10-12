import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, MapPin, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { DISTRICTS, BAG_CATEGORIES } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseError } from '@/lib/utils'

export default function StoreApplyPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [district, setDistrict] = useState('')
  const [category, setCategory] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      navigate('/auth')
      return
    }

    if (!name.trim() || !district || !category || !address.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { error: insertErr } = await supabase.from('stores').insert({
        owner_id: user.id,
        name: name.trim(),
        district,
        category,
        address: address.trim(),
        description: description.trim() || '',
        status: 'pending',
      })

      if (insertErr) throw insertErr

      // Also create a partner lead record for CRM tracking
      await supabase.from('partner_leads').insert({
        business_name: name.trim(),
        contact_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Đối tác',
        contact_email: user.email,
        district,
        category,
        stage: 'Đã tiếp cận',
        notes: `Đăng ký từ biểu mẫu đối tác: ${address.trim()}`,
      })

      setSubmitted(true)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Đăng ký trở thành đối tác</h1>
          <p className="text-xs text-slate-500">Tham gia mạng lưới giảm lãng phí thực phẩm RescueBite</p>
        </div>
      </div>

      {submitted ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-green-900">Gửi hồ sơ thành công!</h2>
            <p className="text-xs text-green-700 mt-2 leading-relaxed">
              Cảm ơn bạn đã đăng ký. Đội ngũ RescueBite sẽ thẩm định thông tin và kích hoạt tài khoản đối tác trong vòng <strong>24 giờ làm việc</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={() => navigate('/store/dashboard')} variant="brand" className="w-full">
              Đến trang tổng quan đối tác
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
              Tên cửa hàng / quán ăn <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="VD: Tiệm Bánh Hoa Sữa, Quán Cơm Bà Năm..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Khu vực (Quận) <span className="text-red-500">*</span>
              </Label>
              <Select value={district} onValueChange={setDistrict} required>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn quận" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Loại hình ẩm thực <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-slate-700">
              Địa chỉ cửa hàng <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              placeholder="Số nhà, tên đường, phường..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
              Giới thiệu ngắn về quán
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Mô tả các món ăn đặc trưng, thời gian mở cửa thông thường..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
            ℹ️ Sau khi đăng ký, quản trị viên sẽ duyệt trạng thái cửa hàng sang <code>approved</code> và cấp vai trò <code>store_owner</code> để bạn có thể bắt đầu đăng bán túi bất ngờ.
          </div>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Đang gửi hồ sơ...' : 'Nộp hồ sơ đăng ký'}
          </Button>
        </form>
      )}
    </div>
  )
}
