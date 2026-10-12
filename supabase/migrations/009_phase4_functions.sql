-- 009_phase4_functions.sql
-- Run this in your Supabase SQL Editor to install Phase 4 Admin RPC functions

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
