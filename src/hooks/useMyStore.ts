import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Store, Bag } from '@/types/database.types'

export function useMyStore() {
  const { user, role } = useAuth()
  const [store, setStore] = useState<Store | null>(null)
  const [bags, setBags] = useState<Bag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || (role !== 'store_owner' && role !== 'admin')) {
      setLoading(false)
      return
    }
    fetchStore()
  }, [user, role])

  async function fetchStore() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: storeData, error: storeErr } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (storeErr) {
        if (storeErr.code === 'PGRST116') {
          // No store yet
          setStore(null)
        } else {
          throw storeErr
        }
      } else {
        setStore(storeData as Store)
        // Fetch bags for this store
        const { data: bagData } = await supabase
          .from('bags')
          .select('*, stores(id, name, district)')
          .eq('store_id', storeData.id)
          .order('created_at', { ascending: false })
        setBags((bagData ?? []) as Bag[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải thông tin cửa hàng.')
    } finally {
      setLoading(false)
    }
  }

  return { store, bags, loading, error, refetch: fetchStore }
}
