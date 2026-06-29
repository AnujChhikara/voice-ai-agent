import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  withCredentials: true,
})

apiClient.interceptors.request.use(
  (config) => {
    if (!(config.data instanceof FormData)) {
      config.headers.set('Content-Type', 'application/json')
    }
    return config
  },
  (error) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const pathname = window.location.pathname
    if (error.response?.status === 401 && pathname !== '/login') {
      window.location.href = '/login'
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  },
)

