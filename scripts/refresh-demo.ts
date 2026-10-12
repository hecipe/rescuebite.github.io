import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env không tồn tại.')
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
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('🔄 Bắt đầu làm mới dữ liệu demo (refresh-demo)...')

  // Re-shift all bag pickup windows relative to now
  const now = new Date()

  // 1. Fetch all bags
  const { data: bags, error: bagErr } = await supabase.from('bags').select('id, quantity')
  if (bagErr) {
    console.error('❌ Lỗi lấy danh sách túi:', bagErr.message)
    process.exit(1)
  }

  console.log(`📦 Đang cập nhật lại khung giờ cho ${bags.length} túi...`)
  for (let i = 0; i < bags.length; i++) {
    const bag = bags[i]
    let pStart: Date
    let pEnd: Date
    let status: 'OPEN' | 'SOLD_OUT' | 'CLOSED' = 'OPEN'
    let remaining = bag.quantity

    if (i < 15) {
      // Open now
      pStart = new Date(now.getTime() - (i * 5) * 60000)
      pEnd = new Date(now.getTime() + (90 + i * 10) * 60000)
      remaining = Math.max(1, bag.quantity - (i % 3))
    } else if (i < 25) {
      // Tomorrow
      pStart = new Date(now.getTime() + 24 * 3600000 + (i * 15) * 60000)
      pEnd = new Date(pStart.getTime() + 2 * 3600000)
    } else {
      // Closed / Past
      pStart = new Date(now.getTime() - 24 * 3600000)
      pEnd = new Date(now.getTime() - 20 * 3600000)
      status = 'CLOSED'
      remaining = 0
    }

    await supabase
      .from('bags')
      .update({
        pickup_start: pStart.toISOString(),
        pickup_end: pEnd.toISOString(),
        status: status,
        remaining: remaining,
      })
      .eq('id', bag.id)
  }

  console.log('✅ Đã làm mới toàn bộ khung giờ nhận túi thành công!')
  console.log('✨ Túi hôm nay đang mở từ bây giờ đến chiều tối.')
}

main().catch((err) => {
  console.error('❌ Lỗi làm mới demo:', err)
  process.exit(1)
})
