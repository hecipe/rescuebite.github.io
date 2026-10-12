// Database types for RescueBite
// Based on 002_schema.sql

export type UserRole = 'buyer' | 'store_owner' | 'support_agent' | 'sales_rep' | 'admin'
export type StoreStatus = 'pending' | 'approved' | 'suspended'
export type BagStatus = 'DRAFT' | 'OPEN' | 'SOLD_OUT' | 'CLOSED' | 'CANCELLED'
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID_AWAITING_PICKUP'
  | 'PICKED_UP'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'REFUNDED'
export type TicketStatus = 'Mới' | 'Đang xử lý' | 'Đã xử lý' | 'Đóng'
export type TicketPriority = 'Thấp' | 'Trung bình' | 'Cao' | 'Khẩn'
export type TicketCategory = 'không có túi' | 'không đúng mô tả' | 'an toàn thực phẩm' | 'thanh toán' | 'khác'
export type LeadStage = 'Đã tiếp cận' | 'Demo' | 'Đã ký' | 'Đăng túi đầu tiên' | 'Hoạt động'

export interface Profile {
  id: string
  auth_user_id: string | null
  full_name: string
  phone: string | null
  district: string | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserRoleRow {
  id: string
  user_id: string
  role: UserRole
  granted_by: string | null
  created_at: string
}

export interface Store {
  id: string
  owner_id: string
  name: string
  district: string
  category: string
  address: string
  description: string
  status: StoreStatus
  rank_penalty: number
  created_at: string
  updated_at: string
}

export interface Dish {
  id: string
  store_id: string | null
  name: string
  emoji: string
  category: string
  retail_price: number
  created_at: string
}

export interface ExampleDish {
  name: string
  emoji: string
  qty?: number
}

export interface Bag {
  id: string
  store_id: string
  category: string
  quantity: number
  remaining: number
  price: number
  retail_min: number
  retail_max: number
  example_dishes: ExampleDish[]
  pickup_start: string
  pickup_end: string
  status: BagStatus
  created_at: string
  updated_at: string
  // Joined fields (optional)
  stores?: Store
}

export interface Order {
  id: string
  bag_id: string
  buyer_id: string
  status: OrderStatus
  qty: number
  total_price: number
  hold_deadline: string | null
  helper_code: string | null
  created_at: string
  updated_at: string
  // Joined fields
  bags?: Bag & { stores?: Store }
}

export interface OrderEvent {
  id: string
  order_id: string
  from_status: OrderStatus | null
  to_status: OrderStatus
  actor_id: string | null
  note: string | null
  created_at: string
}

export interface PaymentSim {
  id: string
  order_id: string
  result: 'success' | 'fail'
  amount: number
  created_at: string
}

export interface Review {
  id: string
  order_id: string
  buyer_id: string
  store_id: string
  rating: number
  matched_description: boolean
  comment: string | null
  created_at: string
}

export interface Favorite {
  id: string
  buyer_id: string
  store_id: string
  created_at: string
  stores?: Store
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface Ticket {
  id: string
  order_id: string | null
  buyer_id: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignee_id: string | null
  sla_due_at: string | null
  description: string
  resolution: string | null
  refund_amount: number
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
  orders?: Order
}

export interface TicketNote {
  id: string
  ticket_id: string
  author_id: string
  body: string
  created_at: string
}

export interface SurveyResponse {
  id: string
  buyer_id: string
  order_id: string | null
  dim1_exp: number
  dim2_exp: number
  dim3_exp: number
  dim4_exp: number
  dim5_exp: number
  dim1_perc: number
  dim2_perc: number
  dim3_perc: number
  dim4_perc: number
  dim5_perc: number
  created_at: string
}

export interface PartnerLead {
  id: string
  business_name: string
  contact_name: string
  contact_phone: string | null
  contact_email: string | null
  district: string | null
  category: string | null
  stage: LeadStage
  kanban_order: number
  next_follow_up: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  actor_id: string | null
  activity_type: string
  note: string
  created_at: string
}

export interface StorePayout {
  id: string
  store_id: string
  period_start: string
  period_end: string
  gross: number
  commission: number
  net: number
  status: 'pending' | 'paid' | 'disputed'
  created_at: string
}

export interface ReconciliationAlert {
  id: string
  order_id: string | null
  alert_type: string
  detail: string | null
  resolved_at: string | null
  created_at: string
}

export interface AppSetting {
  key: string
  value: string
  updated_at: string
}

export interface GoalTarget {
  id: string
  metric: string
  target: number
  unit: string
  updated_at: string
}

export interface DecisionLog {
  id: string
  actor_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  reason: string | null
  created_at: string
}

export interface MessageLog {
  id: string
  from_role: UserRole
  to_buyer_id: string | null
  segment: string | null
  message: string
  sent_at: string
}

// View types
export interface BuyerSegment {
  buyer_id: string
  full_name: string
  total_pickups: number
  last_order_at: string
  first_order_at: string
  segment: 'Mới' | 'Thân thiết' | 'Đang hoạt động' | 'Có nguy cơ rời bỏ' | 'Đã rời bỏ'
}

export interface StoreQuality {
  store_id: string
  store_name: string
  district: string
  rank_penalty: number
  review_count: number
  avg_rating: number
  complaint_count: number
  pickup_count: number
  matched_count: number
  quality_score: number
  quality_status: 'Tốt' | 'Cần nhắc nhở' | 'Giảm ưu tiên hiển thị'
}

export interface ServqualGap {
  dimension: string
  dim_order: number
  avg_expectation: number
  avg_perception: number
  gap: number
}

export interface GoalKpi {
  metric: string
  target: number
  unit: string
  current_value: number
}
