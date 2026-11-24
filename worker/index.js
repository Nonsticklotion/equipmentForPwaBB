// Cloudflare Worker: เสิร์ฟหน้าเว็บ (dist) + ปลุก Supabase ทุกวัน
// กันโปรเจกต์ Supabase แผนฟรีถูกหยุดเมื่อไม่มีการใช้งาน 7 วัน
// ต้องตั้ง Variables (Settings → Variables and Secrets): SUPABASE_URL, SUPABASE_KEY

async function pingSupabase(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    console.log('keep-alive: ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_KEY')
    return 'missing vars'
  }
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/stations?select=id&limit=1`, {
    headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}` },
  })
  console.log('keep-alive:', res.status)
  return res.status
}

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request)
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(pingSupabase(env))
  },
}
