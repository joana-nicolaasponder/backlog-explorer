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
        const userEmail = user.email ?? ''
        setIsDevUser(devEmails.includes(userEmail))
        if (devEmails.includes(userEmail)) {
          setUsed(0)
          setLimit(Infinity)
          setLoading(false)
          return
        }
        // Fetch quota from backend to ensure consistent counting and time handling
        const params = new URLSearchParams({ userId: user.id })
        const envAny = (import.meta as any)?.env || {}
        const API_BASE =
          envAny.VITE_API_BASE_URL || envAny.VITE_API_URL || envAny.VITE_BACKEND_URL || ''
        const usageUrl = `${API_BASE}/api/usage/quota?${params.toString()}`
        const openaiUrl = `${API_BASE}/api/openai/quota?${params.toString()}`

        // Helper to safely parse JSON or return null if not JSON
        const safeParseJson = async (response: Response) => {
          const ctype = response.headers.get('content-type') || ''
          if (!ctype.toLowerCase().includes('application/json')) return null
          try {
            return await response.json()
          } catch {
            return null
          }
        }

        // Try primary path first
        const resp = await fetch(usageUrl, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        let data = await safeParseJson(resp)

        // Fallback: some prod proxies only forward /api/openai/*
        if (!resp.ok || data == null) {
          const fallback = await fetch(openaiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
          const fbData = await safeParseJson(fallback)
          if (fallback.ok && fbData) {
            data = fbData
          } else {
            const text = await (fallback.ok ? resp.text() : fallback.text())
            throw new Error(
              text && text.trim().startsWith('<')
                ? 'Server returned HTML instead of JSON. Please refresh and try again.'
                : text || 'Failed to fetch quota'
            )
          }
        }
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

