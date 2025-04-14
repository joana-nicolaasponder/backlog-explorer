import React, { createContext, useContext, useEffect, useState } from 'react'
import supabase from '../supabaseClient'

interface ThemeContextType {
  theme: string
  setTheme: (theme: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState('dark') // Default theme

  useEffect(() => {
    // Load theme from localStorage first for immediate display
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setThemeState(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    }

    // Then try to load from user preferences in database
    const loadUserTheme = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const session = await supabase.auth.getSession()

      if (user) {
        const { data: preferences, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .maybeSingle()

        if (error) {
          console.error('Error loading user preferences:', error)
        }

        if (preferences?.theme) {
          setThemeState(preferences.theme)
          document.documentElement.setAttribute('data-theme', preferences.theme)
          localStorage.setItem('theme', preferences.theme)
        }
      }
    }

    loadUserTheme()
  }, [])

  const setTheme = async (newTheme: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No user logged in')

      // Update theme in database
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, theme: newTheme },
          { onConflict: 'user_id' }
        )

      if (error) throw error

      // Update local state and DOM
      setThemeState(newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
      localStorage.setItem('theme', newTheme)
    } catch (error) {
      console.error('Error setting theme:', error)
      // Still update locally even if DB update fails
      setThemeState(newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
      localStorage.setItem('theme', newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
