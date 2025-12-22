import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logger } from '@/utils/logger'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Theme Provider Component
function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    // Read from localStorage
    const savedTheme = localStorage.getItem('theme')
    const initialDark = savedTheme === 'dark'

    setIsDark(initialDark)

    // Apply immediately
    if (initialDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Update when isDark changes
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light')

    // Update DOM
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Debug log
    logger.debug('Theme changed to:', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    logger.debug('Toggle theme called, current:', isDark)
    setIsDark(prev => !prev)
  }

  const value = {
    isDark,
    toggleTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Hook to use theme
function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// Export both
export { ThemeProvider, useTheme }
