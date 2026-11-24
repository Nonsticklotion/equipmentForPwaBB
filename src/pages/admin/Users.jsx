import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth, ROLE_LABEL } from '../../auth'

export default function Users() {
  const { user: me, refresh } = useAuth()
  const [users, setUsers] = useState(null)
  const [stations, setStations] = useState([])
  const [members, setMembers] = useState({})     // user_id -> Set(station_id)
  const [dirty, setDirty] = useState({})         // user_id -> true
  const [msg, setMsg] = useState('')

  async function load() {
    const [u, s, m] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('stations').select('id, name').order('sort').order('name'),
      supabase.from('station_members').select('*'),
    ])
    if (u.error || m.error) return setMsg((u.error || m.error).message.includes('station_members') ? 'ยังไม่ได้รัน supabase/v3.sql' : (u.error || m.error).message)
    setUsers(u.data); setStations(s.data || [])
    const mm = {}
    ;(m.data || []).forEach(x => { (mm[x.user_id] ||= new Set()).add(x.station_id) })
    setMembers(mm); setDirty({})
  }
  useEffect(() => { load() }, [])

  const setUser = (id, patch) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u))
    setDirty(d => ({ ...d, [id]: true }))
  }
  const toggle = (uid, sid) => {
    setMembers(m => {
      const s = new Set(m[uid] || [])
      s.has(sid) ? s.delete(sid) : s.add(sid)
      return { ...m, [uid]: s }
    })
    setDirty(d => ({ ...d, [uid]: true }))
  }

  async function save(u) {
    setMsg('')
    const { error } = await supabase.from('profiles')
      .update({ role: u.role, display_name: u.display_name?.trim() || null }).eq('id', u.id)
    if (error) return setMsg(error.message)
    const want = [...(members[u.id] || [])]
    const del = await supabase.from('station_members').delete().eq('user_id', u.id)
    if (del.error) return setMsg(del.error.message)
    if (want.length) {
      const ins = await supabase.from('station_members').insert(want.map(sid => ({ user_id: u.id, station_id: sid })))
      if (ins.error) return setMsg(ins.error.message)
    }
    setDirty(d => ({ ...d, [u.id]: false }))
    setMsg(`บันทึก ${u.display_name || u.email} แล้ว`)
    if (u.id === me.id) refresh()
  }

  return (
    <>
      <p><Link to="/admin">‹ จัดการข้อมูล</Link></p>
      <h1>👥 ผู้ใช้ / สิทธิ์</h1>
      <div className="notice small">
        <b>เพิ่มผู้ใช้ใหม่:</b> Supabase → Authentication → Users → Add user (ติ๊ก Auto Confirm) แล้วกลับมาตั้งสิทธิ์ที่หน้านี้<br />
        <b>แอดมิน</b> แก้ได้ทุกอย่าง · <b>ผู้ดูแลสถานี</b> แก้อุปกรณ์/อาคาร/รูป/ประวัติซ่อม เฉพาะสถานีที่ติ๊ก · <b>ผู้ใช้</b> ดูอย่างเดียว
      </div>
      {msg && <p className={msg.startsWith('บันทึก') ? 'notice' : 'error'}>{msg}</p>}
      {!users && !msg && <p className="muted">กำลังโหลด…</p>}

      <div className="user-list">
        {users?.map(u => {
          const self = u.id === me.id
          return (
            <section key={u.id} className={`panel user-card ${dirty[u.id] ? 'dirty' : ''}`}>
              <div className="form-grid">
                <label>อีเมล<input value={u.email || ''} disabled /></label>
                <label>ชื่อที่แสดง<input value={u.display_name || ''} placeholder="เช่น สมชาย ใจดี" onChange={e => setUser(u.id, { display_name: e.target.value })} /></label>
                <label>สิทธิ์
                  <select value={u.role} disabled={self} onChange={e => setUser(u.id, { role: e.target.value })}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {self && <span className="muted small">เปลี่ยนสิทธิ์ตัวเองไม่ได้</span>}
                </label>
              </div>
              {u.role === 'editor' && (
                <div className="station-picks">
                  <div className="small muted">สถานีที่ดูแล:</div>
                  {stations.map(s => (
                    <label key={s.id} className="toggle small">
                      <input type="checkbox" checked={!!members[u.id]?.has(s.id)} onChange={() => toggle(u.id, s.id)} /> {s.name}
                    </label>
                  ))}
                  {!members[u.id]?.size && <span className="small error">ยังไม่ได้เลือกสถานี — จะแก้ไขอะไรไม่ได้</span>}
                </div>
              )}
              <div className="actions">
                <button className="btn sm" disabled={!dirty[u.id]} onClick={() => save(u)}>บันทึก</button>
                <span className="muted small">สมัครเมื่อ {new Date(u.created_at).toLocaleDateString('th-TH')}</span>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
