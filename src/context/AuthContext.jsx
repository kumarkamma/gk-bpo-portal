import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
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

  // Exposed so ProfilePage can refresh context after saving name/phone
  async function refreshProfile() {
    if (!user) return
    await fetchProfile(user.id)
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

      // ── Attendance auto clock-in ──────────────────────────
      const today = new Date().toISOString().slice(0, 10)
      // Only insert if no record exists for today yet
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('date', today)
        .maybeSingle()

      if (!existing) {
        await supabase.from('attendance').insert({
          user_id:    data.user.id,
          date:       today,
          login_time: new Date().toISOString(),
        })
      }
    }

    return { data, error }
  }

  async function signOut() {
    // ── Attendance auto clock-out ─────────────────────────
    if (user) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: att } = await supabase
        .from('attendance')
        .select('id, login_time')
        .eq('user_id', user.id)
        .eq('date', today)
        .is('logout_time', null)
        .maybeSingle()

      if (att) {
        const logoutTime  = new Date()
        const loginTime   = new Date(att.login_time)
        const workingHours = parseFloat(((logoutTime - loginTime) / 3_600_000).toFixed(2))
        await supabase.from('attendance').update({
          logout_time:   logoutTime.toISOString(),
          working_hours: workingHours,
        }).eq('id', att.id)
      }
    }

    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
