// Application-wide constants

export const DISTRICTS = [
  'Quận 1',
  'Quận 3',
  'Quận 5',
  'Quận 7',
  'Bình Thạnh',
  'Phú Nhuận',
  'Tân Bình',
  'Gò Vấp',
  'Thủ Đức',
  'Bình Dương',
] as const

export const BAG_CATEGORIES = [
  'Bánh & Ngọt',
  'Cơm & Bún',
  'Sushi & Nhật',
  'Pizza & Âu',
  'Cà phê & Đồ uống',
  'Chay',
  'Siêu thị',
  'Khác',
] as const

export const TICKET_CATEGORIES = [
  { value: 'không có túi', label: 'Không có túi' },
  { value: 'không đúng mô tả', label: 'Không đúng mô tả' },
  { value: 'an toàn thực phẩm', label: 'An toàn thực phẩm' },
  { value: 'thanh toán', label: 'Thanh toán' },
  { value: 'khác', label: 'Khác' },
] as const

export const TICKET_PRIORITIES = [
  { value: 'Thấp', label: 'Thấp', color: 'text-slate-500' },
  { value: 'Trung bình', label: 'Trung bình', color: 'text-yellow-600' },
  { value: 'Cao', label: 'Cao', color: 'text-orange-600' },
  { value: 'Khẩn', label: 'Khẩn', color: 'text-red-600' },
] as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID_AWAITING_PICKUP: 'Đã thanh toán – chờ nhận',
  PICKED_UP: 'Đã nhận',
  NO_SHOW: 'Không đến nhận',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAID_AWAITING_PICKUP: 'bg-blue-100 text-blue-800',
  PICKED_UP: 'bg-green-100 text-green-800',
  NO_SHOW: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
  REFUNDED: 'bg-purple-100 text-purple-800',
}

export const LEAD_STAGES = [
  'Đã tiếp cận',
  'Demo',
  'Đã ký',
  'Đăng túi đầu tiên',
  'Hoạt động',
] as const

export const SERVQUAL_DIMENSIONS = [
  { key: 'dim1', label: 'Phương tiện hữu hình', short: 'Hữu hình' },
  { key: 'dim2', label: 'Độ tin cậy', short: 'Tin cậy' },
  { key: 'dim3', label: 'Khả năng đáp ứng', short: 'Đáp ứng' },
  { key: 'dim4', label: 'Sự đảm bảo', short: 'Đảm bảo' },
  { key: 'dim5', label: 'Sự đồng cảm', short: 'Đồng cảm' },
] as const

export const DEMO_ACCOUNTS = [
  { email: 'buyer@rescuebite.demo', password: 'Demo@123456', role: 'buyer', label: 'Người mua' },
  { email: 'store@rescuebite.demo', password: 'Demo@123456', role: 'store_owner', label: 'Chủ cửa hàng' },
  { email: 'support@rescuebite.demo', password: 'Demo@123456', role: 'support_agent', label: 'Hỗ trợ' },
  { email: 'sales@rescuebite.demo', password: 'Demo@123456', role: 'sales_rep', label: 'Kinh doanh' },
  { email: 'admin@rescuebite.demo', password: 'Demo@123456', role: 'admin', label: 'Quản trị' },
] as const

export const CO2E_PER_BAG_KG = 2.7

export const BAG_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang mở',
  SOLD_OUT: 'Hết túi',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
}
