-- 005b_helper_and_store_cancel.sql
-- Run this in Supabase SQL Editor to enable helper code delegation and store bag cancellation

-- 1. Helper code generator for buyer delegation
create or replace function generate_helper_code(
  p_order_id uuid
) returns text language plpgsql security definer as $$
declare
  v_code text;
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id;

  if not found then 
    raise exception 'Không tìm thấy đơn hàng.'; 
  end if;
  
  if v_order.buyer_id != auth.uid() then 
    raise exception 'Bạn không có quyền tạo mã cho đơn này.'; 
  end if;
  
  if v_order.status != 'PAID_AWAITING_PICKUP' then
    raise exception 'Chỉ có thể tạo mã khi đơn đang chờ nhận.';
  end if;

  -- Generate 6-char alphanumeric code using standard postgres md5
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  update orders set helper_code = v_code where id = p_order_id;
  return v_code;
end;
$$;

-- 2. Store cancellation of a bag (refunds paid orders, cancels pending orders)
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
