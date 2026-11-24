import { useEffect, useState } from 'react'
import { PHOTO_KINDS, photoUrl } from '../lib/photos'

// แสดงรูปแยกตามประเภท + คลิกเพื่อดูรูปใหญ่
export default function PhotoGallery({ photos }) {
  const [open, setOpen] = useState(null)   // index ใน photos

  useEffect(() => {
    if (open === null) return
    const onKey = e => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen(i => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setOpen(i => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, photos.length])

  if (!photos.length) return null

  return (
    <>
      <div className="photo-groups">
        {PHOTO_KINDS.map(k => {
          const list = photos.filter(p => p.kind === k.key)
          if (!list.length) return null
          return (
            <section key={k.key} className="photo-group">
              <h3>{k.icon} {k.label}</h3>
              <div className="thumbs">
                {list.map(p => (
                  <button key={p.id} className="thumb" onClick={() => setOpen(photos.indexOf(p))}>
                    <img src={photoUrl(p.path)} alt={k.label} loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {open !== null && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <img src={photoUrl(photos[open].path)} alt="" onClick={e => e.stopPropagation()} />
          <div className="lightbox-bar" onClick={e => e.stopPropagation()}>
            {photos.length > 1 && <button onClick={() => setOpen((open - 1 + photos.length) % photos.length)}>‹</button>}
            <span>{PHOTO_KINDS.find(k => k.key === photos[open].kind)?.label} · {open + 1}/{photos.length}</span>
            {photos.length > 1 && <button onClick={() => setOpen((open + 1) % photos.length)}>›</button>}
            <a href={photoUrl(photos[open].path)} target="_blank" rel="noreferrer">เปิดรูปเต็ม</a>
            <button onClick={() => setOpen(null)}>✕</button>
          </div>
        </div>
      )}
    </>
  )
}
