import { useState, useEffect } from 'react'
import supabase from '../../supabaseClient'


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
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) {
          setError('Not logged in')
          setLoading(false)
          return
        }
        const devEmails = ['joanaponder@gmail.com']
        const userEmail = user.email ?? ''
        setIsDevUser(devEmails.includes(userEmail))
        if (devEmails.includes(userEmail)) {
          setUsed(0)
          setLimit(Infinity)
          setLoading(false)
          return
        }
        const params = new URLSearchParams({ userId: user.id })
        const envAny = (import.meta as any)?.env || {}
        let API_BASE =
          envAny.VITE_API_BASE_URL ||
          envAny.VITE_API_URL ||
          envAny.VITE_BACKEND_URL ||
          ''
        if (!API_BASE && typeof window !== 'undefined') {
          const host = window.location.hostname
          if (
            host === 'backlogexplorer.com' ||
            host.endsWith('.backlogexplorer.com')
          ) {
            API_BASE = 'https://backlog-explorer-api.onrender.com'
          }
        }
        const usageUrl = `${API_BASE}/api/usage/quota?${params.toString()}`
        const openaiUrl = `${API_BASE}/api/openai/quota?${params.toString()}`

      

        const safeParseJson = async (response: Response) => {
          const ctype = response.headers.get('content-type') || ''
          if (!ctype.toLowerCase().includes('application/json')) return null
          try {
            return await response.json()
          } catch {
            return null
          }
        }

        const resp = await fetch(usageUrl, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        let data = await safeParseJson(resp)

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
