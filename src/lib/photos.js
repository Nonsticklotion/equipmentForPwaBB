import { supabase } from '../supabase'

export const BUCKET = 'equipment-photos'

export const PHOTO_KINDS = [
  { key: 'nameplate', label: 'Nameplate', icon: '🏷️' },
  { key: 'tag', label: 'รหัสเครื่อง', icon: '🔢' },
  { key: 'equipment', label: 'รูปอุปกรณ์', icon: '📷' },
  { key: 'other', label: 'อื่นๆ', icon: '🖼️' },
]

export const photoUrl = path => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

// ย่อรูปก่อนอัป (ด้านยาวสุด 1600px, JPEG 0.82) — รูปมือถือ 4-8 MB เหลือ ~300 KB
// ตัวหนังสือบน nameplate ยังอ่านชัด และประหยัดพื้นที่ฟรี 1 GB ของ Supabase
export async function compressImage(file, maxSide = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) throw new Error('ไฟล์ไม่ใช่รูปภาพ')
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('แปลงรูปไม่สำเร็จ')), 'image/jpeg', quality))
}

export async function uploadPhoto(equipmentId, kind, file) {
  const blob = await compressImage(file)
  const path = `${equipmentId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (up.error) throw up.error
  const { data, error } = await supabase.from('equipment_photos')
    .insert({ equipment_id: equipmentId, kind, path }).select().single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

export async function deletePhoto(photo) {
  const { error } = await supabase.from('equipment_photos').delete().eq('id', photo.id)
  if (error) throw error
  await supabase.storage.from(BUCKET).remove([photo.path])
}

// ลบรูปทั้งหมดของอุปกรณ์ใน storage (เรียกก่อนลบอุปกรณ์)
export async function deleteAllPhotos(equipmentId) {
  const { data } = await supabase.from('equipment_photos').select('path').eq('equipment_id', equipmentId)
  if (data?.length) await supabase.storage.from(BUCKET).remove(data.map(p => p.path))
}
