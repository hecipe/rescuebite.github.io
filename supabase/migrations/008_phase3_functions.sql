-- 008_phase3_functions.sql
-- Run in Supabase SQL Editor if support_refund is not yet active

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
