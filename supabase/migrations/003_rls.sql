-- 003_rls.sql
-- Row Level Security policies for all tables

-- Helper: get the role of the current user
create or replace function get_my_role()
returns user_role language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid() limit 1;
$$;

-- Helper: check if current user has a specific role (raises error if not)
create or replace function require_role(required user_role)
returns void language plpgsql security definer as $$
begin
  if (select role from user_roles where user_id = auth.uid() limit 1) != required then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
  end if;
end;
$$;

-- Helper: check if current user has one of the given roles
create or replace function has_role(roles user_role[])
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from user_roles 
    where user_id = auth.uid() 
    and role = any(roles)
  );
$$;

-- ============================================================
-- Enable RLS on every table
-- ============================================================
alter table profiles              enable row level security;
alter table user_roles            enable row level security;
alter table stores                enable row level security;
alter table dishes                enable row level security;
alter table bags                  enable row level security;
alter table orders                enable row level security;
alter table order_events          enable row level security;
alter table payments_sim          enable row level security;
alter table reviews               enable row level security;
alter table favorites             enable row level security;
alter table notifications         enable row level security;
alter table message_log           enable row level security;
alter table tickets               enable row level security;
alter table ticket_notes          enable row level security;
alter table survey_responses      enable row level security;
alter table partner_leads         enable row level security;
alter table lead_activities       enable row level security;
alter table store_payouts         enable row level security;
alter table reconciliation_alerts enable row level security;
alter table app_settings          enable row level security;
alter table goals_targets         enable row level security;
alter table decision_log          enable row level security;

-- ============================================================
-- PROFILES policies
-- ============================================================
create policy "profiles: owner can read own" on profiles
  for select using (auth_user_id = auth.uid());

create policy "profiles: owner can update own" on profiles
  for update using (auth_user_id = auth.uid());

create policy "profiles: support can read all" on profiles
  for select using (has_role(array['support_agent','admin']::user_role[]));

create policy "profiles: admin can do all" on profiles
  for all using (get_my_role() = 'admin');

-- ============================================================
-- USER_ROLES policies
-- ============================================================
create policy "user_roles: self can read own" on user_roles
  for select using (user_id = auth.uid());

create policy "user_roles: admin can do all" on user_roles
  for all using (get_my_role() = 'admin');

-- ============================================================
-- STORES policies
-- ============================================================
create policy "stores: public can see approved" on stores
  for select using (status = 'approved');

create policy "stores: owner can read own" on stores
  for select using (owner_id = auth.uid());

create policy "stores: owner can update own" on stores
  for update using (owner_id = auth.uid());

create policy "stores: owner can insert" on stores
  for insert with check (owner_id = auth.uid());

create policy "stores: support/sales can read all" on stores
  for select using (has_role(array['support_agent','sales_rep','admin']::user_role[]));

create policy "stores: admin can do all" on stores
  for all using (get_my_role() = 'admin');

-- ============================================================
-- DISHES policies
-- ============================================================
create policy "dishes: public can see" on dishes
  for select using (true);

create policy "dishes: store owner can manage own" on dishes
  for all using (
    exists (select 1 from stores where id = store_id and owner_id = auth.uid())
  );

create policy "dishes: admin can do all" on dishes
  for all using (get_my_role() = 'admin');

-- ============================================================
-- BAGS policies
-- ============================================================
create policy "bags: public can see open bags" on bags
  for select using (status = 'OPEN' or status = 'SOLD_OUT');

create policy "bags: store owner can see own" on bags
  for select using (
    exists (select 1 from stores where id = store_id and owner_id = auth.uid())
  );

create policy "bags: store owner can manage own" on bags
  for all using (
    exists (select 1 from stores where id = store_id and owner_id = auth.uid())
  );

create policy "bags: support/admin can read all" on bags
  for select using (has_role(array['support_agent','admin']::user_role[]));

create policy "bags: admin can do all" on bags
  for all using (get_my_role() = 'admin');

-- ============================================================
-- ORDERS policies
-- ============================================================
create policy "orders: buyer can see own" on orders
  for select using (buyer_id = auth.uid());

create policy "orders: store owner can see own store orders" on orders
  for select using (
    exists (
      select 1 from bags b join stores s on s.id = b.store_id
      where b.id = bag_id and s.owner_id = auth.uid()
    )
  );

create policy "orders: support can read all" on orders
  for select using (has_role(array['support_agent','admin']::user_role[]));

create policy "orders: admin can do all" on orders
  for all using (get_my_role() = 'admin');

-- ============================================================
-- ORDER_EVENTS policies
-- ============================================================
create policy "order_events: buyer can see own" on order_events
  for select using (
    exists (select 1 from orders where id = order_id and buyer_id = auth.uid())
  );

