import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
})

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('txintxa_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('txintxa_token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api

// API helper functions
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    verifyEmail: (token) => api.post('/auth/verify-email', { token }),
    sendPhoneOTP: () => api.post('/auth/send-phone-otp'),
    verifyPhone: (otp) => api.post('/auth/verify-phone', { otp }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data)
}

export const userAPI = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    changePassword: (data) => api.post('/users/change-password', data),
    submitKYC: (data) => api.post('/users/kyc', data),
    linkPayPal: (email) => api.post('/users/link/paypal', { email }),
    linkMPesa: (phone) => api.post('/users/link/mpesa', { phone }),
    unlinkPayPal: () => api.delete('/users/unlink/paypal'),
    unlinkMPesa: () => api.delete('/users/unlink/mpesa'),
    getLimits: () => api.get('/users/limits'),
    getBalances: () => api.get('/users/balances')
}

export const exchangeAPI = {
    getRates: () => api.get('/exchange/rates'),
    getQuote: (data) => api.post('/exchange/quote', data),
    initiate: (data) => api.post('/exchange/initiate', data),
    confirm: (data) => api.post('/exchange/confirm', data),
    getStatus: (id) => api.get(`/exchange/status/${id}`),
    cancel: (id) => api.post(`/exchange/cancel/${id}`)
}

export const transactionAPI = {
    getAll: (params) => api.get('/transactions', { params }),
    getById: (id) => api.get(`/transactions/${id}`),
    getStats: () => api.get('/transactions/stats'),
    export: (params) => api.get('/transactions/export', { params, responseType: 'blob' })
}

export const assistantAPI = {
    chat: (message) => api.post('/assistant/chat', { message })
}
