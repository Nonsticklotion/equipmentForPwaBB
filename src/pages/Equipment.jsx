import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Crumbs from '../components/Crumbs'
import StatusBadge from '../components/StatusBadge'
import { fmt } from '../lib/fields'
import { useAuth } from '../auth'

export default function Equipment() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [e, setE] = useState(null)
  const [err, setErr] = useState('')
  const [showEmpty, setShowEmpty] = useState(false)

  useEffect(() => {
    supabase.from('equipment')
      .select('*, categories(*), buildings(id, name, stations(id, name))')
      .eq('id', id).single()
      .then(({ data, error }) => { if (error) setErr(error.message); setE(data) })
  }, [id])

  if (err) return <p className="error">{err}</p>
  if (!e) return <p className="muted">กำลังโหลด…</p>

  const st = e.buildings.stations
  const schema = e.categories.field_schema || []
  const has = v => v !== null && v !== undefined && v !== ''

  return (
    <>
      <Crumbs items={[
        { label: st.name, to: `/station/${st.id}` },
        { label: e.buildings.name, to: `/building/${e.buildings.id}?cat=${e.category_id}` },
        { label: e.tag || e.name },
      ]} />

      <div className="row-between">
        <div>
          <div className="muted small">{e.categories.icon} {e.categories.name}</div>
          <h1>{e.tag && <span className="tag">{e.tag}</span>} {e.name}</h1>
          <StatusBadge status={e.status} />
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => window.print()}>พิมพ์</button>
          {isAdmin && <Link className="btn" to={`/admin/equipment/${e.id}`}>แก้ไข</Link>}
        </div>
      </div>

      <label className="small toggle no-print">
        <input type="checkbox" checked={showEmpty} onChange={x => setShowEmpty(x.target.checked)} /> แสดงช่องที่ยังไม่มีข้อมูล
      </label>

      <div className="spec-groups">
        {schema.map(grp => {
          const fields = grp.fields.filter(f => showEmpty || has(e.specs?.[f.key]))
          if (!fields.length) return null
          return (
            <section key={grp.group} className="spec-card">
              <h3>{grp.group}</h3>
              <dl>
                {fields.map(f => (
                  <div key={f.key} className={f.type === 'textarea' ? 'full' : ''}>
                    <dt>{f.label}</dt>
                    <dd className={f.type === 'textarea' ? 'pre' : ''}>
                      {fmt(f, e.specs?.[f.key])}
                      {has(e.specs?.[f.key]) && f.unit && <span className="unit"> {f.unit}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
        {e.note && (
          <section className="spec-card">
            <h3>หมายเหตุ</h3>
            <p className="pre">{e.note}</p>
          </section>
        )}
      </div>
      <p className="muted small">อัปเดตล่าสุด {new Date(e.updated_at).toLocaleString('th-TH')}</p>
    </>
  )
}
