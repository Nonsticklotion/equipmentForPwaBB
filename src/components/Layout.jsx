import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../supabase'

export default function Layout() {
  const { user, isAdmin } = useAuth()
  const [q, setQ] = useState('')
  const nav = useNavigate()

  function onSearch(e) {
    e.preventDefault()
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">⚙️ ทะเบียนอุปกรณ์สถานี</Link>
        <form onSubmit={onSearch} className="search">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา รหัส / ชื่ออุปกรณ์ / ยี่ห้อ…" />
        </form>
        <nav className="topnav">
          <span className="who" title={user?.email || 'ยังไม่ได้เข้าสู่ระบบ'}>
            👤 {user ? user.email.split('@')[0] : 'Guest'}
            <span className={`role ${isAdmin ? 'admin' : ''}`}>{user ? (isAdmin ? 'แอดมิน' : 'ผู้ใช้') : 'ผู้เยี่ยมชม'}</span>
          </span>
          {isAdmin && <NavLink to="/admin">จัดการข้อมูล</NavLink>}
          {user && <NavLink to="/reset-password">เปลี่ยนรหัสผ่าน</NavLink>}
          {user
            ? <button className="link" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
            : <NavLink to="/login">เข้าสู่ระบบ</NavLink>}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
