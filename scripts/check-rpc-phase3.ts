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

async function testSupportFunctions() {
  console.log('assign_ticket:', await supabase.rpc('assign_ticket', { p_ticket_id: '00000000-0000-0000-0000-000000000000', p_assignee_id: '00000000-0000-0000-0000-000000000000' }))
  console.log('resolve_ticket:', await supabase.rpc('resolve_ticket', { p_ticket_id: '00000000-0000-0000-0000-000000000000', p_resolution: 'test' }))
  console.log('approve_store:', await supabase.rpc('approve_store', { p_store_id: '00000000-0000-0000-0000-000000000000' }))
  console.log('support_refund:', await supabase.rpc('support_refund', { p_ticket_id: '00000000-0000-0000-0000-000000000000', p_amount: 100 }))
}

testSupportFunctions()
