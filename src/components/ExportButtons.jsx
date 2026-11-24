import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchForExport, exportExcel } from '../lib/exporter'

// ปุ่ม Excel + PDF ใช้ได้ทุกหน้า: ส่ง filter = { station?, building?, cat? } และชื่อไฟล์
export default function ExportButtons({ filter = {}, filename = 'equipment' }) {
  const [busy, setBusy] = useState(false)

  async function onExcel() {
    setBusy(true)
    try {
      const data = await fetchForExport(filter)
      if (!data.rows.length) return alert('ไม่มีอุปกรณ์ให้ export')
      await exportExcel(data, filename)
    } catch (e) {
      alert('Export ไม่สำเร็จ: ' + (e.message || e))
    } finally { setBusy(false) }
  }

  const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString()

  return (
    <span className="actions no-print">
      <button className="btn ghost sm" onClick={onExcel} disabled={busy}>{busy ? 'กำลังสร้าง…' : '📊 Excel'}</button>
      <Link className="btn ghost sm" to={`/report${qs ? '?' + qs : ''}`}>📄 PDF / พิมพ์</Link>
    </span>
  )
}
