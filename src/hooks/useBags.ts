import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Bag } from '@/types/database.types'

interface UseBagsOptions {
  district?: string
  category?: string
  day?: 'today' | 'tomorrow'
  storeId?: string
  status?: string
}

export function useBags(options: UseBagsOptions = {}) {
  const [bags, setBags] = useState<Bag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBags()
  }, [options.district, options.category, options.day, options.storeId, options.status])

  async function fetchBags() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('bags')
        .select('*, stores(id, name, district, category, address, rank_penalty, status)')
        .order('created_at', { ascending: false })

      if (options.status) {
        query = query.eq('status', options.status)
      } else if (!options.storeId) {
        // Discovery: show only open/sold_out bags from approved stores
        query = query.in('status', ['OPEN', 'SOLD_OUT'])
      }

      if (options.storeId) {
        query = query.eq('store_id', options.storeId)
      }

      if (options.district) {
        // Filter by store district via join
        query = query.eq('stores.district', options.district)
      }

      if (options.category) {
        query = query.eq('category', options.category)
      }

      if (options.day) {
        const now = new Date()
        if (options.day === 'today') {
          const end = new Date(now)
          end.setHours(23, 59, 59, 999)
          query = query.lte('pickup_start', end.toISOString())
        } else {
          const tomorrowStart = new Date(now)
          tomorrowStart.setDate(tomorrowStart.getDate() + 1)
          tomorrowStart.setHours(0, 0, 0, 0)
          const tomorrowEnd = new Date(tomorrowStart)
          tomorrowEnd.setHours(23, 59, 59, 999)
          query = query
            .gte('pickup_start', tomorrowStart.toISOString())
            .lte('pickup_start', tomorrowEnd.toISOString())
        }
      }

      const { data, error: err } = await query

      if (err) throw err

      // Apply discovery ranking: bags from penalized stores appear lower
      const sorted = (data as Bag[]).sort((a, b) => {
        const penA = a.stores?.rank_penalty ?? 0
        const penB = b.stores?.rank_penalty ?? 0
        if (penA !== penB) return penA - penB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setBags(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải danh sách túi.')
    } finally {
      setLoading(false)
    }
  }

  return { bags, loading, error, refetch: fetchBags }
}

export function useBag(bagId: string | undefined) {
  const [bag, setBag] = useState<Bag | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bagId) return
    fetchBag()
  }, [bagId])

  async function fetchBag() {
    if (!bagId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('bags')
        .select('*, stores(*)')
        .eq('id', bagId)
        .single()

      if (err) throw err
      setBag(data as Bag)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải thông tin túi.')
    } finally {
      setLoading(false)
    }
  }

  return { bag, loading, error, refetch: fetchBag }
}
