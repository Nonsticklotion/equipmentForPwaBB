import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'

export default function Login() {
  const { user, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  if (user && isAdmin) return <Navigate to="/admin" replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setMsg(error.message === 'Invalid login credentials'
      ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      : error.message === 'Email not confirmed' ? 'อีเมลนี้ยังไม่ได้ยืนยัน' : 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message)
  }

  return (
    <div className="narrow">
      <h1>เข้าสู่ระบบ</h1>
      {user && !isAdmin && (
        <p className="notice">บัญชี {user.email} ยังไม่ได้รับสิทธิ์แอดมิน — ให้ผู้ดูแลตั้ง role = 'admin' ในตาราง profiles</p>
      )}
      {!user && (
        <form onSubmit={submit} className="form">
          <label>อีเมล<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>รหัสผ่าน<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <button className="btn" disabled={busy}>{busy ? 'กำลังเข้า…' : 'เข้าสู่ระบบ'}</button>
          {msg && <p className="error">{msg}</p>}
          <Link to="/forgot-password" className="small">ลืมรหัสผ่าน?</Link>
        </form>
      )}
    </div>
  )
}