create policy "order_events: support/admin can read all" on order_events
  for select using (has_role(array['support_agent','admin']::user_role[]));

-- ============================================================
-- PAYMENTS_SIM policies
-- ============================================================
create policy "payments_sim: buyer can see own" on payments_sim
  for select using (
    exists (select 1 from orders where id = order_id and buyer_id = auth.uid())
  );

create policy "payments_sim: admin can do all" on payments_sim
  for all using (get_my_role() = 'admin');

-- ============================================================
-- REVIEWS policies
-- ============================================================
create policy "reviews: public can read" on reviews
  for select using (true);

create policy "reviews: buyer can insert own" on reviews
  for insert with check (buyer_id = auth.uid());

create policy "reviews: buyer can update own" on reviews
  for update using (buyer_id = auth.uid());

create policy "reviews: admin can do all" on reviews
  for all using (get_my_role() = 'admin');

-- ============================================================
-- FAVORITES policies
-- ============================================================
create policy "favorites: buyer can manage own" on favorites
  for all using (buyer_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================
create policy "notifications: user can see own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications: user can update own" on notifications
  for update using (user_id = auth.uid());

create policy "notifications: admin can do all" on notifications
  for all using (get_my_role() = 'admin');

-- ============================================================
-- MESSAGE_LOG policies
-- ============================================================
create policy "message_log: support/sales can read" on message_log
  for select using (has_role(array['support_agent','sales_rep','admin']::user_role[]));

create policy "message_log: support/sales can insert" on message_log
  for insert with check (has_role(array['support_agent','sales_rep','admin']::user_role[]));

-- ============================================================
-- TICKETS policies
-- ============================================================
create policy "tickets: buyer can see own" on tickets
  for select using (buyer_id = auth.uid());

create policy "tickets: buyer can insert own" on tickets
  for insert with check (buyer_id = auth.uid());

create policy "tickets: support can see all" on tickets
  for select using (has_role(array['support_agent','admin']::user_role[]));

create policy "tickets: support can update" on tickets
  for update using (has_role(array['support_agent','admin']::user_role[]));

create policy "tickets: admin can do all" on tickets
  for all using (get_my_role() = 'admin');

-- ============================================================
-- TICKET_NOTES policies
-- ============================================================
create policy "ticket_notes: buyer can see own ticket notes" on ticket_notes
  for select using (
    exists (select 1 from tickets where id = ticket_id and buyer_id = auth.uid())
  );

create policy "ticket_notes: support can see and insert" on ticket_notes
  for all using (has_role(array['support_agent','admin']::user_role[]));

-- ============================================================
-- SURVEY_RESPONSES policies
-- ============================================================
create policy "survey_responses: buyer can insert own" on survey_responses
  for insert with check (buyer_id = auth.uid());

create policy "survey_responses: buyer can read own" on survey_responses
  for select using (buyer_id = auth.uid());

create policy "survey_responses: support/admin can read all" on survey_responses
  for select using (has_role(array['support_agent','admin']::user_role[]));

-- ============================================================
-- PARTNER_LEADS policies
-- ============================================================
create policy "partner_leads: sales/admin can do all" on partner_leads
  for all using (has_role(array['sales_rep','admin']::user_role[]));

-- ============================================================
-- LEAD_ACTIVITIES policies
-- ============================================================
create policy "lead_activities: sales/admin can do all" on lead_activities
  for all using (has_role(array['sales_rep','admin']::user_role[]));

-- ============================================================
-- STORE_PAYOUTS policies
-- ============================================================
create policy "store_payouts: store owner can see own" on store_payouts
  for select using (
    exists (select 1 from stores where id = store_id and owner_id = auth.uid())
  );

create policy "store_payouts: admin can do all" on store_payouts
  for all using (get_my_role() = 'admin');

-- ============================================================
-- RECONCILIATION_ALERTS policies
-- ============================================================
create policy "reconciliation_alerts: admin/support can do all" on reconciliation_alerts
  for all using (has_role(array['support_agent','admin']::user_role[]));

-- ============================================================
-- APP_SETTINGS policies
-- ============================================================
create policy "app_settings: all authenticated can read" on app_settings
  for select using (auth.uid() is not null);

create policy "app_settings: admin can do all" on app_settings
  for all using (get_my_role() = 'admin');

-- ============================================================
-- GOALS_TARGETS policies
-- ============================================================
create policy "goals_targets: all authenticated can read" on goals_targets
  for select using (auth.uid() is not null);

create policy "goals_targets: admin can do all" on goals_targets
  for all using (get_my_role() = 'admin');

-- ============================================================
-- DECISION_LOG policies
-- ============================================================
create policy "decision_log: admin can do all" on decision_log
  for all using (get_my_role() = 'admin');

create policy "decision_log: support can read" on decision_log
  for select using (has_role(array['support_agent','admin']::user_role[]));
