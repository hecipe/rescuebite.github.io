import { useState, useEffect } from 'react'
import {
  Users,
  Building,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Calendar,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LoadingPage, EmptyState } from '@/components/shared'
import { LeadDetailDrawer } from '@/components/crm/LeadDetailDrawer'
import { LEAD_STAGES, DISTRICTS, BAG_CATEGORIES } from '@/lib/constants'
import { parseError } from '@/lib/utils'

export default function PartnerCrmPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [activeStage, setActiveStage] = useState<string>('all')
  const [districtFilter, setDistrictFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Drawer
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Add Lead Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    business_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    district: 'Quận 1',
    category: 'Bánh & Ngọt',
    stage: 'Đã tiếp cận',
    notes: '',
  })
  const [addingLead, setAddingLead] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('partner_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setLeads(data || [])
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.business_name.trim() || !addForm.contact_name.trim()) {
      setAddError('Vui lòng nhập tên quán và người liên hệ')
      return
    }

    setAddingLead(true)
    setAddError(null)

    try {
      const { data, error: insErr } = await supabase
        .from('partner_leads')
        .insert({
          business_name: addForm.business_name.trim(),
          contact_name: addForm.contact_name.trim(),
          contact_phone: addForm.contact_phone.trim() || null,
          contact_email: addForm.contact_email.trim() || null,
          district: addForm.district,
          category: addForm.category,
          stage: addForm.stage as any,
          notes: addForm.notes.trim() || null,
        })
        .select()
        .single()

      if (insErr) throw insErr

      // Add initial activity
      if (data) {
        await supabase.from('lead_activities').insert({
          lead_id: data.id,
          activity_type: 'Khởi tạo',
          note: 'Tạo mới đối tác tiềm năng trong hệ thống',
        })
      }

      setShowAddModal(false)
      setAddForm({
        business_name: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        district: 'Quận 1',
        category: 'Bánh & Ngọt',
        stage: 'Đã tiếp cận',
        notes: '',
      })
      await fetchLeads()
    } catch (err) {
      setAddError(parseError(err))
    } finally {
      setAddingLead(false)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    if (activeStage !== 'all' && lead.stage !== activeStage) return false
    if (districtFilter !== 'all' && lead.district !== districtFilter) return false
    if (categoryFilter !== 'all' && lead.category !== categoryFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchName = (lead.business_name || '').toLowerCase().includes(term)
      const matchContact = (lead.contact_name || '').toLowerCase().includes(term)
      if (!matchName && !matchContact) return false
    }
    return true
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="h-6 w-6 text-green-700" />
            Quản trị Phễu Phát triển Đối tác (Merchant Pipeline CRM)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi hành trình tiếp cận, đàm phán và kích hoạt các cửa hàng surplus food
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Làm mới
          </Button>

          <Button
            variant="brand"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Thêm đối tác mới
          </Button>
        </div>
      </div>

      {/* Stage Flow Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <button
          onClick={() => setActiveStage('all')}
          className={`rounded-2xl border p-3.5 text-left transition-all ${
            activeStage === 'all'
              ? 'border-green-600 bg-green-50 shadow-sm ring-1 ring-green-600'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400">Tất cả</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{leads.length}</p>
        </button>

        {LEAD_STAGES.map((stg) => {
          const count = leads.filter((l) => l.stage === stg).length
          const isSelected = activeStage === stg

          return (
            <button
              key={stg}
              onClick={() => setActiveStage(stg)}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-green-700 bg-green-50 shadow-sm ring-1 ring-green-700'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">
                {stg}
              </span>
              <p className="text-xl font-bold text-green-700 mt-0.5">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Tìm theo tên quán hoặc người liên hệ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="w-40 text-xs h-9">
              <SelectValue placeholder="Quận" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả quận</SelectItem>
              {DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 text-xs h-9">
              <SelectValue placeholder="Ngành hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả ngành</SelectItem>
              {BAG_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads Table / Card Grid */}
      {loading ? (
        <LoadingPage />
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="Không tìm thấy đối tác nào"
          description="Chưa có lead đối tác nào thuộc giai đoạn này hoặc khớp với bộ lọc."
          action={
            <Button onClick={() => setShowAddModal(true)} variant="brand" size="sm">
              + Thêm đối tác ngay
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const stageStyle =
              lead.stage === 'Hoạt động'
                ? 'bg-green-100 text-green-800'
                : lead.stage === 'Đăng túi đầu tiên'
                ? 'bg-emerald-100 text-emerald-800'
                : lead.stage === 'Đã ký'
                ? 'bg-blue-100 text-blue-800'
                : lead.stage === 'Demo'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-700'

            return (
              <div
                key={lead.id}
                onClick={() => {
                  setSelectedLeadId(lead.id)
                  setDrawerOpen(true)
                }}
                className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md hover:border-green-600 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{lead.business_name}</h3>
                    <p className="text-xs text-slate-500">{lead.district} • {lead.category}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${stageStyle}`}>
                    {lead.stage}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-slate-800">👤 {lead.contact_name}</p>
                  {lead.contact_phone && (
                    <p className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {lead.contact_phone}
                    </p>
                  )}
                </div>

                {lead.next_follow_up && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-green-700" />
                      Hẹn liên hệ:
                    </span>
                    <span className="font-semibold text-slate-800">{lead.next_follow_up}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={fetchLeads}
      />

      {/* Add Lead Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Plus className="h-5 w-5 text-green-700" />
              Thêm đối tác tiềm năng mới
            </DialogTitle>
            <DialogDescription>
              Tạo hồ sơ lead đối tác để theo dõi quá trình thuyết phục gia nhập RescueBite.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-3.5 py-2">
            {addError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                {addError}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tên cửa hàng / thương hiệu *</Label>
              <Input
                placeholder="VD: Cơm Tấm Sài Gòn, Bánh Mì Chị Ba..."
                value={addForm.business_name}
                onChange={(e) => setAddForm({ ...addForm, business_name: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Người liên hệ *</Label>
                <Input
                  placeholder="Họ tên đại diện"
                  value={addForm.contact_name}
                  onChange={(e) => setAddForm({ ...addForm, contact_name: e.target.value })}
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Số điện thoại</Label>
                <Input
                  placeholder="0901234567"
                  value={addForm.contact_phone}
                  onChange={(e) => setAddForm({ ...addForm, contact_phone: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Khu vực (Quận)</Label>
                <Select
                  value={addForm.district}
                  onValueChange={(v) => setAddForm({ ...addForm, district: v })}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Loại hình</Label>
                <Select
                  value={addForm.category}
                  onValueChange={(v) => setAddForm({ ...addForm, category: v })}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BAG_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                disabled={addingLead}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="brand"
                size="sm"
                disabled={addingLead}
              >
                {addingLead ? 'Đang tạo...' : 'Lưu đối tác'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
