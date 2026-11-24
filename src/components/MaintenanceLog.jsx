import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const KINDS = ['PM', 'ตรวจวัด', 'ซ่อม', 'Overhaul', 'พันขดลวด', 'เปลี่ยนอะไหล่', 'อื่นๆ']
const METRICS = [
  { key: 'ir_mohm', label: 'Insulation Resistance', unit: 'MΩ' },
  { key: 'current_a', label: 'กระแสขณะทำงาน', unit: 'A' },
  { key: 'vibration', label: 'Vibration', unit: 'mm/s' },
  { key: 'temp_c', label: 'อุณหภูมิ', unit: '°C' },
]
const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ log_date: today(), kind: 'PM', title: '', detail: '', ir_mohm: '', current_a: '', vibration: '', temp_c: '', performed_by: '', cost: '' })
const thDate = d => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
const num = v => (v === null || v === undefined || v === '' ? '–' : Number(v).toLocaleString('th-TH', { maximumFractionDigits: 2 }))

export default function MaintenanceLog({ equipmentId, editable }) {
  const isAdmin = editable
  const [logs, setLogs] = useState(null)
  const [form, setForm] = useState(null)      // null = ปิดฟอร์ม
  const [open, setOpen] = useState(null)      // id ที่ขยายรายละเอียด
  const [err, setErr] = useState('')

  async function load() {
    const { data, error } = await supabase.from('maintenance_logs').select('*')
      .eq('equipment_id', equipmentId).order('log_date', { ascending: false }).order('id', { ascending: false })
    if (error) setErr(error.message.includes('maintenance_logs') ? 'ยังไม่ได้รัน supabase/v2.sql' : error.message)
    setLogs(data || [])
  }
  useEffect(() => { load() }, [equipmentId])

  async function save(e) {
    e.preventDefault(); setErr('')
    const p = { ...form, equipment_id: equipmentId }
    ;['ir_mohm', 'current_a', 'vibration', 'temp_c', 'cost'].forEach(k => { p[k] = p[k] === '' ? null : Number(p[k]) })
    ;['detail', 'performed_by'].forEach(k => { p[k] = p[k] || null })
    const { id, created_at, created_by, ...payload } = p
    const res = id
      ? await supabase.from('maintenance_logs').update(payload).eq('id', id)
      : await supabase.from('maintenance_logs').insert(payload)
    if (res.error) return setErr(res.error.message)
    setForm(null); load()
  }

  async function del(l) {
    if (!confirm(`ลบบันทึก "${l.title}" (${thDate(l.log_date)})?`)) return
    const { error } = await supabase.from('maintenance_logs').delete().eq('id', l.id)
    if (error) return setErr(error.message)
    load()
  }

  const set = patch => setForm({ ...form, ...patch })
  const edit = l => setForm(Object.fromEntries(Object.entries(l).map(([k, v]) => [k, v ?? ''])))

  return (
    <section className="panel mlog">
      <div className="row-between">
        <h3>🔧 ประวัติซ่อมบำรุง {logs?.length ? <span className="count">{logs.length}</span> : null}</h3>
        {isAdmin && !form && <button className="btn sm no-print" onClick={() => setForm(blank())}>+ เพิ่มบันทึก</button>}
      </div>

      {form && (
        <form className="form mlog-form" onSubmit={save}>
          <div className="form-grid">
            <label>วันที่ *<input type="date" required value={form.log_date} onChange={e => set({ log_date: e.target.value })} /></label>
            <label>ประเภท
              <select value={form.kind} onChange={e => set({ kind: e.target.value })}>{KINDS.map(k => <option key={k}>{k}</option>)}</select>
            </label>
            <label className="full">รายการ *<input required value={form.title} onChange={e => set({ title: e.target.value })} placeholder="เช่น ตรวจวัด IR ประจำไตรมาส / เปลี่ยน Bearing DE" /></label>
            {METRICS.map(m => (
              <label key={m.key}>{m.label} <span className="muted">({m.unit})</span>
                <input type="number" step="any" value={form[m.key]} onChange={e => set({ [m.key]: e.target.value })} />
              </label>
            ))}
            <label>ผู้ปฏิบัติงาน / ผู้รับจ้าง<input value={form.performed_by} onChange={e => set({ performed_by: e.target.value })} /></label>
            <label>ค่าใช้จ่าย <span className="muted">(บาท)</span><input type="number" step="any" value={form.cost} onChange={e => set({ cost: e.target.value })} /></label>
            <label className="full">รายละเอียด<textarea rows={3} value={form.detail} onChange={e => set({ detail: e.target.value })} /></label>
          </div>
          <div className="actions">
            <button className="btn">{form.id ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>ยกเลิก</button>
          </div>
        </form>
      )}

      {err && <p className="error">{err}</p>}
      {logs && logs.length === 0 && !form && <p className="muted small">ยังไม่มีบันทึก</p>}

      {logs && logs.length > 0 && (
        <>
          <Trends logs={logs} />
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>วันที่</th><th>ประเภท</th><th>รายการ</th>
                  <th className="num">IR (MΩ)</th><th className="num">A</th><th className="num">mm/s</th><th className="num">°C</th>
                  <th>ผู้ทำ</th><th className="num">บาท</th>{isAdmin && <th className="no-print"></th>}</tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} onClick={() => setOpen(open === l.id ? null : l.id)} className={l.detail ? 'clickable' : ''}>
                    <td className="nowrap">{thDate(l.log_date)}</td>
                    <td><span className={`kind kind-${KINDS.indexOf(l.kind)}`}>{l.kind}</span></td>
                    <td>
                      {l.title}{l.detail && <span className="muted small"> {open === l.id ? '▴' : '▾'}</span>}
                      {open === l.id && l.detail && <div className="small pre muted">{l.detail}</div>}
                    </td>
                    <td className={`num ${l.ir_mohm !== null && l.ir_mohm < 1 ? 'bad-val' : ''}`}>{num(l.ir_mohm)}</td>
                    <td className="num">{num(l.current_a)}</td>
                    <td className="num">{num(l.vibration)}</td>
                    <td className="num">{num(l.temp_c)}</td>
                    <td>{l.performed_by || '–'}</td>
                    <td className="num">{num(l.cost)}</td>
                    {isAdmin && (
                      <td className="nowrap no-print" onClick={e => e.stopPropagation()}>
                        <button className="link" onClick={() => edit(l)}>แก้ไข</button>
                        <button className="link danger" onClick={() => del(l)}>ลบ</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">IR ต่ำกว่า 1 MΩ แสดงเป็นสีแดง</p>
        </>
      )}
    </section>
  )
}

// กราฟแนวโน้มของค่าที่วัด (แสดงเมื่อมี ≥ 2 ค่า)
function Trends({ logs }) {
  const charts = METRICS.map(m => ({
    ...m,
    pts: logs.filter(l => l[m.key] !== null && l[m.key] !== undefined)
      .map(l => ({ d: l.log_date, v: Number(l[m.key]) }))
      .sort((a, b) => a.d.localeCompare(b.d)),
  })).filter(c => c.pts.length >= 2)

  if (!charts.length) return null
  return (
    <div className="trends">
      {charts.map(c => <Spark key={c.key} {...c} />)}
    </div>
  )
}

function Spark({ label, unit, pts }) {
  const W = 260, H = 70, P = 6
  const t0 = new Date(pts[0].d).getTime(), t1 = new Date(pts.at(-1).d).getTime()
  const vs = pts.map(p => p.v)
  const lo = Math.min(...vs), hi = Math.max(...vs)
  const x = d => P + (t1 === t0 ? 0.5 : (new Date(d).getTime() - t0) / (t1 - t0)) * (W - 2 * P)
  const y = v => H - P - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 2 * P)
  const line = pts.map(p => `${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const last = pts.at(-1), prev = pts.at(-2)
  const diff = last.v - prev.v
  return (
    <div className="spark">
      <div className="spark-head">
        <span>{label}</span>
        <b>{num(last.v)} <span className="unit">{unit}</span></b>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label={`${label} trend`}>
        <polyline points={line} fill="none" stroke="var(--brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => <circle key={i} cx={x(p.d)} cy={y(p.v)} r="2.5" fill="var(--brand)" />)}
      </svg>
      <div className="spark-foot small muted">
        <span>{thDate(pts[0].d)}</span>
        <span>{diff === 0 ? 'เท่าเดิม' : `${diff > 0 ? '▲' : '▼'} ${num(Math.abs(diff))}`} · ต่ำสุด {num(lo)} · สูงสุด {num(hi)}</span>
        <span>{thDate(last.d)}</span>
      </div>
    </div>
  )
}
