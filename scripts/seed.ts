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

// Simple seeded PRNG for deterministic data
let seedVal = 42
function seededRandom() {
  seedVal = (seedVal * 9301 + 49297) % 233280
  return seedVal / 233280
}

function randInt(min: number, max: number) {
  return Math.floor(seededRandom() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)]
}

// 12 Stores
const STORES_DATA = [
  { name: 'Tiệm Bánh Nắng Mai', district: 'Quận 1', category: 'Bánh & Ngọt', address: '45 Lê Lợi, Bến Nghé' },
  { name: 'Lò Bánh Hoa Sữa', district: 'Quận 3', category: 'Bánh & Ngọt', address: '128 Nam Kỳ Khởi Nghĩa, Võ Thị Sáu' },
  { name: 'Cơm Tấm Bà Tư', district: 'Bình Thạnh', category: 'Cơm & Bún', address: '210 Bạch Đằng, Phường 24' },
  { name: 'Quán Chay An Nhiên', district: 'Phú Nhuận', category: 'Chay', address: '84 Phan Xích Long, Phường 2' },
  { name: 'Sushi Kaze', district: 'Quận 1', category: 'Sushi & Nhật', address: '15 Thái Văn Lung, Bến Nghé' },
  { name: 'Cà Phê Góc Phố', district: 'Thủ Đức', category: 'Cà phê & Đồ uống', address: '36 Võ Văn Ngân, Linh Chiểu' },
  { name: 'Bún Chả Cô Lan', district: 'Quận 3', category: 'Cơm & Bún', address: '72 Trương Định, Võ Thị Sáu' },
  { name: 'Siêu Thị Mini Xanh', district: 'Gò Vấp', category: 'Siêu thị', address: '195 Quang Trung, Phường 10' },
  { name: 'Chè Dì Năm', district: 'Quận 5', category: 'Bánh & Ngọt', address: '54 An Dương Vương, Phường 9' },
  { name: 'Bánh Mì Chú Hải', district: 'Tân Bình', category: 'Cơm & Bún', address: '33 Hoàng Hoa Thám, Phường 13' },
  { name: 'Pizza Nhà Lò', district: 'Quận 7', category: 'Pizza & Âu', address: '102 Nguyễn Thị Thập, Tân Phú' },
  { name: 'Tiệm Ngọt Mây', district: 'Phú Nhuận', category: 'Bánh & Ngọt', address: '19 Hoa Mai, Phường 2' },
]

