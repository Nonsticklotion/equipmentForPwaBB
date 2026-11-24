import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Station from './pages/Station'
import Building from './pages/Building'
import Equipment from './pages/Equipment'
import Search from './pages/Search'
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

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/station/:id" element={<Station />} />
        <Route path="/building/:id" element={<Building />} />
        <Route path="/equipment/:id" element={<Equipment />} />
        <Route path="/search" element={<Search />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<AdminOnly><AdminHome /></AdminOnly>} />
        <Route path="/admin/stations" element={<AdminOnly><AdminStations /></AdminOnly>} />
        <Route path="/admin/categories" element={<AdminOnly><AdminCategories /></AdminOnly>} />
        <Route path="/admin/equipment/new" element={<AdminOnly><EquipmentForm /></AdminOnly>} />
        <Route path="/admin/equipment/:id" element={<AdminOnly><EquipmentForm /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
