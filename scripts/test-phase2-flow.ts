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

async function testPhase2Flow() {
  console.log('🧪 Bắt đầu kiểm thử toàn diện luồng Giai đoạn 2...')

  // 1. Get demo buyer user
  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers()
  if (userErr) throw userErr

  const buyerUser = usersData.users.find((u) => u.email === 'buyer@rescuebite.demo')
  const storeUser = usersData.users.find((u) => u.email === 'store@rescuebite.demo')

  if (!buyerUser || !storeUser) {
    throw new Error('Không tìm thấy tài khoản demo buyer hoặc store')
  }

  console.log(`✓ 1. Tìm thấy demo buyer: ${buyerUser.id} và store_owner: ${storeUser.id}`)

  // 2. Find an OPEN bag
  const { data: bags, error: bagErr } = await supabase
    .from('bags')
    .select('*, stores(*)')
    .eq('status', 'OPEN')
    .gt('remaining', 0)
    .limit(1)

  if (bagErr || !bags || bags.length === 0) {
    throw new Error('Không có túi OPEN nào để test')
  }

  const testBag = bags[0]
  console.log(`✓ 2. Chọn túi test: ${testBag.id} (${testBag.category} - ${testBag.stores?.name}) - Còn ${testBag.remaining} túi`)

  // 3. Test RPC place_order as buyer using buyer client
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

  const buyerClient = createClient(url, anonKey || serviceKey)
  const { error: signInErr } = await buyerClient.auth.signInWithPassword({
    email: 'buyer@rescuebite.demo',
    password: 'Demo@123456',
  })
  if (signInErr) throw signInErr
  console.log('✓ 3. Đăng nhập buyerClient (buyer@rescuebite.demo) thành công')

  const { data: orderId, error: placeErr } = await buyerClient.rpc('place_order', {
    p_bag_id: testBag.id,
    p_qty: 1,
  })
  if (placeErr) throw placeErr
  console.log(`✓ 4. [RPC place_order] Thành công! Tạo đơn #${orderId}`)

  // Verify order in database
  const { data: orderRow } = await supabase.from('orders').select('*').eq('id', orderId).single()
  console.log(`   - Trạng thái đơn ban đầu: ${orderRow?.status} (Kỳ vọng: PENDING_PAYMENT)`)
  console.log(`   - Hạn giữ túi (hold_deadline): ${orderRow?.hold_deadline}`)

  // 4. Test RPC simulate_payment('success')
  const { data: payStatus, error: payErr } = await buyerClient.rpc('simulate_payment', {
    p_order_id: orderId,
    p_result: 'success',
  })
  if (payErr) throw payErr
  console.log(`✓ 5. [RPC simulate_payment] Thành công! Trạng thái mới: ${payStatus} (Kỳ vọng: PAID_AWAITING_PICKUP)`)

  // 5. Test RPC confirm_pickup
  await supabase.from('app_settings').upsert({ key: 'demo_ignore_window', value: 'true' })

  const { data: pickupStatus, error: pickupErr } = await buyerClient.rpc('confirm_pickup', {
    p_identifier: orderId,
  })
  if (pickupErr) throw pickupErr
  console.log(`✓ 6. [RPC confirm_pickup] Thành công! Trạng thái đơn: ${pickupStatus} (Kỳ vọng: PICKED_UP)`)

  // 6. Test Review insert
  const { data: reviewData, error: revErr } = await buyerClient.from('reviews').insert({
    order_id: orderId,
    buyer_id: buyerUser.id,
    store_id: testBag.store_id,
    rating: 5,
    matched_description: true,
    comment: 'Túi rất ngon và thơm, đúng cam kết!',
  }).select().single()
  if (revErr) throw revErr
  console.log(`✓ 7. [Table reviews] Ghi đánh giá 5 sao thành công! Review ID: #${reviewData.id}`)

  // 7. Test SERVQUAL Survey insert
  const { data: survData, error: survErr } = await buyerClient.from('survey_responses').insert({
    order_id: orderId,
    buyer_id: buyerUser.id,
    dim1_exp: 7, dim1_perc: 6,
    dim2_exp: 7, dim2_perc: 6,
    dim3_exp: 6, dim3_perc: 6,
    dim4_exp: 7, dim4_perc: 7,
    dim5_exp: 6, dim5_perc: 6,
  }).select().single()
  if (survErr) throw survErr
  console.log(`✓ 8. [Table survey_responses] Ghi khảo sát SERVQUAL 5 chiều thành công! Survey ID: #${survData.id}`)

  // 8. Test Cancel Order flow
  const { data: order2Id, error: place2Err } = await buyerClient.rpc('place_order', {
    p_bag_id: testBag.id,
    p_qty: 1,
  })
  if (place2Err) throw place2Err
  console.log(`✓ 9. [RPC place_order] Tạo đơn thứ 2 #${order2Id} để test hủy`)

  const { data: cancelStatus, error: cancelErr } = await buyerClient.rpc('cancel_order', {
    p_order_id: order2Id,
  })
  if (cancelErr) throw cancelErr
  console.log(`✓ 10. [RPC cancel_order] Hủy đơn thành công! Trạng thái: ${cancelStatus} (Kỳ vọng: CANCELLED)`)

  // 9. Test expire_orders RPC
  const { data: expireRes, error: expireErr } = await buyerClient.rpc('expire_orders')
  if (expireErr) throw expireErr
  console.log(`✓ 11. [RPC expire_orders] Thành công:`, expireRes)

  // 10. Test Store Owner Bags query
  const { data: storeBags, error: storeBagsErr } = await supabase
    .from('bags')
    .select('id, category, quantity, remaining, status')
    .eq('store_id', testBag.store_id)
  if (storeBagsErr) throw storeBagsErr
  console.log(`✓ 12. [Store Owner Bags] Quán có ${storeBags.length} túi trong danh mục quản lý`)

  // Reset demo_ignore_window back to false
  await supabase.from('app_settings').upsert({ key: 'demo_ignore_window', value: 'false' })

  console.log('\n🎉 TOÀN BỘ 12 BƯỚC KIỂM THỬ GIAI ĐOẠN 2 ĐÃ THÀNH CÔNG RỰC RỠ!')
}

testPhase2Flow().catch((e) => {
  console.error('❌ Lỗi kiểm thử:', e)
  process.exit(1)
})
