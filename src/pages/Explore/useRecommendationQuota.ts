import { useState, useEffect } from 'react'
import supabase from '../../supabaseClient'

/**
 * Hook to fetch the user's daily AI recommendation quota usage and limit.
 * Returns { used, limit, loading, error, isDevUser }
 */
export function useRecommendationQuota() {
  const [used, setUsed] = useState<number | null>(null)
  const [limit, setLimit] = useState<number>(5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDevUser, setIsDevUser] = useState(false)

  useEffect(() => {
    const fetchQuota = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setError('Not logged in')
          setLoading(false)
          return
        }
        // Check if dev user (update this logic as needed)
        const devEmails = ['joanaponder@gmail.com']
        setIsDevUser(devEmails.includes(user.email))
        if (devEmails.includes(user.email)) {
          setUsed(0)
          setLimit(Infinity)
          setLoading(false)
          return
        }
        // Fetch quota from backend to ensure consistent counting and time handling
        const params = new URLSearchParams({ userId: user.id })
        const resp = await fetch(`/api/usage/quota?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || 'Failed to fetch quota')
        }
        const data = await resp.json()
        // data: { used, limit, remaining, resetAt }
        if (typeof data?.used === 'number') setUsed(data.used)
        if (typeof data?.limit === 'number') setLimit(data.limit)
      } catch (e: any) {
        console.error('Quota fetch error:', e)
        setError(e.message || 'Failed to fetch quota')
      } finally {
        setLoading(false)
      }
    }
    fetchQuota()
  }, [])

  return { used, limit, loading, error, isDevUser }
}

