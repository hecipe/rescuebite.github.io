-- 005_functions.sql
-- Core business logic functions

-- ============================================================
-- HELPER: get app setting value
-- ============================================================
create or replace function get_setting(setting_key text)
returns text language sql security definer stable as $$
  select value from app_settings where key = setting_key;
$$;

-- ============================================================
-- HELPER: write an order event
-- ============================================================
create or replace function write_order_event(
  p_order_id   uuid,
  p_from       order_status,
  p_to         order_status,
  p_actor_id   uuid,
  p_note       text default null
) returns void language plpgsql security definer as $$
begin
  insert into order_events (order_id, from_status, to_status, actor_id, note)
  values (p_order_id, p_from, p_to, p_actor_id, p_note);
end;
$$;

-- ============================================================
-- PLACE ORDER
-- Atomically reserve one unit from a bag for the current user
-- ============================================================
create or replace function place_order(
  p_bag_id uuid,
  p_qty    integer default 1
) returns uuid language plpgsql security definer as $$
declare
  v_bag        bags%rowtype;
  v_order_id   uuid;
  v_hold_mins  integer;
  v_price      integer;
begin
  -- Auth check
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để đặt túi.';
  end if;

  -- Lock the bag row to prevent concurrent oversell
  select * into v_bag from bags where id = p_bag_id for update;

  if not found then
    raise exception 'Không tìm thấy túi.';
  end if;

  if v_bag.status != 'OPEN' then
    raise exception 'Túi này hiện không còn nhận đặt (trạng thái: %).',  v_bag.status;
  end if;

  if v_bag.remaining < p_qty then
    raise exception 'Không đủ túi còn lại. Còn lại: % túi.', v_bag.remaining;
  end if;

  if now() > v_bag.pickup_end then
    raise exception 'Đã qua thời gian nhận túi.';
  end if;

  -- Get hold duration from settings
  v_hold_mins := coalesce(get_setting('hold_minutes')::integer, 10);
  v_price := v_bag.price * p_qty;

  -- Decrement remaining
  update bags
  set remaining = remaining - p_qty,
      status = case when remaining - p_qty = 0 then 'SOLD_OUT'::bag_status else status end
  where id = p_bag_id;

  -- Create the order
  insert into orders (bag_id, buyer_id, status, qty, total_price, hold_deadline)
  values (
    p_bag_id,
    auth.uid(),
    'PENDING_PAYMENT',
    p_qty,
    v_price,
    now() + (v_hold_mins || ' minutes')::interval
  )
  returning id into v_order_id;

  perform write_order_event(v_order_id, null, 'PENDING_PAYMENT', auth.uid(), 'Đặt túi thành công');

  return v_order_id;
end;
$$;

-- ============================================================
-- SIMULATE PAYMENT
-- ============================================================
create or replace function simulate_payment(
  p_order_id uuid,
  p_result   text   -- 'success' or 'fail'
) returns text language plpgsql security definer as $$
declare
  v_order orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập.';
  end if;

  if p_result not in ('success', 'fail') then
    raise exception 'Kết quả thanh toán không hợp lệ.';
  end if;

  select * into v_order from orders where id = p_order_id;

  if not found then
    raise exception 'Không tìm thấy đơn hàng.';
  end if;

  if v_order.buyer_id != auth.uid() then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
  end if;

  -- Record payment attempt
  insert into payments_sim (order_id, result, amount)
  values (p_order_id, p_result, v_order.total_price);

  if p_result = 'success' then
    if v_order.status = 'PENDING_PAYMENT' then
      update orders set status = 'PAID_AWAITING_PICKUP' where id = p_order_id;
      perform write_order_event(p_order_id, 'PENDING_PAYMENT', 'PAID_AWAITING_PICKUP', auth.uid(), 'Thanh toán thành công');
      return 'PAID_AWAITING_PICKUP';
    elsif v_order.status = 'CANCELLED' then
      -- Late success after expiry: flag for reconciliation
      update orders set status = 'REFUNDED' where id = p_order_id;
      perform write_order_event(p_order_id, 'CANCELLED', 'REFUNDED', auth.uid(), 'Thanh toán muộn sau khi hủy - tự động hoàn tiền');
      insert into reconciliation_alerts (order_id, alert_type, detail)
      values (p_order_id, 'late_payment', 'Thanh toán thành công sau khi đơn đã bị hủy - cần kiểm tra hoàn tiền');
      return 'REFUNDED';
    else
      raise exception 'Đơn hàng đang ở trạng thái % không thể thanh toán.', v_order.status;
    end if;
  else
    -- Payment failed
    if v_order.status = 'PENDING_PAYMENT' then
      update orders set status = 'CANCELLED' where id = p_order_id;
      -- Release unit
      update bags
      set remaining = remaining + v_order.qty,
          status = case when status = 'SOLD_OUT' then 'OPEN'::bag_status else status end
      where id = v_order.bag_id;
      perform write_order_event(p_order_id, 'PENDING_PAYMENT', 'CANCELLED', auth.uid(), 'Thanh toán thất bại');
      return 'CANCELLED';
    else
      raise exception 'Không thể xử lý thanh toán thất bại cho đơn ở trạng thái %.', v_order.status;
    end if;
  end if;
