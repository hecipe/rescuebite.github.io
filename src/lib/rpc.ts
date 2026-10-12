import { supabase } from './supabase'
import type { UserRole } from '@/types/database.types'

// ============================================================
// ORDER FLOW RPCs
// ============================================================

export async function rpcPlaceOrder(bagId: string, qty: number = 1) {
  const { data, error } = await supabase.rpc('place_order', { p_bag_id: bagId, p_qty: qty })
  if (error) throw new Error(error.message)
  return data as string // order_id UUID
}

export async function rpcSimulatePayment(orderId: string, result: 'success' | 'fail') {
  const { data, error } = await supabase.rpc('simulate_payment', {
    p_order_id: orderId,
    p_result: result,
  })
  if (error) throw new Error(error.message)
  return data as string // new status
}

export async function rpcCancelOrder(orderId: string) {
  const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId })
  if (error) throw new Error(error.message)
  return data as string // new status
}

export async function rpcConfirmPickup(identifier: string) {
  const { data, error } = await supabase.rpc('confirm_pickup', { p_identifier: identifier })
  if (error) throw new Error(error.message)
  return data as string // 'PICKED_UP'
}

export async function rpcExpireOrders() {
  const { data, error } = await supabase.rpc('expire_orders')
  if (error) throw new Error(error.message)
  return data as { cancelled_pending: number; no_show: number; closed_bags: number }
}

export async function rpcStoreCancelBag(bagId: string) {
  const { error } = await supabase.rpc('store_cancel_bag', { p_bag_id: bagId })
  if (error) throw new Error(error.message)
}

export async function rpcSupportRefund(ticketId: string, amount: number) {
  const { error } = await supabase.rpc('support_refund', {
    p_ticket_id: ticketId,
    p_amount: amount,
  })
  if (error) throw new Error(error.message)
}

export async function rpcGenerateHelperCode(orderId: string) {
  const { data, error } = await supabase.rpc('generate_helper_code', { p_order_id: orderId })
  if (error) throw new Error(error.message)
  return data as string
}

export async function rpcAssignTicket(ticketId: string, assigneeId: string, slaHours: number = 24) {
  const { error } = await supabase.rpc('assign_ticket', {
    p_ticket_id: ticketId,
    p_assignee_id: assigneeId,
    p_sla_hours: slaHours,
  })
  if (error) throw new Error(error.message)
}

export async function rpcResolveTicket(ticketId: string, resolution: string, refundAmount: number = 0) {
  const { error } = await supabase.rpc('resolve_ticket', {
    p_ticket_id: ticketId,
    p_resolution: resolution,
    p_refund_amount: refundAmount,
  })
  if (error) throw new Error(error.message)
}

