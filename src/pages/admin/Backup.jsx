import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase'

// ลำดับสำคัญ: ตารางแม่ก่อนตารางลูก (ตาม foreign key)
const TABLES = [
  { name: 'categories', label: 'หมวดอุปกรณ์' },
  { name: 'stations', label: 'สถานี' },
  { name: 'buildings', label: 'อาคาร' },
  { name: 'equipment', label: 'อุปกรณ์', omit: ['search_text'] },  // generated column
  { name: 'equipment_photos', label: 'รูป (รายการ)' },
  { name: 'maintenance_logs', label: 'ประวัติซ่อมบำรุง' },
]

async function fetchAll(table) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').order('id').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

export default function Backup() {
  const [busy, setBusy] = useState('')
  const [log, setLog] = useState([])
  const [pending, setPending] = useState(null)   // backup ที่อ่านจากไฟล์ รอยืนยัน
  const add = s => setLog(l => [...l, s])

  async function download() {
    setBusy('download'); setLog([])
    try {
      const data = {}
      for (const t of TABLES) {
        data[t.name] = await fetchAll(t.name)
        add(`✓ ${t.label}: ${data[t.name].length} แถว`)
      }
      const backup = { app: 'equipment-web', version: 2, exported_at: new Date().toISOString(), data }
      const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' })
      const a = document.createElement('a')
      const d = new Date()
      a.href = URL.createObjectURL(blob)
      a.download = `backup_equipment_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      add('✅ ดาวน์โหลดไฟล์ Backup แล้ว')
    } catch (e) { add('❌ ' + e.message) }
    setBusy('')
  }

  async function readFile(file) {
    setLog([]); setPending(null)
    try {
      const b = JSON.parse(await file.text())
      if (b.app !== 'equipment-web' || !b.data) throw new Error('ไฟล์นี้ไม่ใช่ Backup ของระบบนี้')
      setPending({ file: file.name, ...b })
    } catch (e) { add('❌ อ่านไฟล์ไม่ได้: ' + e.message) }
  }

  async function restore() {
    if (!confirm('กู้คืนข้อมูลจากไฟล์นี้?\n\nรายการที่ id ตรงกันจะถูกเขียนทับด้วยค่าในไฟล์\nรายการที่เพิ่มหลังวันที่ Backup จะยังอยู่ (ไม่ถูกลบ)')) return
    setBusy('restore'); setLog([])
    try {
      for (const t of TABLES) {
        const rows = (pending.data[t.name] || []).map(r => {
          const o = { ...r }
          ;(t.omit || []).forEach(k => delete o[k])
          return o
        })
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase.from(t.name).upsert(rows.slice(i, i + 500), { onConflict: 'id' })
          if (error) throw new Error(`${t.label}: ${error.message}`)
        }
        add(`✓ ${t.label}: ${rows.length} แถว`)
      }
      const { error } = await supabase.rpc('reset_sequences')
      if (error) throw new Error('reset_sequences: ' + error.message)
      add('✅ กู้คืนเสร็จ')
      setPending(null)
    } catch (e) {
      add('❌ ' + e.message)
      add('ถ้า error เรื่อง "generated always" หรือ "reset_sequences" ให้รัน supabase/v2.sql ก่อน')
    }
    setBusy('')
  }

  return (
    <>
      <p><Link to="/admin">‹ จัดการข้อมูล</Link></p>
      <h1>💾 Backup / กู้คืนข้อมูล</h1>

      <section className="panel">
        <h3>ดาวน์โหลด Backup</h3>
        <p className="muted small">
          เก็บข้อมูลทั้งหมด (สถานี อาคาร หมวด อุปกรณ์ รายการรูป ประวัติซ่อมบำรุง) เป็นไฟล์ JSON ไฟล์เดียว
          แนะนำทำทุกเดือน หรือก่อนแก้ข้อมูลจำนวนมาก แล้วเก็บไว้ใน Google Drive / OneDrive
        </p>
        <p className="muted small">⚠️ ไฟล์รูปไม่ได้อยู่ใน Backup (มีแค่รายการ) — รูปยังอยู่ใน Supabase Storage</p>
        <button className="btn" onClick={download} disabled={!!busy}>{busy === 'download' ? 'กำลังดึงข้อมูล…' : '⬇️ ดาวน์โหลด Backup'}</button>
      </section>

      <section className="panel">
        <h3>กู้คืนจากไฟล์</h3>
        <label className="btn ghost">
          📂 เลือกไฟล์ Backup (.json)
          <input type="file" accept=".json,application/json" hidden disabled={!!busy}
            onChange={e => { e.target.files[0] && readFile(e.target.files[0]); e.target.value = '' }} />
        </label>
        {pending && (
          <div className="notice" style={{ marginTop: '1rem' }}>
            <div><b>{pending.file}</b> · สร้างเมื่อ {new Date(pending.exported_at).toLocaleString('th-TH')}</div>
            <ul className="small">
              {TABLES.map(t => <li key={t.name}>{t.label}: {pending.data[t.name]?.length ?? 0} แถว</li>)}
            </ul>
            <button className="btn danger" onClick={restore} disabled={!!busy}>{busy === 'restore' ? 'กำลังกู้คืน…' : 'ยืนยันกู้คืน'}</button>
          </div>
        )}
      </section>

      {log.length > 0 && <pre className="panel small">{log.join('\n')}</pre>}
    </>
  )
}
