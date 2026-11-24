import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Dashboard from '../components/Dashboard'

export default function Home() {
  const [stations, setStations] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('stations')
      .select('*, buildings(id, equipment(count))')
      .order('sort').order('name')
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        setStations(data || [])
      })
  }, [])

  if (err) return <p className="error">{err}</p>
  if (!stations) return <p className="muted">กำลังโหลด…</p>

  return (
    <>
      <h1>ภาพรวม</h1>
      <Dashboard stations={stations} />
      <h2>สถานี</h2>
      {stations.length === 0 && <p className="muted">ยังไม่มีสถานี — แอดมินเพิ่มได้ที่เมนู "จัดการข้อมูล"</p>}
      <div className="grid">
        {stations.map(s => {
          const nEq = s.buildings.reduce((a, b) => a + (b.equipment?.[0]?.count || 0), 0)
          return (
            <Link key={s.id} to={`/station/${s.id}`} className="card">
              <div className="card-title">{s.name}</div>
              {s.code && <div className="muted small">{s.code}</div>}
              {s.location && <div className="small">{s.location}</div>}
              <div className="stats">
                <span><b>{s.buildings.length}</b> อาคาร</span>
                <span><b>{nEq}</b> อุปกรณ์</span>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
