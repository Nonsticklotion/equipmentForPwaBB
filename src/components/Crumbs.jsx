import { Link } from 'react-router-dom'

// items: [{ label, to? }]
export default function Crumbs({ items }) {
  return (
    <nav className="crumbs">
      <Link to="/">สถานีทั้งหมด</Link>
      {items.map((it, i) => (
        <span key={i}>
          <span className="sep">›</span>
          {it.to ? <Link to={it.to}>{it.label}</Link> : <b>{it.label}</b>}
        </span>
      ))}
    </nav>
  )
}
