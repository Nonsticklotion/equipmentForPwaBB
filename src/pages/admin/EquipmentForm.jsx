import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase, STATUSES } from '../../supabase'
import { allFields } from '../../lib/fields'
import { deleteAllPhotos } from '../../lib/photos'
import PhotoManager from '../../components/PhotoManager'

const blank = { building_id: '', category_id: '', tag: '', name: '', status: 'ใช้งาน', note: '', specs: {} }

export default function EquipmentForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [stations, setStations] = useState([])
  const [cats, setCats] = useState([])
  const [stationId, setStationId] = useState('')
  const [form, setForm] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([
        supabase.from('stations').select('id, name, buildings(id, name)').order('sort').order('name'),
        supabase.from('categories').select('*').order('sort'),
      ])
      setStations(s.data || []); setCats(c.data || [])

      let f = { ...blank }
      const copyFrom = params.get('copy')
      if (id || copyFrom) {
        const { data } = await supabase.from('equipment').select('*').eq('id', id || copyFrom).single()
        if (data) f = id ? data : { ...data, id: undefined, tag: '', name: data.name + ' (สำเนา)', specs: { ...data.specs } }
      } else {
        if (params.get('building')) f.building_id = Number(params.get('building'))
        if (c.data?.length === 1) f.category_id = c.data[0].id
      }
      const st = (s.data || []).find(x => x.buildings.some(b => b.id === f.building_id))
      setStationId(st ? String(st.id) : '')
      setForm(f)
    })()
  }, [id])

  if (!form) return <p className="muted">กำลังโหลด…</p>

  const cat = cats.find(c => c.id === Number(form.category_id))
  const buildings = stations.find(s => String(s.id) === stationId)?.buildings || []
  const set = patch => setForm({ ...form, ...patch })
  const setSpec = (k, v) => setForm({ ...form, specs: { ...form.specs, [k]: v } })

  async function save(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    // เก็บเฉพาะค่าที่อยู่ใน schema ของหมวด และไม่ว่าง; ตัวเลขแปลงเป็น number
    const specs = {}
    for (const f of allFields(cat?.field_schema)) {
      const v = form.specs[f.key]
      if (v === '' || v === undefined || v === null) continue
      specs[f.key] = f.type === 'number' ? Number(v) : v
    }
    const payload = {
      building_id: Number(form.building_id), category_id: Number(form.category_id),
      tag: form.tag?.trim() || null, name: form.name.trim(), status: form.status,
      note: form.note || null, specs,
    }
    const res = id
      ? await supabase.from('equipment').update(payload).eq('id', id).select('id').single()
      : await supabase.from('equipment').insert(payload).select('id').single()
    setBusy(false)
    if (res.error) return setErr(res.error.message)
    // เพิ่มใหม่ -> ไปหน้าแก้ไขเพื่ออัปรูปต่อ, แก้ไข -> ไปหน้ารายละเอียด
    nav(id ? `/equipment/${res.data.id}` : `/admin/equipment/${res.data.id}?new=1`)
  }

  async function del() {
    if (!confirm(`ลบ "${form.tag || form.name}" และรูปทั้งหมดถาวร?`)) return
    await deleteAllPhotos(id)
    const { error } = await supabase.from('equipment').delete().eq('id', id)
    if (error) return setErr(error.message)
    nav('/admin')
  }

  return (
    <>
      <p><Link to="/admin">‹ จัดการข้อมูล</Link></p>
      <div className="row-between">
        <h1>{id ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์'}</h1>
        {id && (
          <div className="actions">
            <Link className="btn ghost" to={`/admin/equipment/new?copy=${id}`}>คัดลอกเป็นรายการใหม่</Link>
            <button type="button" className="btn danger" onClick={del}>ลบ</button>
          </div>
        )}
      </div>

      {params.get('new') && (
        <p className="notice">บันทึกอุปกรณ์แล้ว — เพิ่มรูป Nameplate / รหัสเครื่อง ได้ด้านล่าง หรือ <Link to={`/equipment/${id}`}>ดูหน้ารายละเอียด</Link></p>
      )}
      {id && <PhotoManager equipmentId={Number(id)} />}
      {!id && <p className="muted small">💡 เพิ่มรูปได้หลังกดบันทึก</p>}

      <form onSubmit={save} className="form">
        <section className="panel">
          <h3>ข้อมูลหลัก</h3>
          <div className="form-grid">
            <label>สถานี *
              <select required value={stationId} onChange={e => { setStationId(e.target.value); set({ building_id: '' }) }}>
                <option value="">— เลือก —</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>อาคาร *
              <select required value={form.building_id} onChange={e => set({ building_id: e.target.value })} disabled={!stationId}>
                <option value="">— เลือก —</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label>หมวดอุปกรณ์ *
              <select required value={form.category_id} onChange={e => set({ category_id: e.target.value })}>
                <option value="">— เลือก —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </label>
            <label>สถานะ
              <select value={form.status} onChange={e => set({ status: e.target.value })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>รหัสอุปกรณ์<input value={form.tag || ''} onChange={e => set({ tag: e.target.value })} placeholder="เช่น HLP-01" /></label>
            <label>ชื่อ *<input required value={form.name} onChange={e => set({ name: e.target.value })} placeholder="เช่น เครื่องสูบน้ำแรงสูง ชุดที่ 1" /></label>
          </div>
        </section>

        {cat?.field_schema.map(g => (
          <section key={g.group} className="panel">
            <h3>{g.group}</h3>
            <div className="form-grid">
              {g.fields.map(f => (
                <label key={f.key} className={f.type === 'textarea' ? 'full' : ''}>
                  {f.label}{f.unit && <span className="muted"> ({f.unit})</span>}
                  <FieldInput f={f} value={form.specs?.[f.key] ?? ''} onChange={v => setSpec(f.key, v)} />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="panel">
          <label className="full">หมายเหตุ<textarea rows={3} value={form.note || ''} onChange={e => set({ note: e.target.value })} /></label>
        </section>

        {err && <p className="error">{err}</p>}
        <div className="actions sticky-actions">
          <button className="btn" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
          <button type="button" className="btn ghost" onClick={() => nav(-1)}>ยกเลิก</button>
        </div>
      </form>
    </>
  )
}

function FieldInput({ f, value, onChange }) {
  switch (f.type) {
    case 'number':
      return <input type="number" step="any" value={value} onChange={e => onChange(e.target.value)} />
    case 'date':
      return <input type="date" value={value} onChange={e => onChange(e.target.value)} />
    case 'textarea':
      return <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} />
    case 'select':
      return (
        <select value={value} onChange={e => onChange(e.target.value)}>
          <option value="">–</option>
          {(f.options || []).map(o => <option key={o}>{o}</option>)}
          {value && !(f.options || []).includes(value) && <option>{value}</option>}
        </select>
      )
    default:
      return <input value={value} onChange={e => onChange(e.target.value)} />
  }
}
