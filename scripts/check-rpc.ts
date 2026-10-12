import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env')
const content = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx !== -1) {
    let val = trimmed.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[trimmed.slice(0, idx).trim()] = val
  }
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const test1 = await sb.rpc('place_order', { p_bag_id: '00000000-0000-0000-0000-000000000000', p_qty: 1 })
  console.log('place_order with params:', test1.error?.message)

  const test2 = await sb.rpc('refresh_demo')
  console.log('refresh_demo:', test2.error?.message || 'OK')

  const test3 = await sb.rpc('set_app_setting', { p_key: 'commission_pct', p_value: '15' })
  console.log('set_app_setting with params:', test3.error?.message || 'OK')
}

main()
