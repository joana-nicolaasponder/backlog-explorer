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
        // Query today's usage from recommendation_history
        const today = new Date()
        // Get start of today in UTC (YYYY-MM-DDT00:00:00Z)
        const utcStart = today.toISOString().slice(0, 10) + 'T00:00:00Z'
        const { count, error: countError } = await supabase
          .from('recommendation_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('requested_at', utcStart)
        if (countError) {
          console.error('Supabase count error:', countError?.message || countError)
          throw new Error(countError?.message || JSON.stringify(countError))
        }
        // If count is null or undefined, treat as 0 used (new user, no records)
        if (typeof count === 'number') {
          setUsed(count)
        } else {
          setUsed(0)
        }
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
