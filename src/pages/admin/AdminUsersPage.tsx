import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminTopBar } from '@/components/layout/TopBar'
import { rpcAdminSetRole, rpcAdminRevokeRole } from '@/lib/rpc'
import { Users, Search, Shield, ShieldAlert, Check, X, RefreshCw, UserCheck } from 'lucide-react'
import type { UserRole } from '@/types/database.types'

interface UserItem {
  id: string
  auth_user_id: string | null
  full_name: string
  phone: string | null
  district: string | null
  roles: UserRole[]
  created_at: string
}

const ALL_ROLES: { role: UserRole; label: string; color: string }[] = [
  { role: 'buyer', label: 'Người mua', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { role: 'store_owner', label: 'Chủ quán', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { role: 'support_agent', label: 'Hỗ trợ CRM', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { role: 'sales_rep', label: 'Kinh doanh', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { role: 'admin', label: 'Quản trị viên', color: 'bg-rose-100 text-rose-800 border-rose-300' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setMessage(null)
    try {
      // 1. Fetch profiles
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profErr) throw profErr

      // 2. Fetch all user_roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role')

      if (rolesErr) throw rolesErr

      // Map roles to profiles
      const rolesMap = new Map<string, UserRole[]>()
      rolesData?.forEach((r) => {
        const list = rolesMap.get(r.user_id) || []
        list.push(r.role as UserRole)
        rolesMap.set(r.user_id, list)
      })

      const combined: UserItem[] = (profiles || []).map((p) => {
        const uid = p.auth_user_id || p.id
        return {
          id: p.id,
          auth_user_id: p.auth_user_id,
          full_name: p.full_name || 'Người dùng chưa đặt tên',
          phone: p.phone,
          district: p.district,
          roles: p.auth_user_id ? rolesMap.get(p.auth_user_id) || ['buyer'] : ['buyer'],
          created_at: p.created_at,
        }
      })

      setUsers(combined)
    } catch (err) {
      console.error('Error fetching users:', err)
      setMessage({ text: 'Lỗi tải danh sách người dùng.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleRole(userItem: UserItem, targetRole: UserRole) {
    if (!userItem.auth_user_id) {
      setMessage({ text: 'Người dùng này chưa có tài khoản xác thực Auth.', type: 'error' })
      return
    }

    const hasRole = userItem.roles.includes(targetRole)
    if (hasRole && targetRole === 'buyer') {
      setMessage({ text: 'Không thể thu hồi quyền Người mua cơ bản.', type: 'error' })
      return
    }

    setUpdatingUserId(userItem.id)
    setMessage(null)
    try {
      if (hasRole) {
        // Revoke
        await rpcAdminRevokeRole(userItem.auth_user_id, targetRole)
        setMessage({ text: `Đã thu hồi quyền "${targetRole}" của ${userItem.full_name}`, type: 'success' })
      } else {
        // Grant
        await rpcAdminSetRole(userItem.auth_user_id, targetRole)
        setMessage({ text: `Đã cấp quyền "${targetRole}" cho ${userItem.full_name}`, type: 'success' })
      }
      await fetchUsers()
    } catch (err) {
      console.error('Error updating role:', err)
      setMessage({ text: err instanceof Error ? err.message : 'Lỗi cập nhật vai trò', type: 'error' })
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      (u.district && u.district.toLowerCase().includes(search.toLowerCase()))

    if (selectedRole === 'all') return matchesSearch
    return matchesSearch && u.roles.includes(selectedRole as UserRole)
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopBar
        title="Quản lý Người dùng & Phân quyền"
        actions={
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border rounded-xl hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner header */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh Sách Người Dùng & Phân Quyền</h2>
              <p className="text-sm text-slate-500">
                Quản lý các tài khoản hệ thống và gán các vai trò nghiệp vụ (Admin, Quán, Hỗ trợ, Kinh doanh)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-600">
              Tổng số: <strong>{users.length}</strong> người dùng
            </span>
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
            {message.text}
          </div>
        )}

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, số điện thoại, quận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedRole('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedRole === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả ({users.length})
            </button>
            {ALL_ROLES.map(({ role, label }) => {
              const count = users.filter((u) => u.roles.includes(role)).length
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedRole === role
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Người dùng</th>
                  <th className="px-4 py-3.5">Khu vực</th>
                  <th className="px-4 py-3.5">Số điện thoại</th>
                  <th className="px-6 py-3.5">Vai trò hiện tại</th>
                  <th className="px-6 py-3.5 text-right">Phân quyền thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Đang tải danh sách người dùng...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Không tìm thấy người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isUpdating = updatingUserId === u.id
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{u.full_name}</p>
                              <p className="text-xs text-slate-400">
                                {u.auth_user_id ? `ID: ${u.auth_user_id.slice(0, 8)}...` : 'Tài khoản demo'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{u.district || 'Chưa cập nhật'}</td>
                        <td className="px-4 py-4 text-slate-600 font-mono text-xs">{u.phone || '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles.map((r) => {
                              const rConfig = ALL_ROLES.find((item) => item.role === r)
                              return (
                                <span
                                  key={r}
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                    rConfig?.color || 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {r === 'admin' ? <Shield className="w-3 h-3 text-rose-600" /> : <UserCheck className="w-3 h-3" />}
                                  {rConfig?.label || r}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1 justify-end flex-wrap">
                            {ALL_ROLES.map(({ role, label }) => {
                              const hasThisRole = u.roles.includes(role)
                              if (role === 'buyer') return null // buyer is always present
                              return (
                                <button
                                  key={role}
                                  onClick={() => handleToggleRole(u, role)}
                                  disabled={isUpdating || !u.auth_user_id}
                                  title={hasThisRole ? `Thu hồi vai trò ${label}` : `Cấp vai trò ${label}`}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                    hasThisRole
                                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  } disabled:opacity-40`}
                                >
                                  {hasThisRole ? (
                                    <span className="flex items-center gap-1">
                                      <X className="w-3 h-3 text-rose-500" />
                                      Bỏ {label}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      + {label}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
