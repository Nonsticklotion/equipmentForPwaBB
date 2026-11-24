import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../auth'

const emptySt = { code: '', name: '', location: '', note: '', sort: 0 }

export default function AdminStations() {
  const { isAdmin, canEdit } = useAuth()
  const [stations, setStations] = useState([])
  const [edit, setEdit] = useState(null)       // station being edited/added
  const [err, setErr] = useState('')

  async function load() {
    const { data, error } = await supabase.from('stations')
      .select('*, buildings(*, equipment(count))').order('sort').order('name')
    if (error) setErr(error.message)
    setStations((data || []).filter(s => canEdit(s.id)))
  }
  useEffect(() => { load() }, [])

  async function saveStation(e) {
    e.preventDefault()
    const { id, buildings, ...payload } = edit
    payload.sort = Number(payload.sort) || 0
    const { error } = id
      ? await supabase.from('stations').update(payload).eq('id', id)
      : await supabase.from('stations').insert(payload)
    if (error) return setErr(error.message)
    setEdit(null); setErr(''); load()
  }

  async function delStation(s) {
    if (!confirm(`ลบสถานี "${s.name}" และอาคารทั้งหมดในสถานีนี้?\n(ลบไม่ได้ถ้ายังมีอุปกรณ์อยู่)`)) return
    const { error } = await supabase.from('stations').delete().eq('id', s.id)
    if (error) return setErr('ลบไม่สำเร็จ: ' + error.message)
    load()
  }

  async function addBuilding(stationId, name) {
    if (!name.trim()) return
    const { error } = await supabase.from('buildings').insert({ station_id: stationId, name: name.trim() })
    if (error) return setErr(error.message)
    load()
  }

  async function renameBuilding(b) {
    const name = prompt('ชื่ออาคาร', b.name)
    if (name === null) return
    const note = prompt('หมายเหตุ (ถ้ามี)', b.note || '')
    const { error } = await supabase.from('buildings').update({ name: name.trim() || b.name, note }).eq('id', b.id)
    if (error) return setErr(error.message)
    load()
  }

  async function delBuilding(b) {
    if (b.equipment?.[0]?.count) return alert('ย้ายหรือลบอุปกรณ์ในอาคารนี้ก่อน')
    if (!confirm(`ลบอาคาร "${b.name}"?`)) return
    const { error } = await supabase.from('buildings').delete().eq('id', b.id)
    if (error) return setErr(error.message)
    load()
  }

  return (
    <>
      <p><Link to="/admin">‹ จัดการข้อมูล</Link></p>
      <div className="row-between">
        <h1>สถานี / อาคาร</h1>
        {isAdmin && <button className="btn" onClick={() => setEdit({ ...emptySt })}>+ เพิ่มสถานี</button>}
      </div>
      {err && <p className="error">{err}</p>}

      {edit && (
        <form className="form panel" onSubmit={saveStation}>
          <h3>{edit.id ? 'แก้ไขสถานี' : 'สถานีใหม่'}</h3>
          <div className="form-grid">
            <label>ชื่อสถานี *<input required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
            <label>รหัส<input value={edit.code || ''} onChange={e => setEdit({ ...edit, code: e.target.value })} /></label>
            <label>ที่ตั้ง<input value={edit.location || ''} onChange={e => setEdit({ ...edit, location: e.target.value })} /></label>
            <label>ลำดับ<input type="number" value={edit.sort} onChange={e => setEdit({ ...edit, sort: e.target.value })} /></label>
            <label className="full">หมายเหตุ<input value={edit.note || ''} onChange={e => setEdit({ ...edit, note: e.target.value })} /></label>
          </div>
          <div className="actions">
            <button className="btn">บันทึก</button>
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>ยกเลิก</button>
          </div>
        </form>
      )}

      {stations.map(s => (
        <section key={s.id} className="panel">
          <div className="row-between">
            <h3>{s.name} {s.code && <span className="muted small">({s.code})</span>}</h3>
            <div className="actions">
              {isAdmin && <button className="btn ghost sm" onClick={() => setEdit(s)}>แก้ไข</button>}
              {isAdmin && <button className="btn danger sm" onClick={() => delStation(s)}>ลบ</button>}
            </div>
          </div>
          <ul className="blist">
            {[...s.buildings].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'th')).map(b => (
              <li key={b.id}>
                <span>🏢 {b.name} <span className="muted small">· {b.equipment?.[0]?.count || 0} อุปกรณ์{b.note ? ' · ' + b.note : ''}</span></span>
                <span className="actions">
                  <button className="link" onClick={() => renameBuilding(b)}>แก้ไข</button>
                  <button className="link danger" onClick={() => delBuilding(b)}>ลบ</button>
                </span>
              </li>
            ))}
          </ul>
          <AddBuilding onAdd={name => addBuilding(s.id, name)} />
        </section>
      ))}
    </>
  )
}

function AddBuilding({ onAdd }) {
  const [name, setName] = useState('')
  return (
    <form className="inline-add" onSubmit={e => { e.preventDefault(); onAdd(name); setName('') }}>
      <input placeholder="ชื่ออาคารใหม่ เช่น อาคารสูบน้ำแรงสูง" value={name} onChange={e => setName(e.target.value)} />
      <button className="btn sm">+ เพิ่มอาคาร</button>
    </form>
  )
}
