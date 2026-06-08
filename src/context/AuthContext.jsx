import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { data, error }
    if (data?.user) {
      const { data: profileData } = await supabase.from('users').select('*').eq('id', data.user.id).single()
      if (profileData?.status === 'banned') {
        await supabase.auth.signOut()
        return { data: null, error: { message: 'Your account has been permanently banned. Contact your administrator.' } }
      }
      if (profileData?.status === 'suspended') {
        await supabase.auth.signOut()
        return { data: null, error: { message: 'Your account is suspended. Contact your administrator.' } }
      }
      if (profileData?.status === 'inactive') {
        await supabase.auth.signOut()
        return { data: null, error: { message: 'Your account is deactivated. Contact your administrator.' } }
      }
      setProfile(profileData)
    }
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
