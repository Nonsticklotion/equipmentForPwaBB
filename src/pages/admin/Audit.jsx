import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../auth'
import AuditList from '../../components/AuditList'

export default function Audit() {
  const { isAdmin, canEdit } = useAuth()
  const [stations, setStations] = useState([])
  const [f, setF] = useState({ station_id: '', table_name: '' })

  useEffect(() => {
    supabase.from('stations').select('id, name').order('sort').order('name')
      .then(({ data }) => setStations((data || []).filter(s => canEdit(s.id))))
  }, [])

  return (
    <>
      <p><Link to="/admin">‹ จัดการข้อมูล</Link></p>
      <h1>📜 ประวัติการแก้ไข</h1>
      <p className="muted small">
        บันทึกอัตโนมัติทุกครั้งที่มีการเพิ่ม/แก้ไข/ลบ — แก้หรือลบย้อนหลังไม่ได้
        {!isAdmin && ' · แสดงเฉพาะสถานีที่ดูแล'}
      </p>
      <div className="filters">
        <select value={f.station_id} onChange={e => setF({ ...f, station_id: e.target.value })}>
          <option value="">ทุกสถานี</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={f.table_name} onChange={e => setF({ ...f, table_name: e.target.value })}>
          <option value="">ทุกประเภท</option>
          <option value="equipment">อุปกรณ์</option>
          <option value="maintenance_logs">ประวัติซ่อม</option>
          <option value="equipment_photos">รูป</option>
          <option value="buildings">อาคาร</option>
          <option value="stations">สถานี</option>
          <option value="categories">หมวด</option>
        </select>
      </div>
      <AuditList filter={f} />
    </>
  )
}
