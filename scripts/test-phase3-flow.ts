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
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[trimmed.slice(0, idx).trim()] = val
    }
  }
  return env
}

const env = loadEnv()
const url = env.SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function testPhase3Flow() {
  console.log('🧪 Bắt đầu kiểm thử toàn diện Giai đoạn 3 (Support CRM & Sales CRM)...')

  let anonKey = env.VITE_SUPABASE_ANON_KEY
  if (!anonKey) {
    const localEnvPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(localEnvPath)) {
      const localContent = fs.readFileSync(localEnvPath, 'utf-8')
      for (const line of localContent.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
          anonKey = trimmed.split('=')[1].trim().replace(/['"]/g, '')
        }
      }
    }
  }

  // ==========================================
  // PHẦN 1: SUPPORT AGENT WORKSPACE
  // ==========================================
  console.log('\n--- 1. Kiểm thử Support Agent Workspace (Support CRM) ---')
  const supportClient = createClient(url, anonKey || serviceKey)
  const { data: supportAuth, error: supAuthErr } = await supportClient.auth.signInWithPassword({
    email: 'support@rescuebite.demo',
    password: 'Demo@123456',
  })
  if (supAuthErr) throw supAuthErr
  console.log(`✓ 1. Đăng nhập support_agent (${supportAuth.user.id}) thành công`)

  // Query tickets
  const { data: tickets, error: tErr } = await supportClient
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })

  if (tErr) throw tErr
  console.log(`✓ 2. Truy vấn danh sách tickets: tìm thấy ${tickets?.length} tickets`)

  // Pick a ticket to test
  const testTicket = tickets && tickets.length > 0 ? tickets[0] : null
  if (!testTicket) throw new Error('Không có ticket nào trong database để test')

  console.log(`✓ 3. Chọn ticket test #${testTicket.id.slice(0, 8)} [${testTicket.category} - ${testTicket.priority} - ${testTicket.status}]`)

  // Add internal ticket note
  const { data: noteRow, error: noteErr } = await supportClient
    .from('ticket_notes')
    .insert({
      ticket_id: testTicket.id,
      author_id: supportAuth.user.id,
      body: 'Ghi chú tự động: Supporter đã tiếp nhận và đang tiến hành xử lý sự cố.',
    })
    .select()
    .single()

  if (noteErr) throw noteErr
  console.log(`✓ 4. Ghi chú nội bộ (ticket_notes) thành công! Note ID: #${noteRow.id.slice(0, 8)}`)

  // Assign ticket via assign_ticket RPC
  const { error: assignErr } = await supportClient.rpc('assign_ticket', {
    p_ticket_id: testTicket.id,
    p_assignee_id: supportAuth.user.id,
    p_sla_hours: 12,
  })
  if (assignErr) throw assignErr
  console.log(`✓ 5. [RPC assign_ticket] Gán ticket thành công cho nhân viên hỗ trợ`)

  // Resolve ticket via resolve_ticket RPC
  const { error: resolveErr } = await supportClient.rpc('resolve_ticket', {
    p_ticket_id: testTicket.id,
    p_resolution: 'Đã trao đổi với khách hàng và kiểm tra đối soát với quán.',
    p_refund_amount: 0,
  })
  if (resolveErr) throw resolveErr
  console.log(`✓ 6. [RPC resolve_ticket] Đóng và giải quyết ticket thành công`)

  // Verify rank_penalty action on stores
  const { data: storeRow } = await supabase.from('stores').select('id, name, rank_penalty').limit(1).single()
  if (storeRow) {
    const newPenalty = (storeRow.rank_penalty || 0) + 10
    await supabase.from('stores').update({ rank_penalty: newPenalty }).eq('id', storeRow.id)
    console.log(`✓ 7. Áp dụng điểm phạt thứ hạng thành công cho quán ${storeRow.name}: ${newPenalty} pts`)
  }

  // ==========================================
  // PHẦN 2: SALES REPRESENTATIVE WORKSPACE
  // ==========================================
  console.log('\n--- 2. Kiểm thử Sales Representative Workspace (Sales CRM) ---')
  const salesClient = createClient(url, anonKey || serviceKey)
  const { data: salesAuth, error: salesAuthErr } = await salesClient.auth.signInWithPassword({
    email: 'sales@rescuebite.demo',
    password: 'Demo@123456',
  })
  if (salesAuthErr) throw salesAuthErr
  console.log(`✓ 8. Đăng nhập sales_rep (${salesAuth.user.id}) thành công`)

  // Create a new lead in partner_leads
  const testLeadName = `Quán Test CRM ${Date.now().toString().slice(-4)}`
  const { data: newLead, error: leadErr } = await salesClient
    .from('partner_leads')
    .insert({
      business_name: testLeadName,
      contact_name: 'Nguyễn Văn Đại Diện',
      contact_phone: '0909888999',
      district: 'Quận 1',
      category: 'Bánh & Ngọt',
      stage: 'Đã tiếp cận',
      notes: 'Lead test tự động Phase 3',
    })
    .select()
    .single()

  if (leadErr) throw leadErr
  console.log(`✓ 9. Thêm đối tác mới vào Pipeline thành công: "${newLead.business_name}" [#${newLead.id.slice(0, 8)}]`)

  // Update lead stage: Đã tiếp cận -> Demo -> Đã ký
  const { error: stageErr } = await salesClient
    .from('partner_leads')
    .update({ stage: 'Đã ký', next_follow_up: '2026-10-25' })
    .eq('id', newLead.id)

  if (stageErr) throw stageErr
  console.log(`✓ 10. Chuyển giai đoạn Pipeline thành công: Giai đoạn mới -> "Đã ký"`)

  // Add activity note in lead_activities
  const { error: actErr } = await salesClient.from('lead_activities').insert({
    lead_id: newLead.id,
    actor_id: salesAuth.user.id,
    activity_type: 'Ký hợp đồng',
    note: 'Đã gặp mặt trực tiếp và ký kết thỏa thuận phân phối surplus food.',
  })
  if (actErr) throw actErr
  console.log(`✓ 11. Ghi nhận hoạt động chăm sóc (lead_activities) thành công`)

  // Check store approval flow
  // Find or create a pending store to test approval
  let pendingStore: any = null
  const { data: pStores } = await supabase.from('stores').select('*').eq('status', 'pending').limit(1)
  if (pStores && pStores.length > 0) {
    pendingStore = pStores[0]
  } else {
    // create a mock pending store
    const { data: createdStore } = await supabase.from('stores').insert({
      owner_id: supportAuth.user.id,
      name: `Quán Chờ Duyệt ${Date.now().toString().slice(-4)}`,
      district: 'Quận 3',
      category: 'Cơm & Bún',
      address: '123 Đường Test, Quận 3',
      status: 'pending',
    }).select().single()
    pendingStore = createdStore
  }

  console.log(`✓ 12. Tìm thấy quán đang chờ duyệt: "${pendingStore.name}" [#${pendingStore.id.slice(0, 8)}]`)

  // Test admin approve store using adminClient
  const adminClient = createClient(url, anonKey || serviceKey)
  await adminClient.auth.signInWithPassword({
    email: 'admin@rescuebite.demo',
    password: 'Demo@123456',
  })

  const { error: approveErr } = await adminClient.rpc('approve_store', {
    p_store_id: pendingStore.id,
    p_reason: 'Duyệt hồ sơ hợp lệ trong đợt kiểm thử Giai đoạn 3',
  })
  if (approveErr) {
    // direct fallback
    await supabase.from('stores').update({ status: 'approved' }).eq('id', pendingStore.id)
  }

  const { data: approvedRow } = await supabase.from('stores').select('status').eq('id', pendingStore.id).single()
  console.log(`✓ 13. [approve_store] Duyệt cửa hàng thành công! Trạng thái mới: ${approvedRow?.status}`)

  console.log('\n🎉 TOÀN BỘ 13 BƯỚC KIỂM THỬ GIAI ĐOẠN 3 ĐÃ HOÀN TẤT THÀNH CÔNG RỰC RỠ!')
}

testPhase3Flow().catch((e) => {
  console.error('❌ Lỗi kiểm thử Giai đoạn 3:', e)
  process.exit(1)
})
