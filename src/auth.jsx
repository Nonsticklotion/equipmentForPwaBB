import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext(null)

export const ROLE_LABEL = { admin: 'แอดมิน', editor: 'ผู้ดูแลสถานี', viewer: 'ผู้ใช้' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)       // { role, display_name, email }
  const [stations, setStations] = useState(new Set()) // station ids ที่ดูแล
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async u => {
    setUser(u)
    if (!u) { setProfile(null); setStations(new Set()); return }
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).maybeSingle(),
      supabase.from('station_members').select('station_id').eq('user_id', u.id),
    ])
    setProfile(p || { role: 'viewer', email: u.email })
    setStations(new Set((m || []).map(x => x.station_id)))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      await loadProfile(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((e, session) => {
      if (e === 'SIGNED_IN' || e === 'SIGNED_OUT' || e === 'USER_UPDATED') loadProfile(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const role = profile?.role || (user ? 'viewer' : 'guest')
  const isAdmin = role === 'admin'
  const isEditor = role === 'editor' && stations.size > 0
  const canEdit = sid => isAdmin || (role === 'editor' && stations.has(Number(sid)))
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Guest'

  const value = {
    user, profile, role, isAdmin, isEditor, canManage: isAdmin || isEditor,
    stations, canEdit, displayName, loading,
    refresh: () => loadProfile(user),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
