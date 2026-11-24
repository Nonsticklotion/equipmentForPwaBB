import QRCode from 'qrcode'

// URL ของเว็บจริง (ตั้ง VITE_PUBLIC_URL ได้) — กันพิมพ์ QR จาก localhost แล้วสแกนไม่ได้
const BASE = (import.meta.env.VITE_PUBLIC_URL || `${window.location.origin}${window.location.pathname}`).replace(/\/$/, '')

export const isLocalBase = /localhost|127\.0\.0\.1|192\.168\./.test(BASE)

// ลิงก์ตรงไปหน้าอุปกรณ์ (ใช้ hash router)
export const equipmentUrl = id => `${BASE}/#/equipment/${id}`

export const qrDataUrl = (text, size = 240) =>
  QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' })
