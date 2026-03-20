import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, error } = useAuthStore()
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      toast.success('Welcome back!')
      const dashboardRoutes = {
        student: '/student/dashboard',
        staff: '/staff/dashboard',
        hod: '/hod/dashboard'
      }
      navigate(dashboardRoutes[result.user.role])
    } else {
      toast.error(result.error || 'Login failed')
    }
  }

  const fillDemo = (email) => {
    setFormData({ email, password: 'password123' })
  }

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-violet-500/30">
          <span className="text-2xl">📄</span>
        </div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">EventPass</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Smart OD Management System</p>
      </div>

      <div className={`rounded-2xl p-8 border shadow-xl ${isDark ? 'bg-gray-800/80 border-gray-700 shadow-black/30' : 'bg-white border-gray-200 shadow-gray-200/50'}`}>
        {/* Card header */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4 shadow-lg shadow-violet-500/25"
          >
            <span className="text-2xl">👋</span>
          </motion.div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome back</h2>
          <p className={`mt-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sign in to your EventPass account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
              placeholder="you@college.edu"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-violet-400' : 'text-gray-400 hover:text-violet-600'}`}
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
              className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-2 font-medium"
            >
              <span className="w-4 h-4 flex-shrink-0">⚠️</span> {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In →'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-500 font-bold hover:underline">Register</Link>
          </p>
        </div>

        {/* Demo credentials - clickable */}
        <div className={`mt-6 p-4 rounded-xl border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-100'}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-violet-400'}`}>Quick Login</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { role: 'HOD', email: 'hod@college.edu', icon: '👨‍💼', gradient: 'from-purple-500 to-violet-600' },
              { role: 'Staff', email: 'staff1@college.edu', icon: '👩‍🏫', gradient: 'from-emerald-500 to-teal-600' },
              { role: 'Student', email: 'student1@college.edu', icon: '🎓', gradient: 'from-blue-500 to-indigo-600' },
            ].map(d => (
              <button key={d.role} onClick={() => fillDemo(d.email)} type="button"
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.03] ${isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-violet-500' : 'bg-white border-gray-200 text-gray-700 hover:border-violet-400 hover:shadow-md'}`}
              >
                <span className="text-lg">{d.icon}</span>
                <span>{d.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
