import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AlertsPage from './pages/AlertsPage'
import AlertDetailPage from './pages/AlertDetailPage'
import SelectUnitPage from './pages/SelectUnitPage'
import DispatchConfirmPage from './pages/DispatchConfirmPage'
import ActiveCasesPage from './pages/ActiveCasesPage'
import HistoryPage from './pages/HistoryPage'
import FleetPage from './pages/FleetPage'

// Casos de uso de la ficha (app hospital, ahora web):
// UC-11 login · UC-12 alertas · UC-13 detalle · UC-14 unidad · UC-15 confirmación
// UC-16 casos activos · UC-17 historial · UC-18 flota
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<AlertsPage />} />
            <Route path="alerts/:id" element={<AlertDetailPage />} />
            <Route path="alerts/:id/dispatch" element={<SelectUnitPage />} />
            <Route path="alerts/:id/dispatched" element={<DispatchConfirmPage />} />
            <Route path="active" element={<ActiveCasesPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="fleet" element={<FleetPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
