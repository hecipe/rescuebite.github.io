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

async function test() {
  const { data: bData, error: bErr } = await supabase.from('bags').select('id').limit(1).single()
  console.log('store_cancel_bag test:', await supabase.rpc('store_cancel_bag', { p_bag_id: bData?.id }))
  console.log('support_refund test:', await supabase.rpc('support_refund', { p_ticket_id: '00000000-0000-0000-0000-000000000000', p_amount: 1000 }))
}

test()