export async function rpcApproveStore(storeId: string, reason?: string) {
  const { error } = await supabase.rpc('approve_store', {
    p_store_id: storeId,
    p_reason: reason ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function rpcLogDecision(entityType: string, entityId: string, action: string, reason?: string) {
  const { error } = await supabase.rpc('log_decision', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action: action,
    p_reason: reason ?? null,
  })
  if (error) throw new Error(error.message)
}

// ============================================================
// ADMIN RPCs (with Graceful RLS Fallback)
// ============================================================

export async function rpcSetAppSetting(key: string, value: string) {
  try {
    const { error } = await supabase.rpc('set_app_setting', { p_key: key, p_value: value })
    if (!error) return
    if (error.code !== 'PGRST202') throw new Error(error.message)
  } catch (err: any) {
    if (err.message && !err.message.includes('schema cache')) throw err
  }

  // Fallback direct RLS
  const { error: upsertErr } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (upsertErr) throw new Error(upsertErr.message)

  try {
    await supabase.from('decision_log').insert({
      entity_type: 'app_settings',
      action: `Cập nhật ${key} = ${value}`,
    })
  } catch {}
}

export async function rpcAdminSetRole(userId: string, role: UserRole) {
  try {
    const { error } = await supabase.rpc('admin_set_role', { p_user_id: userId, p_role: role })
    if (!error) return
    if (error.code !== 'PGRST202') throw new Error(error.message)
  } catch (err: any) {
    if (err.message && !err.message.includes('schema cache')) throw err
  }

  // Fallback direct RLS
  const { error: insErr } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' })
  if (insErr) throw new Error(insErr.message)

  try {
    await supabase.from('decision_log').insert({
      entity_type: 'user_roles',
      entity_id: userId,
      action: `Cấp quyền ${role}`,
    })
  } catch {}
}

export async function rpcAdminRevokeRole(userId: string, role: UserRole) {
  if (role === 'buyer') throw new Error('Không thể thu hồi quyền buyer cơ bản.')

  try {
    const { error } = await supabase.rpc('admin_revoke_role', { p_user_id: userId, p_role: role })
    if (!error) return
    if (error.code !== 'PGRST202') throw new Error(error.message)
  } catch (err: any) {
    if (err.message && !err.message.includes('schema cache')) throw err
  }

  // Fallback direct RLS
  const { error: delErr } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)
  if (delErr) throw new Error(delErr.message)

  try {
    await supabase.from('decision_log').insert({
      entity_type: 'user_roles',
      entity_id: userId,
      action: `Thu hồi quyền ${role}`,
    })
  } catch {}
}

export async function rpcAdminApproveStore(
  storeId: string,
  status: 'approved' | 'suspended' | 'pending',
  reason?: string
) {
  try {
    const { error } = await supabase.rpc('admin_approve_store', {
      p_store_id: storeId,
      p_status: status,
      p_reason: reason ?? null,
    })
    if (!error) return
    if (error.code !== 'PGRST202') throw new Error(error.message)
  } catch (err: any) {
    if (err.message && !err.message.includes('schema cache')) throw err
  }

  // Fallback direct RLS
  const { data: store, error: stErr } = await supabase
    .from('stores')
    .update({ status })
    .eq('id', storeId)
    .select('owner_id')
    .single()
  if (stErr) throw new Error(stErr.message)

  if (status === 'approved' && store?.owner_id) {
    await supabase
      .from('user_roles')
      .upsert({ user_id: store.owner_id, role: 'store_owner' }, { onConflict: 'user_id,role' })
  }

  try {
    await supabase.from('decision_log').insert({
      entity_type: 'stores',
      entity_id: storeId,
      action: `Cập nhật trạng thái: ${status}`,
      reason: reason ?? null,
    })
  } catch {}
}

export async function rpcRefreshDemo() {
  try {
    const { error } = await supabase.rpc('refresh_demo')
    if (!error) return
    if (error.code !== 'PGRST202') throw new Error(error.message)
  } catch (err: any) {
    if (err.message && !err.message.includes('schema cache')) throw err
  }

  // Fallback direct RLS
  const now = new Date()
  const start = new Date(now.getTime() + 10 * 60000).toISOString()
  const end = new Date(now.getTime() + 180 * 60000).toISOString()

  const { error: bagErr } = await supabase
    .from('bags')
    .update({
      pickup_start: start,
      pickup_end: end,
      status: 'OPEN',
    })
    .in('status', ['OPEN', 'CLOSED', 'SOLD_OUT'])
  if (bagErr) throw new Error(bagErr.message)
}

export async function rpcUpdateStoreRankPenalties() {
  try {
    const { error } = await supabase.rpc('update_store_rank_penalties')
    if (!error) return
    if (error.code !== 'PGRST202') throw new Error(error.message)
  } catch (err: any) {
    if (err.message && !err.message.includes('schema cache')) throw err
  }

  // Fallback direct RLS
  const { data: qStores } = await supabase.from('v_store_quality').select('store_id, quality_status')
  if (qStores) {
    for (const qs of qStores) {
      const penalty =
        qs.quality_status === 'Giảm ưu tiên hiển thị' ? 100 : qs.quality_status === 'Cần nhắc nhở' ? 50 : 0
      await supabase.from('stores').update({ rank_penalty: penalty }).eq('id', qs.store_id)
    }
  }
}

