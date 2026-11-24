import { useEffect } from 'react'
import { PHOTO_KINDS } from '../lib/photos'

// เลือกรูปไว้ก่อน (ยังไม่อัป) ใช้ในฟอร์มเพิ่มอุปกรณ์ใหม่
// value: [{ kind, file, url }]
export default function PendingPhotos({ value, onChange, disabled }) {
  // คืนหน่วยความจำของ preview เมื่อออกจากหน้า
  useEffect(() => () => value.forEach(p => URL.revokeObjectURL(p.url)), [])

  const add = (kind, files) =>
    onChange([...value, ...files.filter(f => f.type.startsWith('image/')).map(file => ({ kind, file, url: URL.createObjectURL(file) }))])
  const remove = p => { URL.revokeObjectURL(p.url); onChange(value.filter(x => x !== p)) }

  return (
    <section className="panel">
      <h3>รูปภาพ</h3>
      <p className="muted small">เลือกรูปไว้ได้เลย ระบบจะอัปให้ตอนกด "บันทึก" — ถ่ายจากมือถือได้ เลือกหลายรูปพร้อมกันได้</p>
      <div className="pm-grid">
        {PHOTO_KINDS.map(k => {
          const list = value.filter(p => p.kind === k.key)
          return (
            <div key={k.key} className="pm-col">
              <div className="row-between">
                <b>{k.icon} {k.label} <span className="count">{list.length}</span></b>
                <label className={`btn sm ${disabled ? 'disabled' : ''}`}>
                  + เพิ่มรูป
                  <input type="file" accept="image/*" multiple hidden disabled={disabled}
                    onChange={e => { add(k.key, [...e.target.files]); e.target.value = '' }} />
                </label>
              </div>
              <div className="thumbs">
                {list.map(p => (
                  <div key={p.url} className="thumb">
                    <img src={p.url} alt="" />
                    {!disabled && <button type="button" className="thumb-del" onClick={() => remove(p)} title="เอาออก">✕</button>}
                  </div>
                ))}
                {!list.length && <span className="muted small">ยังไม่มีรูป</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
