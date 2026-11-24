import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Crumbs from '../components/Crumbs'
import ExportButtons from '../components/ExportButtons'

export default function Station() {
  const { id } = useParams()
  const [st, setSt] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('stations')
      .select('*, buildings(id, name, note, sort, equipment(category_id, categories(name, icon)))')
      .eq('id', id).single()
      .then(({ data, error }) => { if (error) setErr(error.message); setSt(data) })
  }, [id])

  if (err) return <p className="error">{err}</p>
  if (!st) return <p className="muted">กำลังโหลด…</p>

  const buildings = [...st.buildings].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'th'))

  return (
    <>
      <Crumbs items={[{ label: st.name }]} />
      <div className="row-between">
        <h1>{st.name}</h1>
        <ExportButtons filter={{ station: st.id }} filename={st.name} />
      </div>
      {(st.location || st.note) && <p className="muted">{[st.location, st.note].filter(Boolean).join(' · ')}</p>}
      <h2>อาคาร</h2>
      {buildings.length === 0 && <p className="muted">ยังไม่มีอาคาร</p>}
      <div className="grid">
        {buildings.map(b => {
          const byCat = {}
          b.equipment.forEach(e => {
            const k = e.categories ? `${e.categories.icon} ${e.categories.name}` : '-'
            byCat[k] = (byCat[k] || 0) + 1
          })
          return (
            <Link key={b.id} to={`/building/${b.id}`} className="card">
              <div className="card-title">🏢 {b.name}</div>
              {b.note && <div className="small muted">{b.note}</div>}
              <div className="chips">
                {Object.entries(byCat).map(([k, n]) => <span key={k} className="chip">{k} <b>{n}</b></span>)}
                {b.equipment.length === 0 && <span className="small muted">ยังไม่มีอุปกรณ์</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
