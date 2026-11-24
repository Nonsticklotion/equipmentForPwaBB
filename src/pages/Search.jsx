import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import StatusBadge from '../components/StatusBadge'

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!q) return
    setRows(null)
    // search_text = รหัส + ชื่อ + หมายเหตุ + specs ทั้งก้อน (ค้นยี่ห้อ/serial ได้)
    const like = `%${q.toLowerCase().replace(/[%,()]/g, ' ').trim()}%`
    supabase.from('equipment')
      .select('id, tag, name, status, specs, categories(name, icon), buildings(name, stations(name))')
      .ilike('search_text', like)
      .limit(200)
      .then(({ data }) => setRows(data || []))
  }, [q])

  return (
    <>
      <h1>ผลการค้นหา “{q}”</h1>
      {!rows && <p className="muted">กำลังค้นหา…</p>}
      {rows && rows.length === 0 && <p className="muted">ไม่พบอุปกรณ์</p>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>รหัส</th><th>ชื่อ</th><th>หมวด</th><th>สถานี / อาคาร</th><th>สถานะ</th></tr></thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.id}>
                  <td><Link to={`/equipment/${e.id}`}><b>{e.tag || '–'}</b></Link></td>
                  <td><Link to={`/equipment/${e.id}`}>{e.name}</Link></td>
                  <td>{e.categories?.icon} {e.categories?.name}</td>
                  <td>{e.buildings?.stations?.name} / {e.buildings?.name}</td>
                  <td><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
