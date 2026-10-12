import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const content = fs.readFileSync('.env', 'utf-8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/['"]/g, '')
    }
  }
  return env
}

const env = loadEnv()
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const res = await supabase.rpc('refresh_demo')
  console.log('refresh_demo result:', res)

  const adminApprove = await supabase.rpc('admin_approve_store', { p_store_id: '00000000-0000-0000-0000-000000000000', p_status: 'approved' })
  console.log('admin_approve_store result:', adminApprove)
}

check()