end;
$$;

-- ============================================================
-- CANCEL ORDER
-- ============================================================
create or replace function cancel_order(
  p_order_id uuid
) returns text language plpgsql security definer as $$
declare
  v_order orders%rowtype;
  v_bag   bags%rowtype;
  v_cancel_deadline_mins integer;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập.';
  end if;

  select * into v_order from orders where id = p_order_id;

  if not found then
    raise exception 'Không tìm thấy đơn hàng.';
  end if;

  -- Only buyer or admin can cancel
  if v_order.buyer_id != auth.uid() and get_my_role() != 'admin' then
    raise exception 'Bạn không có quyền hủy đơn hàng này.';
  end if;

  select * into v_bag from bags where id = v_order.bag_id;

  if v_order.status = 'PENDING_PAYMENT' then
    update orders set status = 'CANCELLED' where id = p_order_id;
    -- Release unit
    update bags
    set remaining = remaining + v_order.qty,
        status = case when status = 'SOLD_OUT' then 'OPEN'::bag_status else status end
    where id = v_order.bag_id;
    perform write_order_event(p_order_id, 'PENDING_PAYMENT', 'CANCELLED', auth.uid(), 'Người mua hủy đơn');
    return 'CANCELLED';

  elsif v_order.status = 'PAID_AWAITING_PICKUP' then
    v_cancel_deadline_mins := coalesce(get_setting('cancel_deadline_minutes')::integer, 60);
    if now() <= v_order.created_at + (v_cancel_deadline_mins || ' minutes')::interval then
      update orders set status = 'REFUNDED' where id = p_order_id;
      -- Release unit if bag still open
      if v_bag.status in ('OPEN', 'SOLD_OUT') then
        update bags
        set remaining = remaining + v_order.qty,
            status = case when status = 'SOLD_OUT' then 'OPEN'::bag_status else status end
        where id = v_order.bag_id;
      end if;
      perform write_order_event(p_order_id, 'PAID_AWAITING_PICKUP', 'REFUNDED', auth.uid(), 'Người mua hủy trong thời hạn - đã hoàn tiền');
      return 'REFUNDED';
    else
      raise exception 'Đã qua thời hạn hủy đơn (% phút từ khi thanh toán). Vui lòng liên hệ hỗ trợ.', v_cancel_deadline_mins;
    end if;

  else
    raise exception 'Không thể hủy đơn hàng ở trạng thái %.', v_order.status;
  end if;
end;
$$;

