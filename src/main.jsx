import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { configured } from './supabase'
import './styles.css'

// กลับมาจากลิงก์รีเซ็ตรหัสผ่านในอีเมล -> พาไปหน้าตั้งรหัสใหม่
if (new URLSearchParams(window.location.search).has('recovery')) {
  window.location.hash = '#/reset-password'
}

function NotConfigured() {
  return (
    <div className="setup">
      <h1>ยังไม่ได้ตั้งค่า Supabase</h1>
      <p>สร้างไฟล์ <code>.env</code> จาก <code>.env.example</code> แล้วใส่ <code>VITE_SUPABASE_URL</code> และ <code>VITE_SUPABASE_ANON_KEY</code> จากนั้นรัน <code>npm run dev</code> ใหม่</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {configured ? (
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    ) : <NotConfigured />}
  </React.StrictMode>
)
