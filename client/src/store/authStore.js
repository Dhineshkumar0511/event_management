import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { token, user } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          
          // Set token in api defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          return { success: true, user }
        } catch (error) {
          const message = error.response?.data?.message || 'Login failed'
          set({ isLoading: false, error: message })
          return { success: false, error: message }
        }
      },

      // Register
      register: async (userData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/register', userData)
          const { token, user } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          return { success: true, user }
        } catch (error) {
          const data = error.response?.data
          const message = data?.message ||
            (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
            'Registration failed'
          set({ isLoading: false, error: message })
          return { success: false, error: message }
        }
      },

      // Logout
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
        delete api.defaults.headers.common['Authorization']
      },

      // Get current user
      fetchUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/me')
          set({ user: response.data.user })
        } catch (error) {
          // Token might be expired
          get().logout()
        }
      },

      // Update profile
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.put('/auth/profile', profileData)
          set({
            user: response.data.user,
            isLoading: false
          })
          return { success: true }
        } catch (error) {
          const message = error.response?.data?.message || 'Update failed'
          set({ isLoading: false, error: message })
          return { success: false, error: message }
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if token exists and set it
      initializeAuth: () => {
        const { token } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
)

// Initialize auth on app start
useAuthStore.getState().initializeAuth()