-- ============================================================
-- CONFIRM PICKUP
-- ============================================================
create or replace function confirm_pickup(
  p_identifier text  -- order_id (UUID) or helper_code
) returns text language plpgsql security definer as $$
declare
  v_order orders%rowtype;
  v_bag   bags%rowtype;
  v_ignore_window boolean;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập.';
  end if;

  -- Try UUID first, then helper_code
  begin
    select * into v_order from orders where id = p_identifier::uuid;
  exception when invalid_text_representation then
    select * into v_order from orders where helper_code = p_identifier;
  end;

  if not found then
    raise exception 'Không tìm thấy đơn hàng.';
  end if;

  -- Only buyer, helper (via helper_code), or store_owner/admin can confirm
  if v_order.buyer_id != auth.uid()
     and v_order.helper_code != p_identifier
     and not has_role(array['store_owner','admin']::user_role[])
  then
    raise exception 'Bạn không có quyền xác nhận nhận túi này.';
  end if;

  if v_order.status != 'PAID_AWAITING_PICKUP' then
    raise exception 'Đơn hàng không ở trạng thái chờ nhận (hiện tại: %).', v_order.status;
  end if;

  select * into v_bag from bags where id = v_order.bag_id;

  -- Check pickup window (unless demo_ignore_window is true)
  v_ignore_window := coalesce(get_setting('demo_ignore_window'), 'false') = 'true';

  if not v_ignore_window then
    if now() < v_bag.pickup_start then
      raise exception 'Chưa đến giờ nhận túi. Vui lòng quay lại sau %.',
        to_char(v_bag.pickup_start at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM');
    end if;
    if now() > v_bag.pickup_end then
      raise exception 'Đã qua thời gian nhận túi (kết thúc lúc %).',
        to_char(v_bag.pickup_end at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM');
    end if;
  end if;

  update orders set status = 'PICKED_UP' where id = v_order.id;
  perform write_order_event(v_order.id, 'PAID_AWAITING_PICKUP', 'PICKED_UP', auth.uid(), 'Đã nhận túi thành công');

  return 'PICKED_UP';
end;
$$;

-- ============================================================
-- EXPIRE ORDERS
-- Run every minute via pg_cron. Also callable from staff UI.
-- ============================================================
create or replace function expire_orders()
returns jsonb language plpgsql security definer as $$
declare
  v_cancelled_pending  integer := 0;
  v_no_show           integer := 0;
  v_closed_bags       integer := 0;
  v_ord               orders%rowtype;
begin
  -- 1. PENDING_PAYMENT past hold_deadline -> CANCELLED
  for v_ord in
    select * from orders
    where status = 'PENDING_PAYMENT'
      and hold_deadline < now()
  loop
    update orders set status = 'CANCELLED' where id = v_ord.id;
    update bags
    set remaining = remaining + v_ord.qty,
        status = case when status = 'SOLD_OUT' then 'OPEN'::bag_status else status end
    where id = v_ord.bag_id;
    perform write_order_event(v_ord.id, 'PENDING_PAYMENT', 'CANCELLED', null, 'Hết thời gian thanh toán - tự động hủy');
    v_cancelled_pending := v_cancelled_pending + 1;
  end loop;

  -- 2. PAID_AWAITING_PICKUP past pickup_end -> NO_SHOW
  for v_ord in
    select o.* from orders o
    join bags b on b.id = o.bag_id
    where o.status = 'PAID_AWAITING_PICKUP'
      and b.pickup_end < now()
  loop
    update orders set status = 'NO_SHOW' where id = v_ord.id;
    perform write_order_event(v_ord.id, 'PAID_AWAITING_PICKUP', 'NO_SHOW', null, 'Không đến nhận túi trong thời gian quy định');
    v_no_show := v_no_show + 1;
  end loop;

  -- 3. OPEN/SOLD_OUT bags past pickup_end -> CLOSED
  update bags
  set status = 'CLOSED'
  where status in ('OPEN', 'SOLD_OUT')
    and pickup_end < now();

  get diagnostics v_closed_bags = row_count;

  return jsonb_build_object(
    'cancelled_pending', v_cancelled_pending,
    'no_show', v_no_show,
    'closed_bags', v_closed_bags
  );
end;
$$;

-- ============================================================
-- GENERATE PAYOUT
-- Calculates and inserts a payout record for a store
-- ============================================================
create or replace function generate_payout(
  p_store_id     uuid,
  p_period_start date,
  p_period_end   date
) returns uuid language plpgsql security definer as $$
declare
  v_gross      integer;
  v_commission_pct numeric;
  v_commission integer;
  v_net        integer;
  v_payout_id  uuid;
begin
  -- Only admin can generate payouts
  if get_my_role() != 'admin' then
    raise exception 'Chỉ admin mới có thể tạo báo cáo thanh toán.';
  end if;

  select value::numeric / 100 into v_commission_pct
  from app_settings where key = 'commission_pct';

  select coalesce(sum(o.total_price), 0) into v_gross
  from orders o
  join bags b on b.id = o.bag_id
  where b.store_id = p_store_id
    and o.status = 'PICKED_UP'
    and o.created_at::date between p_period_start and p_period_end;

  v_commission := round(v_gross * v_commission_pct);
  v_net := v_gross - v_commission;

  insert into store_payouts (store_id, period_start, period_end, gross, commission, net, status)
  values (p_store_id, p_period_start, p_period_end, v_gross, v_commission, v_net, 'pending')
  returning id into v_payout_id;

  return v_payout_id;
end;
$$;

-- ============================================================
-- SEND NOTIFICATION (helper)
-- ============================================================
create or replace function send_notification(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_body    text default null,
  p_payload jsonb default '{}'
) returns void language plpgsql security definer as $$
begin
  insert into notifications (user_id, type, title, body, payload)
  values (p_user_id, p_type, p_title, p_body, p_payload);
end;
$$;

-- ============================================================
-- ASSIGN TICKET
-- ============================================================
create or replace function assign_ticket(
  p_ticket_id   uuid,
  p_assignee_id uuid,
  p_sla_hours   integer default 24
) returns void language plpgsql security definer as $$
begin
  if not has_role(array['support_agent','admin']::user_role[]) then
    raise exception 'Chỉ support hoặc admin mới có thể phân công ticket.';
  end if;

  update tickets
  set assignee_id = p_assignee_id,
      status      = 'Đang xử lý',
      sla_due_at  = now() + (p_sla_hours || ' hours')::interval
  where id = p_ticket_id;

  insert into ticket_notes (ticket_id, author_id, body)
  values (p_ticket_id, auth.uid(), 'Ticket đã được phân công cho nhân viên hỗ trợ.');
end;
$$;

-- ============================================================
-- RESOLVE TICKET
-- ============================================================
create or replace function resolve_ticket(
  p_ticket_id    uuid,
  p_resolution   text,
  p_refund_amount integer default 0
) returns void language plpgsql security definer as $$
begin
  if not has_role(array['support_agent','admin']::user_role[]) then
    raise exception 'Chỉ support hoặc admin mới có thể giải quyết ticket.';
  end if;

  update tickets
  set status        = 'Đã xử lý',
      resolution    = p_resolution,
      refund_amount = p_refund_amount
  where id = p_ticket_id;

  insert into ticket_notes (ticket_id, author_id, body)
  values (p_ticket_id, auth.uid(), 'Ticket đã được giải quyết: ' || p_resolution);
end;
$$;

-- ============================================================
-- LOG DECISION
-- ============================================================
create or replace function log_decision(
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_reason      text default null
) returns void language plpgsql security definer as $$
begin
  insert into decision_log (actor_id, entity_type, entity_id, action, reason)
  values (auth.uid(), p_entity_type, p_entity_id, p_action, p_reason);
end;
$$;

-- ============================================================
-- APPROVE STORE
-- ============================================================
create or replace function approve_store(
  p_store_id uuid,
  p_reason   text default null
) returns void language plpgsql security definer as $$
declare
  v_store stores%rowtype;
begin
  if get_my_role() != 'admin' then
    raise exception 'Chỉ admin mới có thể duyệt cửa hàng.';
  end if;

  select * into v_store from stores where id = p_store_id;

  if not found then
    raise exception 'Không tìm thấy cửa hàng.';
  end if;

  update stores set status = 'approved' where id = p_store_id;

  perform log_decision('store', p_store_id, 'approve', p_reason);

  perform send_notification(
    v_store.owner_id,
    'store_approved',
    'Cửa hàng của bạn đã được duyệt!',
    'Bạn có thể bắt đầu đăng túi thức ăn ngay bây giờ.',
    jsonb_build_object('store_id', p_store_id)
  );
end;
$$;

-- ============================================================
-- SUSPEND STORE
-- ============================================================
create or replace function suspend_store(
  p_store_id    uuid,
  p_reason      text,
  p_penalty_pts integer default 0
) returns void language plpgsql security definer as $$
declare
  v_store stores%rowtype;
begin
  if get_my_role() != 'admin' then
    raise exception 'Chỉ admin mới có thể tạm khóa cửa hàng.';
  end if;

  select * into v_store from stores where id = p_store_id;

  if not found then
    raise exception 'Không tìm thấy cửa hàng.';
  end if;

  update stores
  set status       = 'suspended',
      rank_penalty = rank_penalty + p_penalty_pts
  where id = p_store_id;

  perform log_decision('store', p_store_id, 'suspend', p_reason);

  perform send_notification(
    v_store.owner_id,
    'store_suspended',
    'Cửa hàng của bạn đã bị tạm khóa',
    p_reason,
    jsonb_build_object('store_id', p_store_id)
  );
end;
$$;


-- ============================================================
-- STORE CANCEL BAG
-- Cancel a bag and handle all orders
-- ============================================================
create or replace function store_cancel_bag(
  p_bag_id uuid
) returns void language plpgsql security definer as $$
declare
  v_bag bags%rowtype;
  v_ord orders%rowtype;
begin
  select * into v_bag from bags where id = p_bag_id;

  if not found then
    raise exception 'Không tìm thấy túi.';
  end if;

  -- Only store owner or admin
  if not (
    exists (select 1 from stores where id = v_bag.store_id and owner_id = auth.uid())
    or get_my_role() = 'admin'
  ) then
    raise exception 'Bạn không có quyền hủy túi này.';
  end if;

  if v_bag.status = 'CANCELLED' then
    raise exception 'Túi đã bị hủy trước đó.';
  end if;

  -- Cancel PENDING_PAYMENT orders
  for v_ord in
    select * from orders where bag_id = p_bag_id and status = 'PENDING_PAYMENT'
  loop
    update orders set status = 'CANCELLED' where id = v_ord.id;
    perform write_order_event(v_ord.id, 'PENDING_PAYMENT', 'CANCELLED', auth.uid(), 'Cửa hàng đã hủy túi');
  end loop;

  -- Refund PAID_AWAITING_PICKUP orders
  for v_ord in
    select * from orders where bag_id = p_bag_id and status = 'PAID_AWAITING_PICKUP'
  loop
    update orders set status = 'REFUNDED' where id = v_ord.id;
    perform write_order_event(v_ord.id, 'PAID_AWAITING_PICKUP', 'REFUNDED', auth.uid(), 'Cửa hàng đã hủy túi - hoàn tiền tự động');
  end loop;

  -- Cancel the bag
  update bags set status = 'CANCELLED' where id = p_bag_id;
end;
$$;

-- ============================================================
-- SUPPORT REFUND
-- ============================================================
create or replace function support_refund(
  p_ticket_id   uuid,
  p_amount      integer
) returns void language plpgsql security definer as $$
declare
  v_ticket tickets%rowtype;
  v_order  orders%rowtype;
begin
  -- Only support_agent or admin
  if not has_role(array['support_agent','admin']::user_role[]) then
    raise exception 'Chỉ nhân viên hỗ trợ mới có thể thực hiện hoàn tiền.';
  end if;

  select * into v_ticket from tickets where id = p_ticket_id;
  if not found then
    raise exception 'Không tìm thấy phiếu yêu cầu.';
  end if;

  if v_ticket.order_id is null then
    raise exception 'Phiếu này không liên kết với đơn hàng nào.';
  end if;

  select * into v_order from orders where id = v_ticket.order_id;

  if v_order.status not in ('PICKED_UP','NO_SHOW','PAID_AWAITING_PICKUP') then
    raise exception 'Chỉ có thể hoàn tiền cho đơn đã nhận, không đến lấy, hoặc đang chờ nhận.';
  end if;

  if p_amount <= 0 or p_amount > v_order.total_price then
    raise exception 'Số tiền hoàn không hợp lệ (phải từ 1 đến % VNĐ).', v_order.total_price;
  end if;

  update orders set status = 'REFUNDED' where id = v_ticket.order_id;
  update tickets
  set refund_amount = p_amount,
      status = 'Đã xử lý',
      resolution = 'Đã hoàn ' || p_amount || ' VNĐ'
  where id = p_ticket_id;

  perform write_order_event(
    v_ticket.order_id,
    v_order.status,
    'REFUNDED',
    auth.uid(),
    'Hỗ trợ viên hoàn tiền ' || p_amount || ' VNĐ'
  );
end;
$$;

-- ============================================================
-- GENERATE HELPER CODE
-- ============================================================
create or replace function generate_helper_code(
  p_order_id uuid
) returns text language plpgsql security definer as $$
declare
  v_code text;
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id;

  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  if v_order.buyer_id != auth.uid() then raise exception 'Bạn không có quyền.'; end if;
  if v_order.status != 'PAID_AWAITING_PICKUP' then
    raise exception 'Chỉ có thể tạo mã khi đơn đang chờ nhận.';
  end if;

  -- Generate 6-char alphanumeric code
  v_code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 6));

  update orders set helper_code = v_code where id = p_order_id;
  return v_code;
