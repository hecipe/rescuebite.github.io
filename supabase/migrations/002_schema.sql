-- 002_schema.sql
-- Core schema for RescueBite

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id            uuid primary key default uuid_generate_v4(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  full_name     text not null default '',
  phone         text,
  district      text,
  preferences   jsonb default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- USER ROLES
-- ============================================================
create type user_role as enum ('buyer','store_owner','support_agent','sales_rep','admin');

create table if not exists user_roles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       user_role not null default 'buyer',
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- ============================================================
-- STORES
-- ============================================================
create type store_status as enum ('pending','approved','suspended');

create table if not exists stores (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  district     text not null,
  category     text not null,
  address      text not null,
  description  text default '',
  status       store_status not null default 'pending',
  rank_penalty integer not null default 0 check (rank_penalty >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- DISHES
-- ============================================================
create table if not exists dishes (
  id           uuid primary key default uuid_generate_v4(),
  store_id     uuid references stores(id) on delete cascade,
  name         text not null,
  emoji        text not null default '🍱',
  category     text not null default 'Khác',
  retail_price integer not null default 0 check (retail_price >= 0),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- BAGS
-- ============================================================
create type bag_status as enum ('DRAFT','OPEN','SOLD_OUT','CLOSED','CANCELLED');

create table if not exists bags (
  id              uuid primary key default uuid_generate_v4(),
  store_id        uuid not null references stores(id) on delete cascade,
  category        text not null default 'Khác',
  quantity        integer not null check (quantity > 0),
  remaining       integer not null check (remaining >= 0),
  price           integer not null check (price > 0),
  retail_min      integer not null check (retail_min > 0),
  retail_max      integer not null check (retail_max >= retail_min),
  example_dishes  jsonb not null default '[]',
  pickup_start    timestamptz not null,
  pickup_end      timestamptz not null,
  status          bag_status not null default 'DRAFT',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint pickup_window_valid check (pickup_end > pickup_start),
  constraint remaining_lte_quantity check (remaining <= quantity)
);

-- ============================================================
-- ORDERS
-- ============================================================
create type order_status as enum (
  'PENDING_PAYMENT','PAID_AWAITING_PICKUP','PICKED_UP',
  'NO_SHOW','CANCELLED','REFUNDED'
);

create table if not exists orders (
  id             uuid primary key default uuid_generate_v4(),
  bag_id         uuid not null references bags(id) on delete restrict,
  buyer_id       uuid not null references auth.users(id) on delete restrict,
  status         order_status not null default 'PENDING_PAYMENT',
  qty            integer not null default 1 check (qty > 0),
  total_price    integer not null check (total_price > 0),
  hold_deadline  timestamptz,
  helper_code    text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- ORDER EVENTS (audit trail)
-- ============================================================
create table if not exists order_events (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  actor_id    uuid references auth.users(id),
  note        text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS (simulated)
-- ============================================================
create table if not exists payments_sim (
  id         uuid primary key default uuid_generate_v4(),
  order_id   uuid not null references orders(id) on delete cascade,
  result     text not null check (result in ('success','fail')),
  amount     integer not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists reviews (
  id                  uuid primary key default uuid_generate_v4(),
  order_id            uuid not null unique references orders(id) on delete cascade,
  buyer_id            uuid not null references auth.users(id) on delete cascade,
  store_id            uuid not null references stores(id) on delete cascade,
  rating              integer not null check (rating between 1 and 5),
  matched_description boolean not null default true,
  comment             text,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- FAVORITES
-- ============================================================
create table if not exists favorites (
  id         uuid primary key default uuid_generate_v4(),
  buyer_id   uuid not null references auth.users(id) on delete cascade,
  store_id   uuid not null references stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(buyer_id, store_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  payload    jsonb default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MESSAGE LOG (CRM care messages)
-- ============================================================
create table if not exists message_log (
  id          uuid primary key default uuid_generate_v4(),
  from_role   user_role not null,
  to_buyer_id uuid references auth.users(id),
  segment     text,
  message     text not null,
  sent_at     timestamptz not null default now()
);

-- ============================================================
-- TICKETS
-- ============================================================
create type ticket_status as enum ('Mới','Đang xử lý','Đã xử lý','Đóng');
create type ticket_priority as enum ('Thấp','Trung bình','Cao','Khẩn');
create type ticket_category as enum ('không có túi','không đúng mô tả','an toàn thực phẩm','thanh toán','khác');

create table if not exists tickets (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid references orders(id) on delete set null,
  buyer_id      uuid not null references auth.users(id) on delete cascade,
  category      ticket_category not null default 'khác',
  priority      ticket_priority not null default 'Trung bình',
  status        ticket_status not null default 'Mới',
  assignee_id   uuid references auth.users(id),
  sla_due_at    timestamptz,
  description   text not null,
  resolution    text,
  refund_amount integer default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists ticket_notes (
  id         uuid primary key default uuid_generate_v4(),
  ticket_id  uuid not null references tickets(id) on delete cascade,
  author_id  uuid not null references auth.users(id),
  body       text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SURVEY RESPONSES (SERVQUAL)
-- ============================================================
create table if not exists survey_responses (
  id           uuid primary key default uuid_generate_v4(),
  buyer_id     uuid not null references auth.users(id) on delete cascade,
  order_id     uuid references orders(id) on delete set null,
  -- 5 SERVQUAL dimensions: Tangibles, Reliability, Responsiveness, Assurance, Empathy
  -- Expectation (1-7)
  dim1_exp     integer not null check (dim1_exp between 1 and 7),
  dim2_exp     integer not null check (dim2_exp between 1 and 7),
  dim3_exp     integer not null check (dim3_exp between 1 and 7),
  dim4_exp     integer not null check (dim4_exp between 1 and 7),
  dim5_exp     integer not null check (dim5_exp between 1 and 7),
  -- Perception (1-7)
  dim1_perc    integer not null check (dim1_perc between 1 and 7),
  dim2_perc    integer not null check (dim2_perc between 1 and 7),
  dim3_perc    integer not null check (dim3_perc between 1 and 7),
  dim4_perc    integer not null check (dim4_perc between 1 and 7),
  dim5_perc    integer not null check (dim5_perc between 1 and 7),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- PARTNER LEADS
-- ============================================================
create type lead_stage as enum ('Đã tiếp cận','Demo','Đã ký','Đăng túi đầu tiên','Hoạt động');

create table if not exists partner_leads (
  id              uuid primary key default uuid_generate_v4(),
  business_name   text not null,
  contact_name    text not null,
  contact_phone   text,
  contact_email   text,
  district        text,
  category        text,
  stage           lead_stage not null default 'Đã tiếp cận',
  kanban_order    integer not null default 0,
  next_follow_up  date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists lead_activities (
  id            uuid primary key default uuid_generate_v4(),
  lead_id       uuid not null references partner_leads(id) on delete cascade,
  actor_id      uuid references auth.users(id),
  activity_type text not null default 'note',
  note          text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- STORE PAYOUTS
-- ============================================================
create table if not exists store_payouts (
  id           uuid primary key default uuid_generate_v4(),
  store_id     uuid not null references stores(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  gross        integer not null default 0,
  commission   integer not null default 0,
  net          integer not null default 0,
  status       text not null default 'pending' check (status in ('pending','paid','disputed')),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- RECONCILIATION ALERTS
-- ============================================================
create table if not exists reconciliation_alerts (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references orders(id) on delete set null,
  alert_type  text not null,
  detail      text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- APP SETTINGS
-- ============================================================
create table if not exists app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Insert defaults
insert into app_settings (key, value) values
  ('hold_minutes', '10'),
  ('cancel_deadline_minutes', '60'),
  ('commission_pct', '15'),
  ('demo_ignore_window', 'false')
on conflict (key) do nothing;

-- ============================================================
-- GOALS & TARGETS
-- ============================================================
create table if not exists goals_targets (
  id         uuid primary key default uuid_generate_v4(),
  metric     text not null unique,
  target     numeric not null,
  unit       text not null default '%',
  updated_at timestamptz not null default now()
);

insert into goals_targets (metric, target, unit) values
  ('sell_through_rate',      75,   '%'),
  ('pickup_completion_rate', 95,   '%'),
  ('active_partner_rate',    70,   '%'),
  ('average_rating',         4.2,  'sao'),
  ('complaint_rate',         2,    '%'),
  ('repeat_purchase_30d',    40,   '%'),
  ('bags_rescued',           500,  'túi'),
  ('co2e_avoided_kg',        1350, 'kg'),
  ('fee_revenue_vnd',        500000, 'VNĐ')
on conflict (metric) do nothing;

-- ============================================================
-- DECISION LOG
-- ============================================================
create table if not exists decision_log (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references auth.users(id),
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  reason      text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT triggers helper
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
