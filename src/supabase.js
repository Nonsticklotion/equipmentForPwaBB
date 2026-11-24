import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key, {
  // pkce: ลิงก์รีเซ็ตรหัสกลับมาเป็น ?code=... ไม่ชนกับ hash router
  auth: { flowType: 'pkce', detectSessionInUrl: true },
}) : null

export const STATUSES = ['ใช้งาน', 'สำรอง', 'ชำรุด', 'ซ่อม', 'เลิกใช้']
