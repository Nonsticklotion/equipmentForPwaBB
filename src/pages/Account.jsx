import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth, ROLE_LABEL } from '../auth'

export default function Account() {
  const { user, profile, role, stations, refresh } = useAuth()
  const [name, setName] = useState('')
  const [names, setNames] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => { setName(profile?.display_name || '') }, [profile])
  useEffect(() => {
    if (!stations.size) return
    supabase.from('stations').select('name').in('id', [...stations]).then(({ data }) => setNames((data || []).map(s => s.name)))
  }, [stations])

  async function save(e) {
    e.preventDefault(); setMsg('')
    const { error } = await supabase.rpc('set_my_name', { n: name })
    if (error) return setMsg('บันทึกไม่สำเร็จ: ' + error.message)
    await refresh()
    setMsg('บันทึกแล้ว')
  }

  return (
    <div className="narrow">
      <h1>👤 บัญชีของฉัน</h1>
      <section className="panel">
        <div className="small muted">อีเมล</div>
        <div>{user.email}</div>
        <div className="small muted" style={{ marginTop: '.6rem' }}>สิทธิ์</div>
        <div>{ROLE_LABEL[role]}{names.length > 0 && <span className="muted small"> · {names.join(', ')}</span>}</div>
      </section>
      <form className="form panel" onSubmit={save}>
        <label>ชื่อที่แสดง (ภาษาไทยได้)
          <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="เช่น สมชาย ใจดี" />
        </label>
        <p className="muted small">ใช้แสดงที่มุมจอ และในประวัติการแก้ไข</p>
        <button className="btn">บันทึกชื่อ</button>
        {msg && <p className={msg === 'บันทึกแล้ว' ? 'notice' : 'error'}>{msg}</p>}
      </form>
      <p><Link className="btn ghost" to="/reset-password">🔑 เปลี่ยนรหัสผ่าน</Link></p>
    </div>
  )
}
