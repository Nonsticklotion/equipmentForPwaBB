import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, STATUSES } from '../supabase'
import { allFields } from '../lib/fields'
import StatusBadge from './StatusBadge'

const STATUS_CLS = { 'ใช้งาน': 'ok', 'สำรอง': 'info', 'ชำรุด': 'bad', 'ซ่อม': 'warn', 'เลิกใช้': 'off' }
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: d })

// หาค่าแรกของหมวดที่มีหน่วยตรงกัน เช่น kW, kVA
const firstByUnit = (schema, unit) => allFields(schema).find(f => f.unit === unit)?.key

export default function Dashboard({ stations }) {
  const [eq, setEq] = useState(null)
  const [cats, setCats] = useState([])
  const [logs, setLogs] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('equipment').select('id, tag, name, status, specs, category_id, buildings(name, station_id)'),
      supabase.from('categories').select('id, name, icon, field_schema'),
      supabase.from('maintenance_logs').select('id, log_date, kind, title, equipment_id, equipment(tag, name)')
        .order('log_date', { ascending: false }).order('id', { ascending: false }).limit(6),
    ]).then(([a, b, c]) => { setEq(a.data || []); setCats(b.data || []); setLogs(c.data || []) })
  }, [])

  const d = useMemo(() => {
    if (!eq) return null
    const kwKey = {}, kvaKey = {}
    cats.forEach(c => { kwKey[c.id] = firstByUnit(c.field_schema, 'kW'); kvaKey[c.id] = firstByUnit(c.field_schema, 'kVA') })
    const blank = () => ({ n: 0, kw: 0, kva: 0, st: Object.fromEntries(STATUSES.map(s => [s, 0])) })
    const total = blank(), per = {}
    for (const e of eq) {
      const sid = e.buildings?.station_id
      const p = (per[sid] ||= blank())
      const active = e.status !== 'เลิกใช้'
      const kw = active && kwKey[e.category_id] ? Number(e.specs?.[kwKey[e.category_id]]) || 0 : 0
      const kva = active && kvaKey[e.category_id] ? Number(e.specs?.[kvaKey[e.category_id]]) || 0 : 0
      for (const t of [total, p]) { t.n++; t.kw += kw; t.kva += kva; t.st[e.status] = (t.st[e.status] || 0) + 1 }
    }
    const attention = eq.filter(e => e.status === 'ชำรุด' || e.status === 'ซ่อม')
    const byCat = cats.map(c => ({ ...c, n: eq.filter(e => e.category_id === c.id).length })).filter(c => c.n)
    return { total, per, attention, byCat }
  }, [eq, cats])

  if (!d) return <p className="muted">กำลังโหลดภาพรวม…</p>
  if (!d.total.n) return null

  return (
    <section className="dash">
      <div className="kpis">
        <div className="kpi"><div className="kpi-v">{fmt(d.total.n)}</div><div className="kpi-l">อุปกรณ์ทั้งหมด</div></div>
        <div className="kpi"><div className="kpi-v">{fmt(d.total.kw, 1)}<small> kW</small></div><div className="kpi-l">กำลังมอเตอร์รวม</div></div>
        {d.total.kva > 0 && <div className="kpi"><div className="kpi-v">{fmt(d.total.kva)}<small> kVA</small></div><div className="kpi-l">หม้อแปลงรวม</div></div>}
        <div className={`kpi ${d.attention.length ? 'warn' : ''}`}><div className="kpi-v">{d.attention.length}</div><div className="kpi-l">ชำรุด / ซ่อม</div></div>
      </div>

      <div className="status-chips">
        {STATUSES.map(s => d.total.st[s] > 0 && (
          <span key={s} className={`badge ${STATUS_CLS[s]}`}>{s} {d.total.st[s]}</span>
        ))}
        <span className="muted small">· {d.byCat.map(c => `${c.icon} ${c.name} ${c.n}`).join(' · ')}</span>
      </div>

      {stations.length > 1 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>สถานี</th><th className="num">อุปกรณ์</th><th style={{ width: '30%' }}>สถานะ</th><th className="num">kW</th><th className="num">kVA</th></tr></thead>
            <tbody>
              {stations.map(s => {
                const p = d.per[s.id]
                if (!p) return null
                return (
                  <tr key={s.id}>
                    <td><Link to={`/station/${s.id}`}>{s.name}</Link></td>
                    <td className="num">{p.n}</td>
                    <td>
                      <div className="stackbar" title={STATUSES.map(x => `${x} ${p.st[x]}`).join(' / ')}>
                        {STATUSES.map(x => p.st[x] > 0 && <span key={x} className={STATUS_CLS[x]} style={{ flex: p.st[x] }} />)}
                      </div>
                    </td>
                    <td className="num">{fmt(p.kw, 1)}</td>
                    <td className="num">{p.kva ? fmt(p.kva) : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="dash-cols">
        <div className="panel">
          <h3>⚠️ ต้องติดตาม</h3>
          {!d.attention.length && <p className="muted small">ไม่มีเครื่องชำรุด/ซ่อม 👍</p>}
          <ul className="dash-list">
            {d.attention.slice(0, 8).map(e => (
              <li key={e.id}>
                <Link to={`/equipment/${e.id}`}><b>{e.tag || '–'}</b> {e.name}</Link>
                <span className="muted small"> · {stations.find(s => s.id === e.buildings?.station_id)?.name} / {e.buildings?.name}</span>
                <StatusBadge status={e.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>🔧 ซ่อมบำรุงล่าสุด</h3>
          {!logs.length && <p className="muted small">ยังไม่มีบันทึก</p>}
          <ul className="dash-list">
            {logs.map(l => (
              <li key={l.id}>
                <span className="muted small nowrap">{new Date(l.log_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>{' '}
                <Link to={`/equipment/${l.equipment_id}`}><b>{l.equipment?.tag || l.equipment?.name}</b></Link> {l.title}
                <span className="kind">{l.kind}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
