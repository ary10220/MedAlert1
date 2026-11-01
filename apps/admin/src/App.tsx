import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import HospitalsPage from './pages/HospitalsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="hospitals" element={<HospitalsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
