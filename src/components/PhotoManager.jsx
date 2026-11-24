import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { PHOTO_KINDS, photoUrl, uploadPhoto, deletePhoto } from '../lib/photos'

// สำหรับแอดมิน: อัป/ลบรูปของอุปกรณ์ แยกตามประเภท
export default function PhotoManager({ equipmentId }) {
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState('')     // kind ที่กำลังอัป
  const [err, setErr] = useState('')

  async function load() {
    const { data } = await supabase.from('equipment_photos')
      .select('*').eq('equipment_id', equipmentId).order('created_at')
    setPhotos(data || [])
  }
  useEffect(() => { load() }, [equipmentId])

  async function onFiles(kind, files) {
    if (!files?.length) return
    setBusy(kind); setErr('')
    try {
      for (const f of files) await uploadPhoto(equipmentId, kind, f)
    } catch (e) {
      setErr('อัปรูปไม่สำเร็จ: ' + (e.message || e))
    }
    setBusy('')
    load()
  }

  async function onDelete(p) {
    if (!confirm('ลบรูปนี้?')) return
    try { await deletePhoto(p); load() } catch (e) { setErr('ลบไม่สำเร็จ: ' + e.message) }
  }

  return (
    <section className="panel">
      <h3>รูปภาพ</h3>
      <p className="muted small">กด "เพิ่มรูป" แล้วถ่ายจากมือถือหรือเลือกไฟล์ได้ (เลือกหลายรูปพร้อมกันได้) — ระบบย่อขนาดให้อัตโนมัติ</p>
      <div className="pm-grid">
        {PHOTO_KINDS.map(k => {
          const list = photos.filter(p => p.kind === k.key)
          return (
            <div key={k.key} className="pm-col">
              <div className="row-between">
                <b>{k.icon} {k.label} <span className="count">{list.length}</span></b>
                <label className={`btn sm ${busy ? 'disabled' : ''}`}>
                  {busy === k.key ? 'กำลังอัป…' : '+ เพิ่มรูป'}
                  <input type="file" accept="image/*" multiple hidden disabled={!!busy}
                    onChange={e => { onFiles(k.key, [...e.target.files]); e.target.value = '' }} />
                </label>
              </div>
              <div className="thumbs">
                {list.map(p => (
                  <div key={p.id} className="thumb">
                    <a href={photoUrl(p.path)} target="_blank" rel="noreferrer"><img src={photoUrl(p.path)} alt="" loading="lazy" /></a>
                    <button type="button" className="thumb-del" onClick={() => onDelete(p)} title="ลบรูป">✕</button>
                  </div>
                ))}
                {!list.length && <span className="muted small">ยังไม่มีรูป</span>}
              </div>
            </div>
          )
        })}
      </div>
      {err && <p className="error">{err}</p>}
    </section>
  )
}
