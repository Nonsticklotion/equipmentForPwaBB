import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Station from './pages/Station'
import Building from './pages/Building'
import Equipment from './pages/Equipment'
import Search from './pages/Search'
import Report from './pages/Report'
import Labels from './pages/Labels'
import Backup from './pages/admin/Backup'
import Users from './pages/admin/Users'
import Audit from './pages/admin/Audit'
import Account from './pages/Account'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminHome from './pages/admin/AdminHome'
import AdminStations from './pages/admin/AdminStations'
import AdminCategories from './pages/admin/AdminCategories'
import EquipmentForm from './pages/admin/EquipmentForm'
import { useAuth } from './auth'

function AdminOnly({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <p className="muted">กำลังโหลด…</p>
  return isAdmin ? children : <Navigate to="/login" replace />
}

// แอดมิน หรือ ผู้ดูแลสถานี
function ManagerOnly({ children }) {
  const { canManage, loading } = useAuth()
  if (loading) return <p className="muted">กำลังโหลด…</p>
  return canManage ? children : <Navigate to="/login" replace />
}

function LoggedIn({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">กำลังโหลด…</p>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/station/:id" element={<Station />} />
        <Route path="/building/:id" element={<Building />} />
        <Route path="/equipment/:id" element={<Equipment />} />
        <Route path="/search" element={<Search />} />
        <Route path="/report" element={<Report />} />
        <Route path="/labels" element={<Labels />} />
        <Route path="/admin/backup" element={<AdminOnly><Backup /></AdminOnly>} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<ManagerOnly><AdminHome /></ManagerOnly>} />
        <Route path="/admin/stations" element={<ManagerOnly><AdminStations /></ManagerOnly>} />
        <Route path="/admin/users" element={<AdminOnly><Users /></AdminOnly>} />
        <Route path="/admin/audit" element={<ManagerOnly><Audit /></ManagerOnly>} />
        <Route path="/account" element={<LoggedIn><Account /></LoggedIn>} />
        <Route path="/admin/categories" element={<AdminOnly><AdminCategories /></AdminOnly>} />
        <Route path="/admin/equipment/new" element={<ManagerOnly><EquipmentForm /></ManagerOnly>} />
        <Route path="/admin/equipment/:id" element={<ManagerOnly><EquipmentForm /></ManagerOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
