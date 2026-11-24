import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase'
import StatusBadge from '../../components/StatusBadge'
import ExportButtons from '../../components/ExportButtons'
import { useAuth } from '../../auth'

export default function AdminHome() {
  const { isAdmin, canEdit } = useAuth()
  const [rows, setRows] = useState([])
  const [stations, setStations] = useState([])
  const [cats, setCats] = useState([])
  const [f, setF] = useState({ station: '', building: '', cat: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('equipment')
        .select('id, tag, name, status, updated_at, category_id, building_id, categories(name, icon), buildings(name, station_id)')
        .order('updated_at', { ascending: false }),
      supabase.from('stations').select('id, name, buildings(id, name)').order('sort').order('name'),
      supabase.from('categories').select('id, name, icon').order('sort'),
    ]).then(([a, b, c]) => {
      // ผู้ดูแลสถานีเห็นเฉพาะสถานีของตัวเอง
      setRows((a.data || []).filter(r => canEdit(r.buildings?.station_id)))
      setStations((b.data || []).filter(s => canEdit(s.id)))
      setCats(c.data || [])
    })
  }, [])

  const buildings = stations.find(s => String(s.id) === f.station)?.buildings || []
  const list = useMemo(() => rows.filter(r =>
    (!f.station || String(r.buildings?.station_id) === f.station) &&
    (!f.building || String(r.building_id) === f.building) &&
    (!f.cat || String(r.category_id) === f.cat)
  ), [rows, f])

  return (
    <>
      <div className="row-between">
        <h1>จัดการข้อมูล{!isAdmin && <span className="muted small"> · เฉพาะสถานีที่ดูแล</span>}</h1>
        <div className="actions">
          <Link className="btn ghost" to="/admin/stations">สถานี / อาคาร</Link>
          {isAdmin && <Link className="btn ghost" to="/admin/categories">หมวดอุปกรณ์</Link>}
          {isAdmin && <Link className="btn ghost" to="/admin/users">👥 ผู้ใช้ / สิทธิ์</Link>}
          <Link className="btn ghost" to="/admin/audit">📜 ประวัติการแก้ไข</Link>
          {isAdmin && <Link className="btn ghost" to="/admin/backup">💾 Backup</Link>}
          <Link className="btn" to="/admin/equipment/new">+ เพิ่มอุปกรณ์</Link>
        </div>
      </div>

      <div className="filters">
        <select value={f.station} onChange={e => setF({ ...f, station: e.target.value, building: '' })}>
          <option value="">ทุกสถานี</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={f.building} onChange={e => setF({ ...f, building: e.target.value })} disabled={!f.station}>
          <option value="">ทุกอาคาร</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })}>
          <option value="">ทุกหมวด</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <span className="muted small">{list.length} รายการ</span>
        <ExportButtons filter={{ station: f.station, building: f.building, cat: f.cat }} filename="equipment" />
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>รหัส</th><th>ชื่อ</th><th>หมวด</th><th>อาคาร</th><th>สถานะ</th><th>แก้ไขล่าสุด</th><th></th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id}>
                <td><b>{r.tag || '–'}</b></td>
                <td><Link to={`/equipment/${r.id}`}>{r.name}</Link></td>
                <td>{r.categories?.icon} {r.categories?.name}</td>
                <td>{r.buildings?.name}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="small muted">{new Date(r.updated_at).toLocaleDateString('th-TH')}</td>
                <td><Link to={`/admin/equipment/${r.id}`}>แก้ไข</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
