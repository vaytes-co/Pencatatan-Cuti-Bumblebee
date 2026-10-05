import { BrowserRouter, Routes, Route } from 'react-router-dom'

import LoginPage from './pages/LoginPage'
import DesignSystemPage from './pages/DesignSystemPage'
import DashboardPage from './pages/DashboardPage'
import DashboardLayout from './layouts/DashboardLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Development */}
        <Route
          path="/design-system"
          element={<DesignSystemPage />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App