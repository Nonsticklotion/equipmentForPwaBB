// helpers สำหรับ field_schema ของหมวดอุปกรณ์

export function allFields(schema) {
  return (schema || []).flatMap(g => g.fields || [])
}

// คอลัมน์ที่แสดงในตารางรายการ: ฟิลด์ที่ติ๊ก list=true, ถ้าไม่มีใช้ 3 ฟิลด์แรก
export function listFields(schema) {
  const f = allFields(schema)
  const marked = f.filter(x => x.list)
  return marked.length ? marked : f.slice(0, 3)
}

export function fmt(field, value) {
  if (value === null || value === undefined || value === '') return '–'
  if (field.type === 'date') {
    const d = new Date(value)
    return isNaN(d) ? value : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (field.type === 'number') return Number(value).toLocaleString('th-TH', { maximumFractionDigits: 3 })
  return String(value)
}

export function label(field) {
  return field.unit ? `${field.label} (${field.unit})` : field.label
}
