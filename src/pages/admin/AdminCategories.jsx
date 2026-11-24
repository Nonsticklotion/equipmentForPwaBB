import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase'

const TYPES = [
  ['text', 'ข้อความ'], ['number', 'ตัวเลข'], ['date', 'วันที่'], ['select', 'ตัวเลือก'], ['textarea', 'ข้อความยาว'],
]

export default function AdminCategories() {
  const [cats, setCats] = useState([])
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')

  async function load() {
    const { data } = await supabase.from('categories').select('*, equipment(count)').order('sort')
    setCats(data || [])
  }
  useEffect(() => { load() }, [])

  function open(c) {
    setErr(''); setJsonMode(false)
    setEdit(c ? structuredClone({ id: c.id, name: c.name, icon: c.icon, sort: c.sort, field_schema: c.field_schema })
              : { name: '', icon: '⚙️', sort: cats.length + 1, field_schema: [{ group: 'ข้อมูลทั่วไป', fields: [] }] })
  }

  const setSchema = fs => setEdit({ ...edit, field_schema: fs })
  const updGroup = (gi, patch) => setSchema(edit.field_schema.map((g, i) => i === gi ? { ...g, ...patch } : g))
  const updField = (gi, fi, patch) => updGroup(gi, { fields: edit.field_schema[gi].fields.map((f, i) => i === fi ? { ...f, ...patch } : f) })
  const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a }

  function validate(schema) {
    const keys = new Set()
    for (const g of schema) {
      if (!g.group?.trim()) return 'ทุกกลุ่มต้องมีชื่อ'
      for (const f of g.fields) {
        if (!f.key || !/^[a-z0-9_]+$/.test(f.key)) return `key "${f.key}" ต้องเป็น a-z, 0-9, _ เท่านั้น`
        if (keys.has(f.key)) return `key "${f.key}" ซ้ำ`
        if (!f.label?.trim()) return `ฟิลด์ ${f.key} ไม่มีชื่อ`
        keys.add(f.key)
      }
    }
    return ''
  }

  async function save() {
    let schema = edit.field_schema
    if (jsonMode) {
      try { schema = JSON.parse(jsonText) } catch { return setErr('JSON ไม่ถูกต้อง') }
    }
    schema = schema.map(g => ({
      ...g,
      fields: g.fields.map(f => {
        const o = { ...f }
        if (f.type !== 'select') delete o.options
        if (!o.unit) delete o.unit
        if (!o.list) delete o.list
        return o
      }),
    }))
    const v = validate(schema); if (v) return setErr(v)
    const payload = { name: edit.name, icon: edit.icon, sort: Number(edit.sort) || 0, field_schema: schema }
    const { error } = edit.id
      ? await supabase.from('categories').update(payload).eq('id', edit.id)
      : await supabase.from('categories').insert(payload)
    if (error) return setErr(error.message)
    setEdit(null); load()
  }

  async function del(c) {
    if (c.equipment?.[0]?.count) return alert('หมวดนี้ยังมีอุปกรณ์อยู่ ลบไม่ได้')
    if (!confirm(`ลบหมวด "${c.name}"?`)) return
    await supabase.from('categories').delete().eq('id', c.id); load()
  }

  if (edit) return (
    <>
      <p><button className="link" onClick={() => setEdit(null)}>‹ กลับรายการหมวด</button></p>
      <h1>{edit.id ? `แก้ไขหมวด: ${edit.name}` : 'หมวดใหม่'}</h1>
      <div className="form panel">
        <div className="form-grid">
          <label>ชื่อหมวด *<input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
          <label>ไอคอน (emoji)<input value={edit.icon} onChange={e => setEdit({ ...edit, icon: e.target.value })} /></label>
          <label>ลำดับ<input type="number" value={edit.sort} onChange={e => setEdit({ ...edit, sort: e.target.value })} /></label>
        </div>
      </div>

      <div className="row-between">
        <h2>ช่องข้อมูล</h2>
        <label className="small toggle">
          <input type="checkbox" checked={jsonMode} onChange={e => {
            if (e.target.checked) setJsonText(JSON.stringify(edit.field_schema, null, 2))
            else { try { setSchema(JSON.parse(jsonText)) } catch { return setErr('JSON ไม่ถูกต้อง') } }
            setJsonMode(e.target.checked)
          }} /> แก้แบบ JSON
        </label>
      </div>
      <p className="muted small">
        ติ๊ก “แสดงในตาราง” เพื่อให้ฟิลด์นั้นเป็นคอลัมน์ในหน้ารายการอุปกรณ์ · แก้ <b>key</b> ของฟิลด์ที่มีข้อมูลแล้ว ข้อมูลเดิมจะไม่แสดง
      </p>

      {jsonMode ? (
        <textarea className="json" value={jsonText} onChange={e => setJsonText(e.target.value)} rows={24} />
      ) : (
        <>
          {edit.field_schema.map((g, gi) => (
            <section key={gi} className="panel">
              <div className="row-between">
                <input className="group-name" value={g.group} onChange={e => updGroup(gi, { group: e.target.value })} placeholder="ชื่อกลุ่ม" />
                <div className="actions">
                  <button className="btn ghost sm" onClick={() => setSchema(move(edit.field_schema, gi, -1))}>↑</button>
                  <button className="btn ghost sm" onClick={() => setSchema(move(edit.field_schema, gi, 1))}>↓</button>
                  <button className="btn danger sm" onClick={() => confirm('ลบกลุ่มนี้?') && setSchema(edit.field_schema.filter((_, i) => i !== gi))}>ลบกลุ่ม</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="field-table">
                  <thead><tr><th>ชื่อที่แสดง</th><th>key</th><th>ชนิด</th><th>หน่วย</th><th>ตัวเลือก (คั่นด้วย ,)</th><th>แสดงในตาราง</th><th></th></tr></thead>
                  <tbody>
                    {g.fields.map((f, fi) => (
                      <tr key={fi}>
                        <td><input value={f.label} onChange={e => updField(gi, fi, { label: e.target.value })} /></td>
                        <td><input value={f.key} onChange={e => updField(gi, fi, { key: e.target.value.toLowerCase() })} className="mono" /></td>
                        <td>
                          <select value={f.type} onChange={e => updField(gi, fi, { type: e.target.value })}>
                            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </td>
                        <td><input value={f.unit || ''} onChange={e => updField(gi, fi, { unit: e.target.value })} className="w-sm" /></td>
                        <td>
                          {f.type === 'select'
                            ? <input value={(f.options || []).join(', ')} onChange={e => updField(gi, fi, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                            : <span className="muted">–</span>}
                        </td>
                        <td className="center"><input type="checkbox" checked={!!f.list} onChange={e => updField(gi, fi, { list: e.target.checked })} /></td>
                        <td className="nowrap">
                          <button className="link" onClick={() => updGroup(gi, { fields: move(g.fields, fi, -1) })}>↑</button>
                          <button className="link" onClick={() => updGroup(gi, { fields: move(g.fields, fi, 1) })}>↓</button>
                          <button className="link danger" onClick={() => updGroup(gi, { fields: g.fields.filter((_, i) => i !== fi) })}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn ghost sm" onClick={() => updGroup(gi, { fields: [...g.fields, { key: `f_${Date.now().toString(36)}`, label: '', type: 'text' }] })}>+ เพิ่มช่อง</button>
            </section>
          ))}
          <button className="btn ghost" onClick={() => setSchema([...edit.field_schema, { group: 'กลุ่มใหม่', fields: [] }])}>+ เพิ่มกลุ่ม</button>
        </>
      )}

      {err && <p className="error">{err}</p>}
      <div className="actions sticky-actions">
        <button className="btn" onClick={save}>บันทึกหมวด</button>
        <button className="btn ghost" onClick={() => setEdit(null)}>ยกเลิก</button>
      </div>
    </>
  )

  return (
    <>
      <p><Link to="/admin">‹ จัดการข้อมูล</Link></p>
      <div className="row-between">
        <h1>หมวดอุปกรณ์</h1>
        <button className="btn" onClick={() => open(null)}>+ เพิ่มหมวด</button>
      </div>
      <p className="muted">แต่ละหมวดกำหนดช่องข้อมูลเองได้ — เพิ่มอุปกรณ์ชนิดใหม่ (เช่น ตู้ MDB, เครื่องกำเนิดไฟฟ้า, Flow meter) ได้ทันทีโดยไม่ต้องแก้โค้ด</p>
      <div className="grid">
        {cats.map(c => (
          <div key={c.id} className="card static">
            <div className="card-title">{c.icon} {c.name}</div>
            <div className="small muted">
              {c.field_schema.length} กลุ่ม · {c.field_schema.reduce((a, g) => a + g.fields.length, 0)} ช่อง · {c.equipment?.[0]?.count || 0} อุปกรณ์
            </div>
            <div className="actions">
              <button className="btn ghost sm" onClick={() => open(c)}>แก้ไขช่องข้อมูล</button>
              <button className="btn danger sm" onClick={() => del(c)}>ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
