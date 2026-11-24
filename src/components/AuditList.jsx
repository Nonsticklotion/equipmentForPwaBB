import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { allFields } from '../lib/fields'

const TABLE_LABEL = {
  stations: 'สถานี', buildings: 'อาคาร', categories: 'หมวด', equipment: 'อุปกรณ์',
  equipment_photos: 'รูป', maintenance_logs: 'ประวัติซ่อม',
}
const ACTION = { INSERT: ['เพิ่ม', 'ok'], UPDATE: ['แก้ไข', 'info'], DELETE: ['ลบ', 'bad'] }
const BASE_LABEL = {
  name: 'ชื่อ', tag: 'รหัส', status: 'สถานะ', note: 'หมายเหตุ', building_id: 'อาคาร', category_id: 'หมวด',
  code: 'รหัส', location: 'ที่ตั้ง', sort: 'ลำดับ', station_id: 'สถานี', icon: 'ไอคอน', field_schema: 'ช่องข้อมูล',
  kind: 'ประเภท', path: 'ไฟล์', title: 'รายการ', detail: 'รายละเอียด', log_date: 'วันที่', ir_mohm: 'IR (MΩ)',
  current_a: 'กระแส (A)', vibration: 'Vibration', temp_c: 'อุณหภูมิ', performed_by: 'ผู้ทำ', cost: 'ค่าใช้จ่าย',
}
const SKIP = new Set(['id', 'equipment_id', 'created_by', 'specs'])
const PAGE = 50

let specLabelCache = null
async function specLabels() {
  if (specLabelCache) return specLabelCache
  const { data } = await supabase.from('categories').select('field_schema')
  const m = {}
  ;(data || []).forEach(c => allFields(c.field_schema).forEach(f => { m[f.key] = f.unit ? `${f.label} (${f.unit})` : f.label }))
  return (specLabelCache = m)
}

const show = v => {
  if (v === null || v === undefined || v === '') return '–'
  if (typeof v === 'object') return Array.isArray(v) ? `[${v.length} รายการ]` : '{…}'
  return String(v)
}

// filter: { equipment_id?, station_id?, table_name? }
export default function AuditList({ filter = {}, title, collapsible = false }) {
  const [rows, setRows] = useState(null)
  const [labels, setLabels] = useState({})
  const [more, setMore] = useState(false)
  const [open, setOpen] = useState(!collapsible)
  const [err, setErr] = useState('')
  const key = JSON.stringify(filter)

  async function load(offset = 0) {
    let q = supabase.from('audit_log').select('*').order('at', { ascending: false }).range(offset, offset + PAGE - 1)
    Object.entries(filter).forEach(([k, v]) => { if (v) q = q.eq(k, v) })
    const { data, error } = await q
    if (error) return setErr(error.message.includes('audit_log') ? 'ยังไม่ได้รัน supabase/v3.sql' : error.message)
    setRows(r => offset ? [...(r || []), ...data] : data)
    setMore(data.length === PAGE)
  }

  useEffect(() => {
    if (!open) return
    specLabels().then(setLabels)
    load(0)
  }, [key, open])

  const fieldLabel = k => k.startsWith('specs.') ? (labels[k.slice(6)] || k.slice(6)) : (BASE_LABEL[k] || k)

  function Changes({ r }) {
    const c = r.changes || {}
    if (r.action === 'UPDATE') {
      return (
        <ul className="changes">
          {Object.entries(c).map(([k, [a, b]]) => (
            <li key={k}><span className="muted">{fieldLabel(k)}:</span> <del>{show(a)}</del> → <b>{show(b)}</b></li>
          ))}
        </ul>
      )
    }
    const brief = Object.entries(c).filter(([k, v]) => !SKIP.has(k) && v !== null && v !== '' && typeof v !== 'object').slice(0, 4)
    return brief.length ? <span className="muted small">{brief.map(([k, v]) => `${fieldLabel(k)}: ${show(v)}`).join(' · ')}</span> : null
  }

  const body = (
    <>
      {err && <p className="error">{err}</p>}
      {rows && rows.length === 0 && <p className="muted small">ยังไม่มีประวัติ</p>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table className="audit">
            <thead><tr><th>เวลา</th><th>ผู้แก้ไข</th><th>การกระทำ</th><th>รายการ</th><th>รายละเอียด</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="nowrap small">{new Date(r.at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="nowrap">{r.user_name || <span className="muted">ระบบ</span>}</td>
                  <td className="nowrap"><span className={`badge ${ACTION[r.action][1]}`}>{ACTION[r.action][0]}</span> <span className="small muted">{TABLE_LABEL[r.table_name] || r.table_name}</span></td>
                  <td>
                    {r.equipment_id && r.action !== 'DELETE' && !filter.equipment_id
                      ? <Link to={`/equipment/${r.equipment_id}`}>{r.label || '–'}</Link>
                      : (r.label || '–')}
                  </td>
                  <td><Changes r={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {more && <button className="btn ghost sm" onClick={() => load(rows.length)}>โหลดเพิ่ม</button>}
    </>
  )

  if (!collapsible) return body
  return (
    <section className="panel no-print">
      <button className="link collapse-head" onClick={() => setOpen(!open)}>
        <h3>📜 {title || 'ประวัติการแก้ไข'} <span className="muted small">{open ? '▴' : '▾'}</span></h3>
      </button>
      {open && body}
    </section>
  )
}
