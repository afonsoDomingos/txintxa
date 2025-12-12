import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('txintxa_token')
        if (token) {
            fetchUser()
        } else {
            setLoading(false)
        }
    }, [])

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me')
            setUser(response.data.data)
            setIsAuthenticated(true)
        } catch (error) {
            localStorage.removeItem('txintxa_token')
            setUser(null)
            setIsAuthenticated(false)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password })
        const { token, user: userData } = response.data.data

        localStorage.setItem('txintxa_token', token)
        setUser(userData)
        setIsAuthenticated(true)

        return response.data
    }

    const register = async (data) => {
        const response = await api.post('/auth/register', data)
        const { token, user: userData } = response.data.data

        localStorage.setItem('txintxa_token', token)
        setUser(userData)
        setIsAuthenticated(true)

        return response.data
    }

    const logout = async () => {
        try {
            await api.post('/auth/logout')
        } catch (error) {
            // Ignore error, still logout locally
        } finally {
            localStorage.removeItem('txintxa_token')
            setUser(null)
            setIsAuthenticated(false)
        }
    }

    const updateUser = (updates) => {
        setUser(prev => ({ ...prev, ...updates }))
    }

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
        fetchUser
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
