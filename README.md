# 🍱 RescueBite – Nền Tảng "Túi Bất Ngờ" Giải Cứu Thực Phẩm & Hệ Thống CRM Toàn Diện

> **Educational Project** – Đề án học thuật ứng dụng kinh tế chia sẻ và giải cứu thực phẩm dư thừa (Surprise Food Bags) tại TP. Hồ Chí Minh, kết hợp bộ giải pháp CRM & Quản trị vận hành sâu rộng cho 5 vai trò nghiệp vụ.

---

## 🌟 Tổng Quan Dự Án

**RescueBite** kết nối các nhà hàng, quán cà phê, tiệm bánh và siêu thị với người tiêu dùng có nhu cầu mua các "túi thực phẩm bất ngờ" (Surprise Bags) vào cuối ngày với giá giảm 50% - 70%. Mô hình mang lại ba giá trị cốt lõi:
1. **Môi trường**: Giảm thiểu lượng thực phẩm bị lãng phí và khí thải nhà kính (mỗi túi giảm tương đương ~2.7 kg CO2e).
2. **Người tiêu dùng**: Tiếp cận các món ăn chất lượng cao, an toàn với chi phí tiết kiệm.
3. **Quán đối tác**: Thu hồi chi phí nguyên vật liệu và tiếp cận tệp khách hàng tiềm năng mới.
4. **Hệ thống CRM 360°**: Cung cấp công cụ chuyên nghiệp quản lý khiếu nại (Support CRM), phát triển đối tác (Sales CRM), đo lường chất lượng dịch vụ (SERVQUAL Analysis), và kiểm soát mục tiêu chiến lược (KPIs).

---

## 👥 Danh Sách Tài Khoản Trình Diễn (Demo Accounts)

Mật khẩu chung cho tất cả tài khoản: `Demo@123456`

| Vai trò | Email đăng nhập | Mô tả trách nhiệm & Trải nghiệm chính |
|---------|-----------------|----------------------------------------|
| **Người mua (Buyer)** | `buyer@rescuebite.demo` | Khám phá túi bất ngờ, đặt hàng, thanh toán mô phỏng, nhận hàng bằng thanh trượt, đánh giá sao & SERVQUAL, theo dõi tác động môi trường cá nhân (`/impact`). |
| **Chủ quán (Store Owner)** | `store@rescuebite.demo` | Quản lý túi bán, sao chép túi hôm qua, đối soát đơn hàng tại quầy, theo dõi biểu đồ doanh thu & chiết khấu hoa hồng 15% (`/store/dashboard`). |
| **Nhân viên Hỗ trợ (Support Agent)** | `support@rescuebite.demo` | Trung tâm phiếu khiếu nại (`/crm/tickets`), kiểm soát SLA đếm ngược, hoàn tiền một chạm (`support_refund`), phạt điểm thứ hạng quán, ghi chú nội bộ. |
| **Nhân viên Kinh doanh (Sales Rep)** | `sales@rescuebite.demo` | Quản lý phễu đối tác 5 giai đoạn (`/crm/partners`), ghi nhật ký chăm sóc, xem xét và phê duyệt hồ sơ quán đối tác mới (`/crm/stores-review`). |
| **Quản trị viên (Admin)** | `admin@rescuebite.demo` | Bảng điều khiển phân tích toàn sàn (GMV, Bags, CO2e, Users), phân quyền người dùng (`/admin/users`), cấu hình tham số nền tảng & làm mới dữ liệu demo (`/admin/settings`), nhật ký kiểm toán (`/admin/decisions`). |

> **💡 Tiện ích Fast Role Switcher**: Người dùng có thể chuyển đổi tức thì giữa 5 vai trò bất cứ lúc nào thông qua menu Avatar ở góc trên bên phải màn hình.

---

## 🛠️ Ngăn Xếp Kỹ Thuật (Tech Stack)

- **Frontend**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS, shadcn/ui (Radix Primitives), React Router 7.
- **Trực quan hóa Dữ liệu (Data Viz)**: Recharts (Pie Chart, Grouped Bar Chart, Revenue Bar Chart).
- **Kéo Thả (DnD)**: `@dnd-kit/core`, `@dnd-kit/sortable`.
- **Cơ sở Dữ liệu & Backend**: Supabase PostgreSQL.
  - **22 Bảng Dữ liệu** với đầy đủ ràng buộc khóa ngoại và Check Constraints.
  - **Row Level Security (RLS)** được kích hoạt 100% trên mọi bảng.
  - **RPC Functions**: 12 hàm thủ tục lưu trữ xử lý nghiệp vụ nguyên tử (`place_order`, `simulate_payment`, `confirm_pickup`, `expire_orders`, `support_refund`, `refresh_demo`, v.v.).
  - **5 Analytical Views**: `v_buyer_segments`, `v_store_quality`, `v_servqual_gaps`, `v_goal_kpis`, `v_store_revenue`.
