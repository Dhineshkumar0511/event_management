import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { EyeIcon, EyeSlashIcon, ArrowRightIcon, CpuChipIcon } from '@heroicons/react/24/outline'

const demoAccounts = [
  { role: 'HOD', email: 'hod@college.edu' },
  { role: 'Staff', email: 'staff1@college.edu' },
  { role: 'Student', email: 'student1@college.edu' },
]

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(formData.email, formData.password)
    if (result.success) {
      toast.success('Welcome back')
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

  return (
    <div className="neon-panel rounded-[30px] border border-white/10 p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/8">
          <CpuChipIcon className="h-8 w-8 text-cyan-300" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">AI Department Access</p>
        <h2 className="section-title mt-3 text-3xl font-bold gradient-text">Sign In</h2>
        <p className="mt-2 text-sm text-slate-300">Enter the Artificial Intelligence and Data Science platform.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Institution Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input"
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
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input pr-12"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-white/6 hover:text-white"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm text-pink-100"
          >
            {error}
          </motion.div>
        )}

        <div className="text-right">
          <Link to="/forgot-password" className="text-xs font-semibold text-cyan-300 hover:text-white">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={isLoading} className="btn btn-primary w-full h-12">
          {isLoading ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : (
            <>
              Launch Platform
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-300">
        Need an account?{' '}
        <Link to="/register" className="font-semibold text-white hover:text-cyan-300">Create one</Link>
      </div>

      <div className="mt-7 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Quick Login</p>
          <p className="text-[11px] text-slate-500">password123</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {demoAccounts.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => setFormData({ email: account.email, password: 'password123' })}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-slate-100 transition-all hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.08]"
            >
              {account.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
