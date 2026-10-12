import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Order } from '@/types/database.types'

export function useOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchOrders()
  }, [user])

  async function fetchOrders() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          *,
          bags(
            id, category, price, retail_min, retail_max, example_dishes,
            pickup_start, pickup_end, status,
            stores(id, name, district, address)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      setOrders(data as Order[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  return { orders, loading, error, refetch: fetchOrders }
}

export function useOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    fetchOrder()
  }, [orderId])

  async function fetchOrder() {
    if (!orderId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          *,
          bags(*, stores(*))
        `)
        .eq('id', orderId)
        .single()

      if (err) throw err
      setOrder(data as Order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tìm thấy đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  return { order, loading, error, refetch: fetchOrder }
}

// Store owner orders
export function useStoreOrders(storeId: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!storeId) return
    fetchOrders()
  }, [storeId])

  async function fetchOrders() {
    if (!storeId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          *,
          bags!inner(id, store_id, category, price, pickup_start, pickup_end, example_dishes,
            stores(id, name))
        `)
        .eq('bags.store_id', storeId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setOrders(data as Order[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  return { orders, loading, error, refetch: fetchOrders }
}