end;
$$;

-- ============================================================
-- SET APP SETTING (admin only)
-- ============================================================
create or replace function set_app_setting(
  p_key   text,
  p_value text
) returns void language plpgsql security definer as $$
begin
  if get_my_role() != 'admin' then
    raise exception 'Chỉ quản trị viên mới có thể thay đổi cài đặt.';
  end if;

  insert into app_settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = p_value, updated_at = now();

  insert into decision_log (actor_id, entity_type, action, reason)
  values (auth.uid(), 'app_settings', 'Cập nhật ' || p_key || ' = ' || p_value, null);
end;
$$;

-- ============================================================
-- GRANT / REVOKE ROLE (admin only)
-- ============================================================
create or replace function admin_set_role(
  p_user_id uuid,
  p_role    user_role
) returns void language plpgsql security definer as $$
begin
  if get_my_role() != 'admin' then
    raise exception 'Chỉ quản trị viên mới có thể phân quyền.';
  end if;

  insert into user_roles (user_id, role, granted_by)
  values (p_user_id, p_role, auth.uid())
  on conflict (user_id, role) do nothing;

  insert into decision_log (actor_id, entity_type, entity_id, action)
  values (auth.uid(), 'user_roles', p_user_id, 'Cấp quyền ' || p_role);
end;
$$;

