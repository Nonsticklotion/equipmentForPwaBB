import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { fetchForExport } from '../lib/exporter'
import { listFields, fmt, label } from '../lib/fields'
import { photoUrl } from '../lib/photos'

// หน้ารายงานสำหรับพิมพ์ / บันทึกเป็น PDF (A4 แนวนอน)
export default function Report() {
  const [params] = useSearchParams()
  const filter = { station: params.get('station'), building: params.get('building'), cat: params.get('cat') }
  const [data, setData] = useState(null)
  const [photos, setPhotos] = useState({})
  const [withPhotos, setWithPhotos] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchForExport(filter).then(setData).catch(e => setErr(e.message))
  }, [params.toString()])

  useEffect(() => {
    if (!withPhotos || !data?.rows.length) return
    supabase.from('equipment_photos').select('equipment_id, kind, path')
      .in('equipment_id', data.rows.map(r => r.id)).in('kind', ['nameplate', 'tag']).order('created_at')
      .then(({ data: ps }) => {
        const m = {}
        ;(ps || []).forEach(p => { (m[p.equipment_id] ||= []).push(p) })
        setPhotos(m)
      })
  }, [withPhotos, data])

  // จัดกลุ่ม สถานี > อาคาร > หมวด
  const groups = useMemo(() => {
    if (!data) return []
    const out = []
    for (const r of data.rows) {
      const st = r.buildings.stations, b = r.buildings
      let g = out.find(x => x.st.id === st.id)
      if (!g) out.push(g = { st, buildings: [] })
      let bg = g.buildings.find(x => x.b.id === b.id)
      if (!bg) g.buildings.push(bg = { b, cats: [] })
      let cg = bg.cats.find(x => x.cat.id === r.category_id)
      if (!cg) bg.cats.push(cg = { cat: data.cats.find(c => c.id === r.category_id), items: [] })
      cg.items.push(r)
    }
    return out
  }, [data])

  if (err) return <p className="error">{err}</p>
  if (!data) return <p className="muted">กำลังโหลด…</p>

  const title = filter.building ? `${data.rows[0]?.buildings.stations.name || ''} — ${data.rows[0]?.buildings.name || ''}`
    : filter.station ? data.rows[0]?.buildings.stations.name : 'อุปกรณ์ทุกสถานี'

  return (
    <div className="report">
      <div className="report-toolbar no-print">
        <button className="btn" onClick={() => window.print()}>🖨️ พิมพ์ / บันทึก PDF</button>
        <label className="toggle small"><input type="checkbox" checked={withPhotos} onChange={e => setWithPhotos(e.target.checked)} /> แนบรูป Nameplate / รหัสเครื่อง</label>
        <button className="link small" onClick={() => window.history.back()}>‹ กลับ</button>
        <span className="muted small">ในหน้าพิมพ์เลือก "บันทึกเป็น PDF" · แนวนอน (Landscape)</span>
      </div>

      <header className="report-head">
        <div>
          <h1>ทะเบียนอุปกรณ์: {title || '-'}</h1>
          <div className="muted small">จำนวน {data.rows.length} รายการ · ออกรายงาน {new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}</div>
        </div>
      </header>

      {!data.rows.length && <p className="muted">ไม่มีอุปกรณ์</p>}

      {groups.map(g => (
        <section key={g.st.id} className="report-station">
          {!filter.station && !filter.building && <h2>🏭 {g.st.name}</h2>}
          {g.buildings.map(bg => (
            <div key={bg.b.id} className="report-building">
              <h3>🏢 {bg.b.name}</h3>
              {bg.cats.map(cg => {
                const cols = listFields(cg.cat?.field_schema)
                return (
                  <div key={cg.cat?.id} className="report-cat">
                    <h4>{cg.cat?.icon} {cg.cat?.name} <span className="muted">({cg.items.length})</span></h4>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th><th>รหัส</th><th>ชื่อ</th>
                          {cols.map(f => <th key={f.key} className={f.type === 'number' ? 'num' : ''}>{label(f)}</th>)}
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cg.items.map((r, i) => (
                          <tr key={r.id}>
                            <td>{i + 1}</td>
                            <td><b>{r.tag || '–'}</b></td>
                            <td>
                              {r.name}
                              {withPhotos && photos[r.id] && (
                                <div className="report-photos">
                                  {photos[r.id].map(p => <img key={p.path} src={photoUrl(p.path)} alt="" />)}
                                </div>
                              )}
                            </td>
                            {cols.map(f => <td key={f.key} className={f.type === 'number' ? 'num' : ''}>{fmt(f, r.specs?.[f.key])}</td>)}
                            <td>{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
