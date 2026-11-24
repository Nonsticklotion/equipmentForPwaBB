import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipmentUrl, qrDataUrl } from '../lib/qr'

// QR ของอุปกรณ์ในหน้ารายละเอียด
export default function QrCard({ id, tag }) {
  const [src, setSrc] = useState('')
  const url = equipmentUrl(id)
  useEffect(() => { qrDataUrl(url, 240).then(setSrc) }, [url])

  async function copy() {
    try { await navigator.clipboard.writeText(url); alert('คัดลอกลิงก์แล้ว') } catch { prompt('คัดลอกลิงก์', url) }
  }

  return (
    <section className="qr-card">
      {src && <img src={src} alt="QR code" />}
      <div>
        <h3>🏷️ QR Code</h3>
        <p className="muted small">สแกนเพื่อเปิดหน้านี้ — พิมพ์ติดที่ตัวเครื่องหรือหน้าตู้</p>
        <div className="actions no-print">
          <Link className="btn sm" to={`/labels?ids=${id}`}>พิมพ์สติกเกอร์</Link>
          {src && <a className="btn ghost sm" href={src} download={`QR_${tag || id}.png`}>ดาวน์โหลด PNG</a>}
          <button className="btn ghost sm" onClick={copy}>คัดลอกลิงก์</button>
        </div>
      </div>
    </section>
  )
}
