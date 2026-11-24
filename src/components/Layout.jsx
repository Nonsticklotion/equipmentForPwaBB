import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../supabase'

export default function Layout() {
  const { user, isAdmin } = useAuth()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)    // เมนูด้านข้าง (มือถือ)
  const nav = useNavigate()
  const loc = useLocation()

  // ปิดเมนูเมื่อเปลี่ยนหน้า
  useEffect(() => { setOpen(false) }, [loc.pathname, loc.search])

  // ล็อกการเลื่อนหน้าเมื่อเปิดเมนู + กด Esc ปิด
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = e => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open])

  function onSearch(e) {
    e.preventDefault()
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const who = (
    <span className="who" title={user?.email || 'ยังไม่ได้เข้าสู่ระบบ'}>
      <span className="who-name">👤 {user ? user.email.split('@')[0] : 'Guest'}</span>
      <span className={`role ${isAdmin ? 'admin' : ''}`}>{user ? (isAdmin ? 'แอดมิน' : 'ผู้ใช้') : 'ผู้เยี่ยมชม'}</span>
    </span>
  )

  const links = (
    <>
      <NavLink to="/" end>🏭 สถานีทั้งหมด</NavLink>
      {isAdmin && <NavLink to="/admin" end>🛠️ จัดการข้อมูล</NavLink>}
      {isAdmin && <NavLink to="/admin/stations">🏢 สถานี / อาคาร</NavLink>}
      {isAdmin && <NavLink to="/admin/categories">🧩 หมวดอุปกรณ์</NavLink>}
      {user && <NavLink to="/reset-password">🔑 เปลี่ยนรหัสผ่าน</NavLink>}
      {user
        ? <button className="link" onClick={() => supabase.auth.signOut()}>🚪 ออกจากระบบ</button>
        : <NavLink to="/login">🔓 เข้าสู่ระบบ</NavLink>}
    </>
  )

  return (
    <>
      <header className="topbar">
        <button className="menu-btn" onClick={() => setOpen(true)} aria-label="เปิดเมนู">☰</button>
        <Link to="/" className="brand">⚙️ <span>ทะเบียนอุปกรณ์สถานี</span></Link>
        <form onSubmit={onSearch} className="search">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา รหัส / ชื่อ / ยี่ห้อ…" />
        </form>
        <nav className="topnav">
          {who}
          {isAdmin && <NavLink to="/admin">จัดการข้อมูล</NavLink>}
          {user && <NavLink to="/reset-password">เปลี่ยนรหัสผ่าน</NavLink>}
          {user
            ? <button className="link" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
            : <NavLink to="/login">เข้าสู่ระบบ</NavLink>}
        </nav>
      </header>

      {/* เมนูด้านข้าง */}
      <div className={`drawer-backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          {who}
          <button className="drawer-close" onClick={() => setOpen(false)} aria-label="ปิดเมนู">✕</button>
        </div>
        <nav className="drawer-nav">{links}</nav>
      </aside>

      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
