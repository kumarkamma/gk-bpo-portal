import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const NotificationContext = createContext(null)
const STORAGE_KEY = 'gk_notifications'
const TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

function loadNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw)
    const now = Date.now()
    return all.filter(n => now - n.timestamp < TTL_MS)
  } catch {
    return []
  }
}

function saveNotifications(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(loadNotifications)

  // Purge expired every minute
  useEffect(() => {
    const t = setInterval(() => {
      setNotifications(prev => {
        const now = Date.now()
        const fresh = prev.filter(n => now - n.timestamp < TTL_MS)
        if (fresh.length !== prev.length) saveNotifications(fresh)
        return fresh
      })
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  const addNotification = useCallback((message, type = 'info', title = '') => {
    const n = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title,
      message,
      type, // 'info' | 'success' | 'warning' | 'error'
      timestamp: Date.now(),
      read: false,
    }
    setNotifications(prev => {
      const updated = [n, ...prev].slice(0, 50) // keep max 50
      saveNotifications(updated)
      return updated
    })
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n)
      saveNotifications(updated)
      return updated
    })
  }, [])

  const clearOne = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id)
      saveNotifications(updated)
      return updated
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markRead, clearOne, clearAll, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
