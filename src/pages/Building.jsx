import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Crumbs from '../components/Crumbs'
import StatusBadge from '../components/StatusBadge'
import { listFields, fmt, label } from '../lib/fields'
import { useAuth } from '../auth'
import ExportButtons from '../components/ExportButtons'

export default function Building() {
  const { id } = useParams()
  const { canEdit } = useAuth()
  const [params, setParams] = useSearchParams()
  const [b, setB] = useState(null)
  const [cats, setCats] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('buildings')
        .select('*, stations(id, name), equipment(id, tag, name, status, specs, category_id)')
        .eq('id', id).single(),
      supabase.from('categories').select('*').order('sort'),
    ]).then(([r1, r2]) => {
      if (r1.error) setErr(r1.error.message)
      setB(r1.data); setCats(r2.data || [])
    })
  }, [id])

  const groups = useMemo(() => {
    if (!b) return []
    return cats
      .map(c => ({
        cat: c,
        items: b.equipment.filter(e => e.category_id === c.id)
          .sort((x, y) => (x.tag || x.name).localeCompare(y.tag || y.name, 'th', { numeric: true })),
      }))
      .filter(g => g.items.length)
  }, [b, cats])

  if (err) return <p className="error">{err}</p>
  if (!b) return <p className="muted">กำลังโหลด…</p>

  const active = params.get('cat') || String(groups[0]?.cat.id || '')
  const g = groups.find(x => String(x.cat.id) === active) || groups[0]

  return (
    <>
      <Crumbs items={[{ label: b.stations.name, to: `/station/${b.stations.id}` }, { label: b.name }]} />
      <div className="row-between">
        <h1>🏢 {b.name}</h1>
        <div className="actions">
          <ExportButtons filter={{ building: b.id }} filename={`${b.stations.name}_${b.name}`} />
          {canEdit(b.stations.id) && <Link className="btn" to={`/admin/equipment/new?building=${b.id}`}>+ เพิ่มอุปกรณ์</Link>}
        </div>
      </div>

      {groups.length === 0 && <p className="muted">ยังไม่มีอุปกรณ์ในอาคารนี้</p>}

      {groups.length > 0 && (
        <>
          <div className="tabs">
            {groups.map(x => (
              <button key={x.cat.id}
                className={String(x.cat.id) === String(g.cat.id) ? 'tab active' : 'tab'}
                onClick={() => setParams({ cat: x.cat.id })}>
                {x.cat.icon} {x.cat.name} <span className="count">{x.items.length}</span>
              </button>
            ))}
          </div>
          <EquipTable cat={g.cat} items={g.items} />
        </>
      )}
    </>
  )
}

export function EquipTable({ cat, items, extraCols = [] }) {
  const cols = listFields(cat.field_schema)
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>รหัส</th><th>ชื่อ</th>
            {extraCols.map(c => <th key={c.key}>{c.label}</th>)}
            {cols.map(f => <th key={f.key} className={f.type === 'number' ? 'num' : ''}>{label(f)}</th>)}
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {items.map(e => (
            <tr key={e.id}>
              <td><Link to={`/equipment/${e.id}`}><b>{e.tag || '–'}</b></Link></td>
              <td><Link to={`/equipment/${e.id}`}>{e.name}</Link></td>
              {extraCols.map(c => <td key={c.key}>{c.render(e)}</td>)}
              {cols.map(f => <td key={f.key} className={f.type === 'number' ? 'num' : ''}>{fmt(f, e.specs?.[f.key])}</td>)}
              <td><StatusBadge status={e.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
