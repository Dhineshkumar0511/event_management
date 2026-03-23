import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'

const demoAccounts = [
  { role: 'HOD', email: 'hod@college.edu', tag: 'Department Admin' },
  { role: 'Staff', email: 'staff1@college.edu', tag: 'Faculty Review' },
  { role: 'Student', email: 'student1@college.edu', tag: 'Learner Portal' },
]

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
      <div className="lg:hidden text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/25 to-emerald-300/10 text-cyan-200 shadow-[0_18px_45px_rgba(34,211,238,0.18)]">
          <CpuChipIcon className="h-8 w-8" />
        </div>
        <p className={`text-xs font-semibold uppercase tracking-[0.26em] ${isDark ? 'text-cyan-200/80' : 'text-cyan-700'}`}>AI and Data Science</p>
        <h1 className="section-title mt-2 text-3xl font-bold gradient-text">EventOS AI</h1>
      </div>

      <div className={`relative overflow-hidden rounded-[28px] border p-8 shadow-[0_30px_70px_rgba(2,8,23,0.18)] ${isDark ? 'border-white/10 bg-slate-900/80 text-slate-100' : 'border-slate-200 bg-white/90 text-slate-900'}`}>
        <div className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_30%)]' : 'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_30%)]'}`} />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-emerald-300/10 text-cyan-200"
            >
              <CpuChipIcon className="h-8 w-8" />
            </motion.div>

            <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Secure Department Access</p>
            <h2 className="section-title mt-3 text-3xl font-bold">Sign in to your workspace</h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Manage OD letters, approvals, and event intelligence from one professional portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Institution Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${!isDark ? '!bg-slate-50 !text-slate-900 !border-slate-200 placeholder:!text-slate-400' : ''}`}
                placeholder="you@college.edu"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pr-12 ${!isDark ? '!bg-slate-50 !text-slate-900 !border-slate-200 placeholder:!text-slate-400' : ''}`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 transition-colors ${isDark ? 'text-slate-400 hover:text-cyan-200' : 'text-slate-400 hover:text-cyan-700'}`}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300"
              >
                {error}
              </motion.div>
            )}

            <div className="text-right">
              <Link
                to="/forgot-password"
                className={`text-xs font-semibold ${isDark ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:text-cyan-900'}`}
              >
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary w-full h-12 rounded-2xl">
              {isLoading ? <div className="h-5 w-5 rounded-full border-2 border-slate-950/20 border-t-slate-950 animate-spin" /> : (
                <>
                  Enter Platform
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Need an account? </span>
            <Link to="/register" className={`font-semibold ${isDark ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-700 hover:text-emerald-900'}`}>
              Create one
            </Link>
          </div>

          <div className={`mt-7 rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/90'}`}>
            <div className="mb-3 flex items-center justify-between">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Demo Access
              </p>
              <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Password: `password123`</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  onClick={() => fillDemo(account.email)}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${isDark ? 'border-white/10 bg-slate-950/50 hover:border-cyan-300/30 hover:bg-slate-900' : 'border-slate-200 bg-white hover:border-cyan-200 hover:shadow-sm'}`}
                >
                  <p className="text-sm font-semibold">{account.role}</p>
                  <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{account.tag}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
