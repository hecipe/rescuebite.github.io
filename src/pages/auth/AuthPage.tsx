import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InlineAlert } from '@/components/shared'
import { useAuth } from '@/hooks/useAuth'
import { DEMO_ACCOUNTS } from '@/lib/constants'
import { parseError } from '@/lib/utils'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickLoginIdx, setQuickLoginIdx] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (tab === 'login') {
        await signIn(email, password)
      } else {
        if (!fullName.trim()) throw new Error('Vui lòng nhập họ và tên.')
        await signUp(email, password, fullName)
      }
      // Navigation handled by AuthLayout
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickLogin(idx: number) {
    const acc = DEMO_ACCOUNTS[idx]
    setQuickLoginIdx(idx)
    setError(null)
    try {
      await signIn(acc.email, acc.password)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setQuickLoginIdx(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo size="lg" variant="full" />
          <p className="text-center text-sm text-slate-500">
            Cứu thức ăn thừa – Tiết kiệm tiền – Bảo vệ môi trường 🌱
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => { setTab('login'); setError(null) }}
          >
            Đăng nhập
          </button>
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => { setTab('signup'); setError(null) }}
          >
            Đăng ký
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <InlineAlert type="error" message={error} />}

          <Button type="submit" className="w-full" variant="brand" size="lg" disabled={loading}>
            {loading ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Button>
        </form>

        {/* Quick Login */}
        {tab === 'login' && (
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-br from-green-50 to-orange-50 px-3 text-xs text-slate-500">
                  Đăng nhập nhanh (Demo)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={acc.email}
                  onClick={() => handleQuickLogin(idx)}
                  disabled={quickLoginIdx !== null}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-60"
                >
                  <span className="text-lg">
                    {['🛒', '🏪', '🎧', '💼', '⚙️'][idx]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{acc.label}</p>
                    <p className="text-xs text-slate-500 truncate">{acc.email}</p>
                  </div>
                  {quickLoginIdx === idx && (
                    <span className="text-xs text-green-600">Đang vào...</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
