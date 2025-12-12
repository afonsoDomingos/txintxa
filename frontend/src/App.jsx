import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Exchange from './pages/Exchange'
import History from './pages/History'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/AdminDashboard'

// Protected Route
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando...</p>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return children
}

// Guest Route (only for non-authenticated)
const GuestRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        )
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={
                    <GuestRoute>
                        <Login />
                    </GuestRoute>
                } />
                <Route path="/register" element={
                    <GuestRoute>
                        <Register />
                    </GuestRoute>
                } />
                <Route path="/verify-email" element={<VerifyEmail />} />
            </Route>

            {/* Protected Routes */}
            <Route element={
                <ProtectedRoute>
                    <MainLayout />
                </ProtectedRoute>
            }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/exchange" element={<Exchange />} />
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    )
}

export default App
