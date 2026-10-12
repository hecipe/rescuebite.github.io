import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Parse .env file manually so no extra dependencies are needed
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env không tồn tại. Vui lòng tạo file .env từ .env.server.example')
    process.exit(1)
  }

  const content = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
  }
  return env
}

const env = loadEnv()
const supabaseUrl = env.SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface DemoAccount {
  email: string
  password: string
  fullName: string
  role: 'buyer' | 'store_owner' | 'support_agent' | 'sales_rep' | 'admin'
  phone: string
  district: string
}

const DEMO_USERS: DemoAccount[] = [
  {
    email: 'buyer@rescuebite.demo',
    password: 'Demo@123456',
    fullName: 'Nguyễn Văn Minh (Người mua Demo)',
    role: 'buyer',
    phone: '0901234567',
    district: 'Quận 1',
  },
  {
    email: 'store@rescuebite.demo',
    password: 'Demo@123456',
    fullName: 'Trần Thị Thu (Chủ quán Nắng Mai)',
    role: 'store_owner',
    phone: '0912345678',
    district: 'Quận 1',
  },
  {
    email: 'support@rescuebite.demo',
    password: 'Demo@123456',
    fullName: 'Lê Hoàng Nam (Hỗ trợ CSKH)',
    role: 'support_agent',
    phone: '0923456789',
    district: 'Bình Thạnh',
  },
  {
    email: 'sales@rescuebite.demo',
    password: 'Demo@123456',
    fullName: 'Phạm Quỳnh Nga (Kinh doanh Đối tác)',
    role: 'sales_rep',
    phone: '0934567890',
    district: 'Quận 3',
  },
  {
    email: 'admin@rescuebite.demo',
    password: 'Demo@123456',
    fullName: 'Võ Minh Trí (Quản trị hệ thống)',
    role: 'admin',
    phone: '0945678901',
    district: 'Quận 1',
  },
]

async function main() {
  console.log('🚀 Bắt đầu tạo 5 tài khoản demo cho RescueBite...\n')

  // Fetch all existing users from auth
  const { data: userListData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  })

  if (listError) {
    console.error('❌ Lỗi khi lấy danh sách auth users:', listError.message)
    process.exit(1)
  }

  const existingUsers = userListData.users || []

  for (const account of DEMO_USERS) {
    console.log(`▶ Đang xử lý: ${account.email} (${account.role})...`)
    const existing = existingUsers.find((u) => u.email?.toLowerCase() === account.email.toLowerCase())
    let userId: string

    if (existing) {
      console.log(`  ℹ User auth đã tồn tại (ID: ${existing.id}), cập nhật mật khẩu...`)
      const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      })
      if (updateErr) {
        console.error(`  ⚠️ Không thể cập nhật user: ${updateErr.message}`)
        userId = existing.id
      } else {
        userId = updated.user.id
      }
    } else {
      console.log(`  ➕ Tạo mới auth user...`)
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      })

      if (createErr || !created.user) {
        console.error(`  ❌ Lỗi tạo user ${account.email}:`, createErr?.message)
        continue
      }
      userId = created.user.id
    }

    // Upsert Profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(
        {
          auth_user_id: userId,
          full_name: account.fullName,
          phone: account.phone,
          district: account.district,
        },
        { onConflict: 'auth_user_id' }
      )

    if (profileErr) {
      console.error(`  ⚠️ Lỗi cập nhật profile: ${profileErr.message}`)
    } else {
      console.log(`  ✅ Profile đã cập nhật`)
    }

    // Upsert User Role
    // First, delete any mismatched roles for this user
    await supabase.from('user_roles').delete().eq('user_id', userId)

    const { error: roleErr } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: account.role,
    })

    if (roleErr) {
      console.error(`  ⚠️ Lỗi gán role: ${roleErr.message}`)
    } else {
      console.log(`  ✅ Role [${account.role}] đã được cấp`)
    }

    console.log(`  ✨ Hoàn tất: ${account.email}\n`)
  }

  console.log('🎉 Đã tạo/cập nhật xong 5 tài khoản demo!')
  console.log('----------------------------------------------------')
  console.log('1. Người mua:       buyer@rescuebite.demo   / Demo@123456')
  console.log('2. Chủ cửa hàng:    store@rescuebite.demo   / Demo@123456')
  console.log('3. Hỗ trợ viên:     support@rescuebite.demo / Demo@123456')
  console.log('4. Kinh doanh:      sales@rescuebite.demo   / Demo@123456')
  console.log('5. Quản trị viên:   admin@rescuebite.demo   / Demo@123456')
  console.log('----------------------------------------------------')
}

main().catch((err) => {
  console.error('❌ Lỗi không xác định:', err)
  process.exit(1)
})