- **Nguyên Tắc Bảo Mật**:
  - Gói client build tuyệt đối chỉ chứa `VITE_SUPABASE_ANON_KEY`.
  - Khóa `service_role` chỉ được sử dụng cho các scripts tạo tài khoản và seed ngầm.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### 1. Yêu Cầu Môi Trường
- Node.js 18.x trở lên.
- npm 9.x trở lên.
- Dự án Supabase (hoàn toàn miễn phí trên gói Free Tier).

### 2. Cài Đặt Mã Nguồn & Thư Viện
```bash
# Clone hoặc mở thư mục dự án
cd d:/rescuebite

# Cài đặt tất cả các gói phụ thuộc
npm install
```

### 3. Cấu Hình Biến Môi Trường
Tạo hai tệp `.env.local` (cho frontend Vite) và `.env` (cho scripts seed):

**Tệp `.env.local`**:
```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

**Tệp `.env`**:
```env
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

### 4. Thiết Lập Cơ Sở Dữ Liệu Supabase
Truy cập **SQL Editor** trên Supabase Dashboard và thực thi các tệp trong thư mục `supabase/migrations/`:
1. `001_extensions.sql` (Kích hoạt UUID, Crypto, Moddatetime)
2. `002_schema.sql` (Khởi tạo 22 bảng cốt lõi)
3. `003_rls.sql` (Thiết lập RLS policies)
4. `004_views.sql` (Tạo 5 views phân tích)
5. `005_functions.sql` (Cài đặt các hàm RPC nghiệp vụ)
6. `006_triggers.sql` (Cài đặt triggers cập nhật thời gian và thông báo)
7. `007_cron.sql` (Lập lịch kiểm tra hết giờ tự động)
8. `008_phase3_functions.sql` & `009_phase4_functions.sql` (Các hàm bổ trợ CRM & Quản trị)

### 5. Khởi Tạo Dữ Liệu Mẫu (Demo Data)
```bash
# Tạo 5 tài khoản demo với đầy đủ vai trò
npm run create-demo-users

# Nạp dữ liệu mô phỏng: 12 cửa hàng, 40 món ăn, 30 túi, 500 đơn hàng, 150 đánh giá, 80 khảo sát SERVQUAL
npm run seed
```

### 6. Chạy Máy Chủ Phát Triển
```bash
npm run dev
```
Truy cập ứng dụng tại địa chỉ: `http://localhost:5173`.

---

## ⏱️ Kịch Bản Trình Diễn Nhanh Trong 5 Phút (5-Minute Demo Script)

### Phút 1: Trải Nghiệm Người Mua (Buyer Journey)
1. Đăng nhập với vai trò **Người mua** (`buyer@rescuebite.demo`).
2. Vào trang **Khám phá** (`/discover`), lọc theo quận và chọn một túi bất ngờ tươi ngon (ví dụ: "Túi Bánh Ngọt Cuối Ngày").
3. Nhấn **"Đặt ngay"** → Trang thanh toán đếm ngược 10 phút → Bấm nút xanh **"Thanh toán thành công (Mô phỏng)"**.
4. Chuyển sang trang **Chi tiết đơn hàng** → Bấm **"Đến màn hình nhận túi"** (`/pickup/:id`).
5. Kéo thanh trượt **SwipeSlider** để xác nhận nhận túi thành công tại quầy.
6. Hoàn thành phiếu đánh giá sao (1–5 sao) và bảng khảo sát chất lượng dịch vụ **SERVQUAL** 5 chiều.
7. Vào mục **Tác động môi trường** (`/impact`) để xem tổng số túi đã cứu, lượng CO2e tránh thải (~2.7 kg/túi), và huy hiệu đạt được.

### Phút 2: Vận Hành Quán Đối Tác (Store Portal)
1. Sử dụng Fast Switcher chuyển sang vai trò **Chủ quán** (`store@rescuebite.demo`).
2. Mở **Dashboard quán** (`/store/dashboard`): xem số túi đang mở bán, đơn hàng cần đón hôm nay.
3. Vào trang **"Túi của tôi"** (`/store/bags`) → Thử nghiệm tính năng **"Sao chép túi hôm qua"** để tạo túi mới chỉ trong 10 giây.
4. Vào trang **"Đơn hàng"** (`/store/orders`): nhập mã nhận hàng của khách để xác thực claim tại quầy.
5. Vào trang **"Doanh thu"** (`/store/revenue`): xem biểu đồ doanh thu theo ngày và bảng đối soát khấu trừ hoa hồng 15%.