create or replace function admin_revoke_role(
  p_user_id uuid,
  p_role    user_role
) returns void language plpgsql security definer as $$
begin
  if get_my_role() != 'admin' then
    raise exception 'Chỉ quản trị viên mới có thể thu hồi quyền.';
  end if;

  if p_role = 'buyer' then
    raise exception 'Không thể thu hồi quyền buyer cơ bản.';
  end if;

  delete from user_roles where user_id = p_user_id and role = p_role;

  insert into decision_log (actor_id, entity_type, entity_id, action)
  values (auth.uid(), 'user_roles', p_user_id, 'Thu hồi quyền ' || p_role);
end;
$$;

-- ============================================================
-- APPROVE / SUSPEND STORE (admin only)
-- ============================================================
create or replace function admin_approve_store(
  p_store_id uuid,
  p_status   store_status,
  p_reason   text default null
) returns void language plpgsql security definer as $$
begin
  if get_my_role() != 'admin' then
    raise exception 'Chỉ quản trị viên mới có thể duyệt cửa hàng.';
  end if;

  update stores set status = p_status where id = p_store_id;

  insert into decision_log (actor_id, entity_type, entity_id, action, reason)
  values (auth.uid(), 'stores', p_store_id, 'Cập nhật trạng thái: ' || p_status, p_reason);

  if p_status = 'approved' then
    insert into user_roles (user_id, role, granted_by)
    select owner_id, 'store_owner', auth.uid() from stores where id = p_store_id
    on conflict (user_id, role) do nothing;
  end if;
end;
$$;

-- ============================================================
-- REFRESH DEMO
-- Re-shifts all bag pickup windows relative to now()
-- ============================================================
create or replace function refresh_demo()
returns void language plpgsql security definer as $$
begin
  -- Only admin can call this
  if get_my_role() != 'admin' then
    raise exception 'Chỉ quản trị viên mới có thể làm mới dữ liệu demo.';
  end if;

  update bags
  set
    pickup_start = now() + (random() * 120 || ' minutes')::interval,
    pickup_end   = now() + (random() * 120 + 90 || ' minutes')::interval,
    status = 'OPEN',
    remaining = quantity
  where status in ('OPEN', 'CLOSED', 'SOLD_OUT');
end;
$$;

-- ============================================================
-- UPDATE STORE RANK PENALTIES (from quality score)
-- ============================================================
create or replace function update_store_rank_penalties()
returns void language plpgsql security definer as $$
begin
  update stores s
  set rank_penalty = case
    when q.quality_status = 'Giảm ưu tiên hiển thị' then 100
    when q.quality_status = 'Cần nhắc nhở' then 50
    else 0
  end
  from v_store_quality q
  where s.id = q.store_id;
end;
$$;