// 40 Dishes
const DISHES_DATA = [
  { name: 'Bánh croissant bơ', emoji: '🥐', category: 'Bánh & Ngọt', retail_price: 35000 },
  { name: 'Bánh su kem vani', emoji: '🧁', category: 'Bánh & Ngọt', retail_price: 25000 },
  { name: 'Bánh flan caramen', emoji: '🍮', category: 'Bánh & Ngọt', retail_price: 20000 },
  { name: 'Tiramisu mini', emoji: '🍰', category: 'Bánh & Ngọt', retail_price: 45000 },
  { name: 'Bánh bông lan trứng muối', emoji: '🥮', category: 'Bánh & Ngọt', retail_price: 30000 },
  { name: 'Cookie socola hạnh nhân', emoji: '🍪', category: 'Bánh & Ngọt', retail_price: 22000 },
  { name: 'Sandwich trứng phô mai', emoji: '🥪', category: 'Bánh & Ngọt', retail_price: 28000 },
  { name: 'Chè Thái sầu riêng', emoji: '🍧', category: 'Bánh & Ngọt', retail_price: 30000 },
  { name: 'Chè khúc bạch thanh mát', emoji: '🍨', category: 'Bánh & Ngọt', retail_price: 28000 },
  { name: 'Bánh tart trứng Bồ Đào Nha', emoji: '🥧', category: 'Bánh & Ngọt', retail_price: 22000 },
  { name: 'Bánh donut socola phủ dừa', emoji: '🍩', category: 'Bánh & Ngọt', retail_price: 26000 },
  { name: 'Bánh muffin việt quất', emoji: '🧁', category: 'Bánh & Ngọt', retail_price: 32000 },

  { name: 'Cơm tấm sườn bì chả', emoji: '🍛', category: 'Cơm & Bún', retail_price: 55000 },
  { name: 'Cơm gà xối mỡ giòn da', emoji: '🍗', category: 'Cơm & Bún', retail_price: 50000 },
  { name: 'Bún chả Hà Nội nướng than', emoji: '🍜', category: 'Cơm & Bún', retail_price: 60000 },
  { name: 'Bún chả giò thịt heo', emoji: '🥗', category: 'Cơm & Bún', retail_price: 45000 },
  { name: 'Bánh mì thịt nướng sả', emoji: '🥖', category: 'Cơm & Bún', retail_price: 30000 },
  { name: 'Bánh mì ốp la xúc xích', emoji: '🍳', category: 'Cơm & Bún', retail_price: 25000 },
  { name: 'Gỏi cuốn tôm thịt (2 cuốn)', emoji: '🥟', category: 'Cơm & Bún', retail_price: 24000 },
  { name: 'Xôi mặn thập cẩm lạp xưởng', emoji: '🍙', category: 'Cơm & Bún', retail_price: 25000 },
  { name: 'Phở bò tái nạm', emoji: '🍲', category: 'Cơm & Bún', retail_price: 65000 },
  { name: 'Hủ tiếu Nam Vang khô', emoji: '🍜', category: 'Cơm & Bún', retail_price: 55000 },

  { name: 'Sushi cá hồi tươi (6 miếng)', emoji: '🍣', category: 'Sushi & Nhật', retail_price: 120000 },
  { name: 'Kimbap rong biển truyền thống', emoji: '🍱', category: 'Sushi & Nhật', retail_price: 40000 },
  { name: 'Sashimi cá hồi (4 lát)', emoji: '🐟', category: 'Sushi & Nhật', retail_price: 95000 },
  { name: 'Cơm bò xào Gyudon Nhật', emoji: '🍚', category: 'Sushi & Nhật', retail_price: 75000 },

  { name: 'Pizza margherita nướng củi', emoji: '🍕', category: 'Pizza & Âu', retail_price: 45000 },
  { name: 'Salad ức gà sốt mè rang', emoji: '🥗', category: 'Pizza & Âu', retail_price: 65000 },
  { name: 'Mì Ý sốt bò bằm Bolognese', emoji: '🍝', category: 'Pizza & Âu', retail_price: 70000 },
  { name: 'Khoai tây chiên lắc phô mai', emoji: '🍟', category: 'Pizza & Âu', retail_price: 35000 },

  { name: 'Cơm chay nấm kho tiêu', emoji: '🍲', category: 'Chay', retail_price: 45000 },
  { name: 'Đậu hũ non sốt cà chua', emoji: '🥘', category: 'Chay', retail_price: 35000 },
  { name: 'Chả giò chay nấm hạt sen', emoji: '🥢', category: 'Chay', retail_price: 30000 },
  { name: 'Canh rong biển đậu hũ chay', emoji: '🥣', category: 'Chay', retail_price: 25000 },

  { name: 'Trà đào cam sả tươi', emoji: '🍹', category: 'Cà phê & Đồ uống', retail_price: 40000 },
  { name: 'Cà phê sữa đá pha phin', emoji: '☕', category: 'Cà phê & Đồ uống', retail_price: 28000 },
  { name: 'Trà sữa trân châu đường đen', emoji: '🧋', category: 'Cà phê & Đồ uống', retail_price: 42000 },
  { name: 'Nước ép cam nguyên chất', emoji: '🍊', category: 'Cà phê & Đồ uống', retail_price: 35000 },

  { name: 'Sữa chua dâu tây hộp lớn', emoji: '🥛', category: 'Siêu thị', retail_price: 30000 },
  { name: 'Bánh quy bơ hộp thiếc', emoji: '🍪', category: 'Siêu thị', retail_price: 55000 },
]

