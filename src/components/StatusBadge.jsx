const cls = { 'ใช้งาน': 'ok', 'สำรอง': 'info', 'ชำรุด': 'bad', 'ซ่อม': 'warn', 'เลิกใช้': 'off' }

export default function StatusBadge({ status }) {
  return <span className={`badge ${cls[status] || ''}`}>{status}</span>
}
