import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function ResetPassword() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)     // มี session (จากลิงก์อีเมล หรือล็อกอินอยู่)
  const [checking, setChecking] = useState(true)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const fromEmail = new URLSearchParams(window.location.search).has('code')

    function onSession(session) {
      if (!alive || !session) return
      setReady(true); setChecking(false)
      // ลบ ?recovery=1&code=... ออกจาก URL
      if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => onSession(session))
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) onSession(data.session)
      // ถ้ามาจากลิงก์อีเมล รอให้แลก code เป็น session ก่อนสรุปว่าลิงก์ใช้ไม่ได้
      else setTimeout(() => alive && setChecking(false), fromEmail ? 4000 : 0)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    if (pw.length < 8) return setMsg('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (pw !== pw2) return setMsg('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) {
      return setMsg(/different from the old/i.test(error.message)
        ? 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม'
        : 'เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + error.message)
    }
    setDone(true)
    setTimeout(() => nav('/'), 2000)
  }

  if (checking) return <div className="narrow"><p className="muted">กำลังตรวจสอบลิงก์…</p></div>

  if (!ready) return (
    <div className="narrow">
      <h1>ตั้งรหัสผ่านใหม่</h1>
      <p className="notice">ลิงก์หมดอายุหรือใช้ไปแล้ว หรือเปิดคนละเบราว์เซอร์กับที่กดขอ — กรุณาขอลิงก์ใหม่</p>
      <p><Link className="btn" to="/forgot-password">ขอลิงก์ใหม่</Link></p>
    </div>
  )

  return (
    <div className="narrow">
      <h1>ตั้งรหัสผ่านใหม่</h1>
      {done ? (
        <p className="notice">เปลี่ยนรหัสผ่านเรียบร้อย กำลังกลับหน้าหลัก…</p>
      ) : (
        <form onSubmit={submit} className="form">
          <label>รหัสผ่านใหม่
            <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} autoFocus required minLength={8} autoComplete="new-password" />
          </label>
          <label>ยืนยันรหัสผ่านใหม่
            <input type={show ? 'text' : 'password'} value={pw2} onChange={e => setPw2(e.target.value)} required autoComplete="new-password" />
          </label>
          <label className="toggle small" style={{ flexDirection: 'row' }}>
            <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> แสดงรหัสผ่าน
          </label>
          <button className="btn" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}</button>
          {msg && <p className="error">{msg}</p>}
        </form>
      )}
    </div>
  )
}
