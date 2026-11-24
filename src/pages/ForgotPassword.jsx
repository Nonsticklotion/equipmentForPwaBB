import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg('')
    // ลิงก์ในอีเมลจะพากลับมาที่หน้าเว็บนี้ + ?recovery=1 (ต้องอยู่ใน Redirect URLs ของ Supabase)
    const redirectTo = `${window.location.origin}${window.location.pathname}?recovery=1`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setBusy(false)
    if (error) {
      setMsg(/rate limit/i.test(error.message)
        ? 'ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
        : 'ส่งไม่สำเร็จ: ' + error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="narrow">
      <h1>ลืมรหัสผ่าน</h1>
      {sent ? (
        <div className="notice">
          ถ้ามีบัญชีของ <b>{email}</b> ในระบบ จะได้รับอีเมลลิงก์ตั้งรหัสผ่านใหม่ภายในไม่กี่นาที
          (ดูในโฟลเดอร์ Spam ด้วย) — <b>เปิดลิงก์ด้วยเบราว์เซอร์เครื่องเดียวกับที่กดขอ</b>
        </div>
      ) : (
        <form onSubmit={submit} className="form">
          <p className="muted small">กรอกอีเมลที่ใช้เข้าสู่ระบบ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้</p>
          <label>อีเมล<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></label>
          <button className="btn" disabled={busy}>{busy ? 'กำลังส่ง…' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}</button>
          {msg && <p className="error">{msg}</p>}
        </form>
      )}
      <p><Link to="/login" className="small">‹ กลับไปหน้าเข้าสู่ระบบ</Link></p>
    </div>
  )
}
