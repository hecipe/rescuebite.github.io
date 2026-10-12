import { useState, useEffect } from 'react'
import {
  X,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  Tag,
  Activity,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LEAD_STAGES, DISTRICTS, BAG_CATEGORIES } from '@/lib/constants'
import { formatDateTime, parseError } from '@/lib/utils'

interface LeadDetailDrawerProps {
  leadId: string | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function LeadDetailDrawer({
  leadId,
  open,
  onClose,
  onUpdated,
}: LeadDetailDrawerProps) {
  const { user } = useAuth()
  const [lead, setLead] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Edit fields
  const [stage, setStage] = useState<string>('')
  const [nextFollowUp, setNextFollowUp] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // New activity form
  const [newActivityType, setNewActivityType] = useState<string>('Cuộc gọi')
  const [newActivityNote, setNewActivityNote] = useState<string>('')
  const [activitySubmitting, setActivitySubmitting] = useState(false)

  useEffect(() => {
    if (!leadId || !open) return
    fetchLeadData()
  }, [leadId, open])

  async function fetchLeadData() {
    if (!leadId) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Fetch lead
      const { data: leadData, error: lErr } = await supabase
        .from('partner_leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (lErr) throw lErr
      setLead(leadData)
      setStage(leadData.stage)
      setNextFollowUp(leadData.next_follow_up || '')
      setNotes(leadData.notes || '')

      // 2. Fetch lead activities
      const { data: actData } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      setActivities(actData || [])
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateLead() {
    if (!leadId) return
    setError(null)
    setSuccess(null)

    try {
      const { error: updErr } = await supabase
        .from('partner_leads')
        .update({
          stage,
          next_follow_up: nextFollowUp || null,
          notes,
        })
        .eq('id', leadId)

      if (updErr) throw updErr

      // Add activity entry if stage changed
      if (lead && lead.stage !== stage) {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          actor_id: user?.id,
          activity_type: 'Giai đoạn',
          note: `Đã chuyển giai đoạn từ "${lead.stage}" sang "${stage}"`,
        })
      }

      setSuccess('Cập nhật thông tin đối tác thành công!')
      await fetchLeadData()
      onUpdated()
    } catch (err) {
      setError(parseError(err))
    }
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!newActivityNote.trim() || !leadId) return

    setActivitySubmitting(true)
    setError(null)

    try {
      const { error: actErr } = await supabase.from('lead_activities').insert({
        lead_id: leadId,
        actor_id: user?.id,
        activity_type: newActivityType,
        note: newActivityNote.trim(),
      })

      if (actErr) throw actErr

      setNewActivityNote('')
      setSuccess('Đã ghi nhận hoạt động chăm sóc mới.')
      await fetchLeadData()
      onUpdated()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setActivitySubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl border-l bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50/60">
            <div>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-green-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {lead?.business_name || 'Chi tiết đối tác'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Khu vực: <strong>{lead?.district}</strong> • Ngành hàng: <strong>{lead?.category}</strong>
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {success && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pipeline Stage Controller */}
            <div className="rounded-2xl border-2 border-green-600 bg-green-50/40 p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-green-950 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-green-700" />
                Giai đoạn phát triển đối tác (Pipeline Stage)
              </label>

              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="bg-white font-semibold text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((stg) => (
                    <SelectItem key={stg} value={stg} className="text-xs">
                      {stg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Details */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Thông tin người liên hệ
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    Đại diện quán:
                  </span>
                  <span className="font-semibold text-slate-800">{lead?.contact_name}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    Số điện thoại:
                  </span>
                  <span className="font-semibold text-slate-800">{lead?.contact_phone || 'Chưa cập nhật'}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    Email liên hệ:
                  </span>
                  <span className="font-semibold text-slate-800">{lead?.contact_email || '—'}</span>
                </div>
              </div>
            </div>

            {/* Next Follow Up & Notes */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Lịch hẹn & Ghi chú quản lý
              </h4>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Hẹn liên hệ tiếp theo (Next Follow-Up)
                </label>
                <Input
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600">Ghi chú tổng quan</label>
                <Textarea
                  rows={2}
                  placeholder="Ghi chú về quán, thời gian hoạt động, thói quen surplus..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <Button
                variant="brand"
                size="sm"
                onClick={handleUpdateLead}
                className="w-full text-xs"
              >
                Lưu cập nhật đối tác
              </Button>
            </div>

            {/* Lead Activities Timeline */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-600" />
                Lịch sử hoạt động chăm sóc ({activities.length})
              </h4>

              {/* Add activity form */}
              <form onSubmit={handleAddActivity} className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                <div className="flex gap-2">
                  <Select value={newActivityType} onValueChange={setNewActivityType}>
                    <SelectTrigger className="w-32 bg-white text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cuộc gọi">Cuộc gọi</SelectItem>
                      <SelectItem value="Gặp mặt">Gặp mặt</SelectItem>
                      <SelectItem value="Demo ứng dụng">Demo ứng dụng</SelectItem>
                      <SelectItem value="Ký hợp đồng">Ký hợp đồng</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Nội dung trao đổi..."
                    value={newActivityNote}
                    onChange={(e) => setNewActivityNote(e.target.value)}
                    className="bg-white text-xs h-8"
                  />

                  <Button
                    type="submit"
                    size="sm"
                    variant="brand"
                    disabled={activitySubmitting || !newActivityNote.trim()}
                    className="h-8 text-xs shrink-0"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </form>

              {/* Activity entries */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">Chưa có nhật ký hoạt động nào.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="rounded-xl border bg-white p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {act.activity_type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(act.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-800 pt-0.5 leading-relaxed">{act.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
