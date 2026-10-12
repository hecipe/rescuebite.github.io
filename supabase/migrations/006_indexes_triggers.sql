-- 006_indexes_triggers.sql
-- Indexes and updated_at triggers

-- ============================================================
-- INDEXES
-- ============================================================

-- profiles
create index if not exists idx_profiles_auth_user_id on profiles(auth_user_id);

-- user_roles
create index if not exists idx_user_roles_user_id on user_roles(user_id);

-- stores
create index if not exists idx_stores_owner_id   on stores(owner_id);
create index if not exists idx_stores_status      on stores(status);
create index if not exists idx_stores_district    on stores(district);

-- dishes
create index if not exists idx_dishes_store_id on dishes(store_id);

-- bags
create index if not exists idx_bags_store_id      on bags(store_id);
create index if not exists idx_bags_status        on bags(status);
create index if not exists idx_bags_pickup_start  on bags(pickup_start);
create index if not exists idx_bags_pickup_end    on bags(pickup_end);

-- orders
create index if not exists idx_orders_buyer_id     on orders(buyer_id);
create index if not exists idx_orders_bag_id       on orders(bag_id);
create index if not exists idx_orders_status       on orders(status);
create index if not exists idx_orders_hold_deadline on orders(hold_deadline) where status = 'PENDING_PAYMENT';
create index if not exists idx_orders_helper_code  on orders(helper_code);

-- order_events
create index if not exists idx_order_events_order_id on order_events(order_id);

-- payments_sim
create index if not exists idx_payments_sim_order_id on payments_sim(order_id);

-- reviews
create index if not exists idx_reviews_store_id  on reviews(store_id);
create index if not exists idx_reviews_buyer_id  on reviews(buyer_id);
create index if not exists idx_reviews_order_id  on reviews(order_id);

-- favorites
create index if not exists idx_favorites_buyer_id on favorites(buyer_id);

-- notifications
create index if not exists idx_notifications_user_id  on notifications(user_id);
create index if not exists idx_notifications_read_at  on notifications(read_at) where read_at is null;

-- tickets
create index if not exists idx_tickets_buyer_id    on tickets(buyer_id);
create index if not exists idx_tickets_order_id    on tickets(order_id);
create index if not exists idx_tickets_status      on tickets(status);
create index if not exists idx_tickets_assignee_id on tickets(assignee_id);

-- ticket_notes
create index if not exists idx_ticket_notes_ticket_id on ticket_notes(ticket_id);

-- survey_responses
create index if not exists idx_survey_responses_buyer_id on survey_responses(buyer_id);
create index if not exists idx_survey_responses_order_id on survey_responses(order_id);

-- partner_leads
create index if not exists idx_partner_leads_stage on partner_leads(stage);

-- lead_activities
create index if not exists idx_lead_activities_lead_id on lead_activities(lead_id);

-- store_payouts
create index if not exists idx_store_payouts_store_id on store_payouts(store_id);

-- reconciliation_alerts
create index if not exists idx_reconciliation_alerts_order_id    on reconciliation_alerts(order_id);
create index if not exists idx_reconciliation_alerts_resolved_at on reconciliation_alerts(resolved_at) where resolved_at is null;

-- decision_log
create index if not exists idx_decision_log_entity on decision_log(entity_type, entity_id);
create index if not exists idx_decision_log_actor_id on decision_log(actor_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_stores_updated_at
  before update on stores
  for each row execute function set_updated_at();

create trigger trg_bags_updated_at
  before update on bags
  for each row execute function set_updated_at();

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

create trigger trg_tickets_updated_at
  before update on tickets
  for each row execute function set_updated_at();

create trigger trg_partner_leads_updated_at
  before update on partner_leads
  for each row execute function set_updated_at();

create trigger trg_app_settings_updated_at
  before update on app_settings
  for each row execute function set_updated_at();

create trigger trg_goals_targets_updated_at
  before update on goals_targets
  for each row execute function set_updated_at();
