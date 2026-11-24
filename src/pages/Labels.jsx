import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { fetchForExport } from '../lib/exporter'
import { equipmentUrl, qrDataUrl, isLocalBase } from '../lib/qr'

const SIZES = {
  s: { label: 'เล็ก (4×4 ซม.)', cls: 'lbl-s' },
  m: { label: 'กลาง (6×4 ซม.)', cls: 'lbl-m' },
  l: { label: 'ใหญ่ (9×5 ซม.)', cls: 'lbl-l' },
}

// หน้าพิมพ์สติกเกอร์ QR: ?station= | ?building= | ?ids=1,2,3
export default function Labels() {
  const [params] = useSearchParams()
  const [items, setItems] = useState(null)
  const [qrs, setQrs] = useState({})
  const [size, setSize] = useState('m')
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        let rows
        const ids = params.get('ids')
        if (ids) {
          const { data, error } = await supabase.from('equipment')
            .select('id, tag, name, buildings(name, stations(name))').in('id', ids.split(',').map(Number))
          if (error) throw error
          rows = data
        } else {
          rows = (await fetchForExport({ station: params.get('station'), building: params.get('building'), cat: params.get('cat') })).rows
        }
        setItems(rows)
        const m = {}
        await Promise.all(rows.map(async r => { m[r.id] = await qrDataUrl(equipmentUrl(r.id), 300) }))
        setQrs(m)
      } catch (e) { setErr(e.message) }
    })()
  }, [params.toString()])

  if (err) return <p className="error">{err}</p>
  if (!items) return <p className="muted">กำลังโหลด…</p>

  return (
    <div>
      <div className="report-toolbar no-print">
        <button className="btn" onClick={() => window.print()}>🖨️ พิมพ์สติกเกอร์</button>
        <label className="small">ขนาด&nbsp;
          <select value={size} onChange={e => setSize(e.target.value)} style={{ width: 'auto' }}>
            {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <button className="link small" onClick={() => window.history.back()}>‹ กลับ</button>
        <span className="muted small">{items.length} ป้าย · พิมพ์แบบ A4 แนวตั้ง, Scale 100% · แนะนำกระดาษสติกเกอร์กันน้ำ</span>
      </div>

      {isLocalBase && (
        <p className="notice no-print">⚠️ ตอนนี้เปิดจากเครื่องตัวเอง (localhost) — QR จะสแกนจากมือถือไม่ได้ ให้พิมพ์จากเว็บจริง (workers.dev) หรือตั้ง VITE_PUBLIC_URL ใน .env</p>
      )}
      {!items.length && <p className="muted">ไม่มีอุปกรณ์</p>}

      <div className={`labels ${SIZES[size].cls}`}>
        {items.map(r => (
          <div key={r.id} className="label">
            {qrs[r.id] ? <img src={qrs[r.id]} alt="QR" /> : <div className="qr-ph" />}
            <div className="label-text">
              <div className="label-tag">{r.tag || '—'}</div>
              <div className="label-name">{r.name}</div>
              <div className="label-loc">{r.buildings?.stations?.name} · {r.buildings?.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
