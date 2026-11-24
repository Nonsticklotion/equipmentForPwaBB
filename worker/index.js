// Cloudflare Worker: เสิร์ฟหน้าเว็บ (dist) + ปลุก Supabase ทุกวัน
// กันโปรเจกต์ Supabase แผนฟรีถูกหยุดเมื่อไม่มีการใช้งาน 7 วัน
// ต้องตั้ง Variables (Settings → Variables and Secrets): SUPABASE_URL, SUPABASE_KEY

async function pingSupabase(env) {
  // รับได้ทั้งชื่อ SUPABASE_* และ VITE_SUPABASE_*
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.log('keep-alive: ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_KEY')
    return 'missing vars'
  }
  const res = await fetch(`${url}/rest/v1/stations?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  console.log('keep-alive:', res.status)
  return res.status
}

export default {
  async fetch(request, env) {
    // ทดสอบด้วยมือ: เปิด /__ping ในเบราว์เซอร์
    if (new URL(request.url).pathname === '/__ping') {
      const status = await pingSupabase(env)
      const ok = status === 200
      return new Response(ok ? `OK: Supabase ตอบกลับ ${status}` : `ERROR: ${status}`, {
        status: ok ? 200 : 500, headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }
    return env.ASSETS.fetch(request)
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(pingSupabase(env))
  },
}