// 60 Fake Vietnamese Names
const VIETNAMESE_NAMES = [
  'Nguyễn Văn An', 'Trần Thị Mai', 'Lê Hoàng Long', 'Phạm Minh Đức', 'Hoàng Thu Trang',
  'Võ Hải Yến', 'Đặng Quốc Bảo', 'Bùi Ngọc Hân', 'Đỗ Thanh Tùng', 'Ngô Phương Thảo',
  'Dương Gia Huy', 'Lý Kim Ngân', 'Vũ Đình Trọng', 'Mai Bảo Châu', 'Đinh Hữu Phước',
  'Trịnh Cẩm Tú', 'Lâm Tuấn Kiệt', 'Hồ Mỹ Linh', 'Phan Trọng Nhân', 'Cao Thùy Dung',
  'Tạ Quang Khải', 'Lương Diệu Huyền', 'Đoàn Nhật Minh', 'Quách Bích Trâm', 'Hà Vĩnh Phát',
  'Trương Đăng Khoa', 'Bạch Tuyết Mai', 'Huỳnh Công Thành', 'Vương Lan Anh', 'Phùng Thế Hiển',
  'Thái Diễm My', 'Nghiêm Minh Nhật', 'Tống Khánh Linh', 'Tô Quốc Dũng', 'Nhan Chí Cường',
  'Từ Như Quỳnh', 'Khổng Minh Tâm', 'Dư Gia Bảo', 'Ân Thiên Phúc', 'Lạc Tấn Đạt',
  'Chu Thùy Linh', 'Thạch Thảo Vy', 'Vi Tuấn Anh', 'La Thành Đạt', 'Quản Bảo Ngọc',
  'Khuất Duy Tiến', 'Biện Hoài An', 'Giáp Văn Toàn', 'Doãn Thúy Hằng', 'Bành Quốc Thịnh',
  'Lữ Thanh Phong', 'Ôn Mỹ Hạnh', 'Trầm Hữu Tài', 'Triệu Vĩnh Hưng', 'Chế Nhật Nam',
  'Mã Khả Doanh', 'Hứa Tấn Lộc', 'Đậu Thị Loan', 'Sầm Ngọc Sơn', 'Văn Công Lý'
]