### Phút 3: Trung Tâm Hỗ Trợ Khách Hàng (Support CRM)
1. Chuyển sang vai trò **Hỗ trợ CRM** (`support@rescuebite.demo`).
2. Truy cập **Phiếu hỗ trợ** (`/crm/tickets`): quan sát các hàng đợi (Mới, Đang xử lý, Khẩn cấp), bộ đếm ngược thời hạn SLA màu đỏ.
3. Nhấp chọn một ticket: mở **Ticket Context Drawer** hiển thị toàn bộ ngữ cảnh đơn hàng, thông tin khách hàng, và lịch sử quán.
4. Thực hiện hành động:
   - Ghi chú nội bộ giữa các supporter (`ticket_notes`).
   - Thử nghiệm nút **"Hoàn tiền"** một chạm (`support_refund`).
   - Phạt trừ **+10 điểm** thứ hạng quán vi phạm.
   - Bấm **"Đóng & Giải quyết ticket"**.

### Phút 4: Phễu Kinh Doanh & Phê Duyệt Đối Tác (Sales CRM)
1. Chuyển sang vai trò **Kinh doanh** (`sales@rescuebite.demo`).
2. Mở trang **CRM Đối tác** (`/crm/partners`): theo dõi đường ống phát triển đối tác qua 5 giai đoạn (*Đã tiếp cận → Demo → Đã ký → Đăng túi đầu tiên → Hoạt động*).
3. Mở drawer đối tác, đổi giai đoạn và cập nhật lịch hẹn liên hệ tiếp theo.
4. Mở trang **Duyệt hồ sơ quán** (`/crm/stores-review`): xem các quán nộp đơn đăng ký mới (`status = 'pending'`). Nhấn **"Phê duyệt"** để tự động cấp quyền `store_owner` cho chủ quán.

### Phút 5: Bảng Vàng Quản Trị & Phân Tích SERVQUAL (Admin Suite)
1. Chuyển sang vai trò **Quản trị viên** (`admin@rescuebite.demo`).
2. Mở trang **SERVQUAL Dashboard** (`/crm/servqual`): xem biểu đồ so sánh Kỳ vọng vs Cảm nhận 5 chiều. Quan sát bảng Gap Table làm nổi bật chiều **"Độ tin cậy" (Reliability)** có khoảng cách âm lớn nhất, cùng phân tích lý thuyết SERVQUAL Gap 5.
3. Mở trang **Chất lượng cửa hàng** (`/crm/store-quality`): xem bảng điểm chất lượng quán và nút đồng bộ điểm phạt.
4. Mở trang **Mục tiêu KPI** (`/crm/goals`): kiểm tra các chỉ số vĩ mô toàn sàn (GMV, Túi giải cứu, CO2e, Quán hoạt động). Thử nghiệm sửa trực tiếp chỉ tiêu mục tiêu (Inline edit).
5. Mở trang **Cài đặt hệ thống** (`/admin/settings`): điều chỉnh tham số hoa hồng nền tảng và nhấn nút **"Làm mới dữ liệu demo"** (`refresh_demo()`) để dời toàn bộ khung giờ túi sang thời điểm hiện tại.

---

## 🌐 Hướng Dẫn Triển Khai Lên Netlify

Dự án được tối ưu hóa sẵn sàng cho việc triển khai Single Page Application (SPA) lên Netlify:

1. **Lệnh đóng gói (Build command)**: `npm run build`
2. **Thư mục xuất bản (Publish directory)**: `dist`
3. **Cấu hình định tuyến SPA**: Tệp `public/_redirects` đã có sẵn nội dung:
   ```
   /*    /index.html   200
   ```
4. **Biến môi trường trên Netlify Dashboard** (`Site settings → Environment variables`):
   - `VITE_SUPABASE_URL`: Đường dẫn URL dự án Supabase của bạn.
   - `VITE_SUPABASE_ANON_KEY`: Khóa công khai Anon của Supabase.

---

## 📄 Bản Quyền & Tuyên Bố Miễn Trừ Trách Nhiệm

Dự án này được phát triển hoàn toàn vì mục đích học thuật, nghiên cứu nghiệp vụ thương mại điện tử và giải pháp giảm thiểu lãng phí thực phẩm. Toàn bộ hình ảnh, thương hiệu và dữ liệu cá nhân trong hệ thống đều là dữ liệu giả định (mock data).
