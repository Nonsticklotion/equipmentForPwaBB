import { supabase } from '../supabase'
import { allFields, listFields, fmt, label } from './fields'

// ดึงอุปกรณ์ตามตัวกรอง (station / building / category)
export async function fetchForExport({ station, building, cat } = {}) {
  let q = supabase.from('equipment')
    .select('id, tag, name, status, specs, note, category_id, building_id, buildings!inner(id, name, sort, station_id, stations!inner(id, name, sort))')
  if (building) q = q.eq('building_id', building)
  else if (station) q = q.eq('buildings.station_id', station)
  if (cat) q = q.eq('category_id', cat)
  const [{ data: rows, error }, { data: cats }] = await Promise.all([
    q, supabase.from('categories').select('*').order('sort'),
  ])
  if (error) throw error
  rows.sort((a, b) =>
    (a.buildings.stations.sort - b.buildings.stations.sort) ||
    a.buildings.stations.name.localeCompare(b.buildings.stations.name, 'th') ||
    (a.buildings.sort - b.buildings.sort) ||
    a.buildings.name.localeCompare(b.buildings.name, 'th') ||
    (a.tag || a.name).localeCompare(b.tag || b.name, 'th', { numeric: true }))
  return { rows, cats: cats || [] }
}

const sheetName = (s, used) => {
  let n = s.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)
  let i = 2
  while (used.has(n)) n = `${n.slice(0, 28)} ${i++}`
  used.add(n)
  return n
}

export async function exportExcel({ rows, cats }, filename = 'equipment') {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const used = new Set()

  const catOf = r => cats.find(x => x.id === r.category_id)

  // ชีต 1: รายการอุปกรณ์ทั้งหมด (คอลัมน์หลัก + สเปกสำคัญ)
  const keyCol = r => {
    const c = catOf(r)
    return listFields(c?.field_schema)
      .map(f => {
        const v = r.specs?.[f.key]
        return v === undefined || v === null || v === '' ? null : `${f.label} ${fmt(f, v)}${f.unit ? ' ' + f.unit : ''}`
      }).filter(Boolean).join(' · ')
  }
  const all = [['ลำดับ', 'สถานี', 'อาคาร', 'หมวด', 'รหัส', 'ชื่อ', 'สถานะ', 'สเปกหลัก', 'หมายเหตุ']]
  rows.forEach((r, i) => all.push([
    i + 1, r.buildings.stations.name, r.buildings.name, catOf(r)?.name || '-',
    r.tag || '', r.name, r.status, keyCol(r), r.note || '',
  ]))
  const wsAll = XLSX.utils.aoa_to_sheet(all)
  wsAll['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 9 }, { wch: 60 }, { wch: 30 }]
  wsAll['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: all[0].length - 1 } }) }
  XLSX.utils.book_append_sheet(wb, wsAll, sheetName('รายการอุปกรณ์', used))

  // ชีต 2: สรุปจำนวน
  const summary = [['สถานี', 'อาคาร', 'หมวด', 'จำนวน']]
  const count = {}
  rows.forEach(r => {
    const k = [r.buildings.stations.name, r.buildings.name, catOf(r)?.name || '-'].join('\u0001')
    count[k] = (count[k] || 0) + 1
  })
  Object.entries(count).forEach(([k, n]) => summary.push([...k.split('\u0001'), n]))
  summary.push([], ['รวมทั้งหมด', '', '', rows.length], [], ['ออกรายงานเมื่อ', new Date().toLocaleString('th-TH')])
  const ws0 = XLSX.utils.aoa_to_sheet(summary)
  ws0['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws0, sheetName('สรุปจำนวน', used))

  // ชีต 3+: รายละเอียดครบทุกช่อง แยกตามหมวด
  for (const c of cats) {
    const list = rows.filter(r => r.category_id === c.id)
    if (!list.length) continue
    const fields = allFields(c.field_schema)
    const head = ['สถานี', 'อาคาร', 'รหัส', 'ชื่อ', 'สถานะ', ...fields.map(label), 'หมายเหตุ']
    const data = list.map(r => [
      r.buildings.stations.name, r.buildings.name, r.tag || '', r.name, r.status,
      ...fields.map(f => {
        const v = r.specs?.[f.key]
        if (v === undefined || v === null || v === '') return ''
        if (f.type === 'number') return Number(v)
        if (f.type === 'date') return fmt(f, v)
        return v
      }),
      r.note || '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([head, ...data])
    ws['!cols'] = head.map((h, i) => ({ wch: i < 4 ? 18 : Math.min(Math.max(String(h).length + 2, 10), 30) }))
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length, c: head.length - 1 } }) }
    ws['!freeze'] = { xSplit: 4, ySplit: 1 }
    XLSX.utils.book_append_sheet(wb, ws, sheetName(c.name, used))
  }

  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`)
}