async function main() {
  console.log('🌱 Bắt đầu tạo Seed Data cho RescueBite...\n')

  // Find demo store owner & buyer
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 100 })
  const users = authUsers?.users || []
  const demoStoreUser = users.find((u) => u.email === 'store@rescuebite.demo')
  const demoBuyerUser = users.find((u) => u.email === 'buyer@rescuebite.demo')
  const fallbackOwnerId = demoStoreUser?.id || users[0]?.id

  if (!fallbackOwnerId) {
    console.error('❌ Cần tạo demo users trước bằng lệnh: npm run create-demo-users')
    process.exit(1)
  }

  // 1. STORES
  console.log('🏪 1. Đang tạo 12 cửa hàng tại TP.HCM...')
  const storeMap: Record<string, string> = {}
  for (let i = 0; i < STORES_DATA.length; i++) {
    const s = STORES_DATA[i]
    // Tiệm Bánh Nắng Mai owned by demoStoreUser, others by same or fallback
    const ownerId = i === 0 && demoStoreUser ? demoStoreUser.id : fallbackOwnerId
    // Give store 8 and 10 some rank penalty so N4 displays all 3 status levels
    const penalty = i === 8 ? 60 : i === 10 ? 110 : 0

    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('name', s.name)
      .maybeSingle()

    let storeId: string
    if (existingStore) {
      storeId = existingStore.id
      await supabase
        .from('stores')
        .update({ status: 'approved', rank_penalty: penalty, owner_id: ownerId })
        .eq('id', storeId)
    } else {
      const { data: newStore, error } = await supabase
        .from('stores')
        .insert({
          owner_id: ownerId,
          name: s.name,
          district: s.district,
          category: s.category,
          address: s.address,
          description: `Cửa hàng uy tín chuyên cung cấp các phần ăn ngon chất lượng tại ${s.district}.`,
          status: 'approved',
          rank_penalty: penalty,
        })
        .select('id')
        .single()
      if (error || !newStore) {
        console.error(`  ⚠️ Lỗi tạo store ${s.name}:`, error?.message)
        continue
      }
      storeId = newStore.id
    }
    storeMap[s.name] = storeId
  }
  console.log(`  ✅ Đã tạo/cập nhật 12 cửa hàng.`)

  // 2. DISHES
  console.log('🍲 2. Đang tạo 40 món ăn mẫu...')
  const storeIds = Object.values(storeMap)
  for (let i = 0; i < DISHES_DATA.length; i++) {
    const dish = DISHES_DATA[i]
    const storeId = storeIds[i % storeIds.length]
    await supabase.from('dishes').insert({
      store_id: storeId,
      name: dish.name,
      emoji: dish.emoji,
      category: dish.category,
      retail_price: dish.retail_price,
    })
  }
  console.log(`  ✅ Đã lưu 40 món ăn vào thực đơn.`)

  // 3. FAKE BUYER PROFILES (60 profiles, auth_user_id = null for historical)
  console.log('👥 3. Đang tạo 60 hồ sơ người mua...')
  const buyerProfileIds: string[] = []

  // Ensure demo buyer profile is first
  if (demoBuyerUser) {
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', demoBuyerUser.id)
      .maybeSingle()
    if (buyerProfile) buyerProfileIds.push(buyerProfile.id)
  }

  for (let i = 0; i < VIETNAMESE_NAMES.length; i++) {
    const name = VIETNAMESE_NAMES[i]
    const district = pickRandom(STORES_DATA).district
    const { data: prof } = await supabase
      .from('profiles')
      .insert({
        auth_user_id: null,
        full_name: name,
        phone: `09${randInt(10000000, 99999999)}`,
        district: district,
      })
      .select('id')
      .single()
    if (prof) buyerProfileIds.push(prof.id)
  }
  console.log(`  ✅ Đã tạo ${buyerProfileIds.length} người mua.`)

  // 4. BAGS (~30 bags)
  console.log('🛍️ 4. Đang tạo 30 túi bất ngờ...')
  const now = new Date()
  const bagIds: string[] = []

  for (let i = 0; i < 30; i++) {
    const storeName = STORES_DATA[i % STORES_DATA.length].name
    const storeId = storeMap[storeName]
    const category = STORES_DATA[i % STORES_DATA.length].category

    // Pick 3-5 example dishes
    const bagDishes = [
      pickRandom(DISHES_DATA),
      pickRandom(DISHES_DATA),
      pickRandom(DISHES_DATA),
    ]
    const retailMin = bagDishes.reduce((sum, d) => sum + d.retail_price, 0)
    const retailMax = retailMin + randInt(20000, 45000)
    // Price is roughly 35-50% of retail
    const price = Math.round((retailMin * (0.35 + seededRandom() * 0.15)) / 1000) * 1000
    const qty = randInt(3, 10)

    // Schedule windows:
    // First 15: open today with windows covering now to +3 hours
    // Next 10: open tomorrow
    // Last 5: already SOLD_OUT or CLOSED
    let pStart: Date
    let pEnd: Date
    let status: 'OPEN' | 'SOLD_OUT' | 'CLOSED' = 'OPEN'
    let remaining = qty

    if (i < 15) {
      // Open now or in 1-2 hours
      pStart = new Date(now.getTime() - randInt(30, 90) * 60000)
      pEnd = new Date(now.getTime() + randInt(90, 240) * 60000)
      remaining = randInt(1, qty)
      status = 'OPEN'
    } else if (i < 25) {
      // Tomorrow
      pStart = new Date(now.getTime() + (20 + randInt(0, 8)) * 3600000)
      pEnd = new Date(pStart.getTime() + 2 * 3600000)
      remaining = qty
      status = 'OPEN'
    } else {
      // Past / closed
      pStart = new Date(now.getTime() - 24 * 3600000)
      pEnd = new Date(now.getTime() - 20 * 3600000)
      remaining = 0
      status = i % 2 === 0 ? 'SOLD_OUT' : 'CLOSED'
    }

    const { data: bag } = await supabase
      .from('bags')
      .insert({
        store_id: storeId,
        category: category,
        quantity: qty,
        remaining: remaining,
        price: price,
        retail_min: retailMin,
        retail_max: retailMax,
        example_dishes: bagDishes.map((d) => ({ name: d.name, emoji: d.emoji })),
        pickup_start: pStart.toISOString(),
        pickup_end: pEnd.toISOString(),
        status: status,
      })
      .select('id')
      .single()

    if (bag) bagIds.push(bag.id)
  }
  console.log(`  ✅ Đã tạo ${bagIds.length} túi bất ngờ.`)

  // 5. HISTORICAL ORDERS (~500 orders across 6 months)
  console.log('📦 5. Đang tạo ~500 đơn hàng lịch sử...')
  const orderIds: string[] = []
  const buyerAuthId = demoBuyerUser?.id || fallbackOwnerId

  for (let i = 0; i < 500; i++) {
    const bagId = pickRandom(bagIds)
    // 70% PICKED_UP, 10% NO_SHOW, 10% CANCELLED, 10% REFUNDED
    const roll = seededRandom()
    let status: 'PICKED_UP' | 'NO_SHOW' | 'CANCELLED' | 'REFUNDED' = 'PICKED_UP'
    if (roll > 0.90) status = 'REFUNDED'
    else if (roll > 0.80) status = 'CANCELLED'
    else if (roll > 0.70) status = 'NO_SHOW'

    // Spread across past 180 days
    const pastDays = randInt(1, 180)
    const createdAt = new Date(now.getTime() - pastDays * 86400000 - randInt(0, 86400) * 1000)
    const qty = randInt(1, 2)
    const price = randInt(35000, 75000) * qty

    const { data: ord } = await supabase
      .from('orders')
      .insert({
        bag_id: bagId,
        buyer_id: buyerAuthId,
        status: status,
        qty: qty,
        total_price: price,
        created_at: createdAt.toISOString(),
      })
      .select('id')
      .single()

    if (ord) orderIds.push(ord.id)
  }
  console.log(`  ✅ Đã tạo ${orderIds.length} đơn hàng.`)

  // 6. REVIEWS (~150 reviews)
  console.log('⭐ 6. Đang tạo 150 đánh giá...')
  for (let i = 0; i < 150; i++) {
    const ordId = orderIds[i % orderIds.length]
    const storeId = pickRandom(storeIds)
    const rating = seededRandom() > 0.2 ? randInt(4, 5) : randInt(2, 3)
    const matched = rating >= 4 || seededRandom() > 0.3

    await supabase.from('reviews').insert({
      order_id: ordId,
      buyer_id: buyerAuthId,
      store_id: storeId,
      rating: rating,
      matched_description: matched,
      comment: rating >= 4 ? 'Đồ ăn rất ngon, đóng gói sạch sẽ!' : 'Hôm nay hơi ít món so với mong đợi.',
    })
  }
  console.log(`  ✅ Đã tạo 150 đánh giá.`)

  // 7. SERVQUAL SURVEY RESPONSES (80 responses, Độ tin cậy has largest negative gap)
  console.log('📊 7. Đang tạo 80 phản hồi khảo sát SERVQUAL...')
  for (let i = 0; i < 80; i++) {
    // dim1 Tangibles: exp ~5.2, perc ~5.4 (gap >= 0)
    // dim2 Reliability: exp ~6.5, perc ~4.5 (gap strongly negative: -2.0)
    // dim3 Responsiveness: exp ~5.8, perc ~5.3 (gap ~ -0.5)
    // dim4 Assurance: exp ~5.5, perc ~5.2 (gap ~ -0.3)
    // dim5 Empathy: exp ~5.0, perc ~4.9 (gap ~ -0.1)
    await supabase.from('survey_responses').insert({
      buyer_id: buyerAuthId,
      dim1_exp: randInt(5, 6),
      dim1_perc: randInt(5, 7),
      dim2_exp: randInt(6, 7),
      dim2_perc: randInt(3, 5), // Reliability deliberately lower!
      dim3_exp: randInt(5, 6),
      dim3_perc: randInt(4, 6),
      dim4_exp: randInt(5, 6),
      dim4_perc: randInt(5, 6),
      dim5_exp: randInt(4, 6),
      dim5_perc: randInt(4, 6),
    })
  }
  console.log(`  ✅ Đã tạo 80 phản hồi SERVQUAL (chiều Độ tin cậy có gap âm cao nhất).`)

  // 8. TICKETS (~25 tickets)
  console.log('🎫 8. Đang tạo 25 phiếu yêu cầu hỗ trợ...')
  const categories: ('không có túi' | 'không đúng mô tả' | 'an toàn thực phẩm' | 'thanh toán' | 'khác')[] = [
    'không có túi', 'không đúng mô tả', 'an toàn thực phẩm', 'thanh toán', 'khác'
  ]
  const priorities: ('Thấp' | 'Trung bình' | 'Cao' | 'Khẩn')[] = ['Thấp', 'Trung bình', 'Cao', 'Khẩn']
  const statuses: ('Mới' | 'Đang xử lý' | 'Đã xử lý' | 'Đóng')[] = ['Mới', 'Đang xử lý', 'Đã xử lý', 'Đóng']

  for (let i = 0; i < 25; i++) {
    const isOverdue = i < 5 // 5 overdue tickets for testing SLA badge
    const slaDue = isOverdue
      ? new Date(now.getTime() - randInt(2, 24) * 3600000).toISOString()
      : new Date(now.getTime() + randInt(4, 48) * 3600000).toISOString()

    await supabase.from('tickets').insert({
      order_id: orderIds[i % orderIds.length] || null,
      buyer_id: buyerAuthId,
      category: categories[i % categories.length],
      priority: priorities[i % priorities.length],
      status: statuses[i % statuses.length],
      sla_due_at: slaDue,
      description: `Khách hàng phản ánh sự cố đơn hàng: ${categories[i % categories.length]}. Cần nhân viên hỗ trợ xử lý.`,
      refund_amount: i % 4 === 0 ? 45000 : 0,
    })
  }
  console.log(`  ✅ Đã tạo 25 phiếu yêu cầu hỗ trợ (có kèm vé quá hạn SLA).`)

  // 9. PARTNER LEADS (12 leads across 5 stages)
  console.log('🤝 9. Đang tạo 12 đối tác tiềm năng (Kanban CRM)...')
  const stages: ('Đã tiếp cận' | 'Demo' | 'Đã ký' | 'Đăng túi đầu tiên' | 'Hoạt động')[] = [
    'Đã tiếp cận', 'Demo', 'Đã ký', 'Đăng túi đầu tiên', 'Hoạt động'
  ]
  const leadBusinesses = [
    'Bánh Mì Kẹp Sài Gòn', 'Trà Sữa Cây Si', 'Tiệm Cơm Thảo Điền', 'Lò Bánh Pháp Paris',
    'Phở Gia Truyền 1985', 'Quán Chay Bồ Đề', 'Burger Nướng Than', 'Bếp Nhà Mẹ',
    'Dimsum Hẻm Phố', 'Cà Phê Mộc Lan', 'Bánh Cuốn Nóng', 'Súp Cua Bách Khoa'
  ]

  for (let i = 0; i < 12; i++) {
    await supabase.from('partner_leads').insert({
      business_name: leadBusinesses[i],
      contact_name: VIETNAMESE_NAMES[i + 10] || 'Nguyễn Quản Lý',
      contact_phone: `09${randInt(10000000, 99999999)}`,
      contact_email: `contact@lead${i}.vn`,
      district: pickRandom(STORES_DATA).district,
      stage: stages[i % stages.length],
      kanban_order: i,
      next_follow_up: new Date(now.getTime() + randInt(1, 14) * 86400000).toISOString().slice(0, 10),
      notes: 'Đã trao đổi lần 1 về mô hình giải cứu thực phẩm, quán rất quan tâm.',
    })
  }
  console.log(`  ✅ Đã tạo 12 leads phủ khắp 5 cột Kanban.`)

  console.log('\n🎉 TOÀN BỘ SEED DATA ĐÃ ĐƯỢC NẠP THÀNH CÔNG!')
}

main().catch((err) => {
  console.error('❌ Lỗi seed data:', err)
  process.exit(1)
})
