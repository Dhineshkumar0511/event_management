import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

const demoAccounts = [
  { role: 'HOD', email: 'hod@college.edu', icon: '🛡️', color: 'from-emerald-400 to-teal-500', border: 'border-emerald-400/25', shadow: 'shadow-emerald-500/10', label: 'Department Head' },
  { role: 'Staff', email: 'staff1@college.edu', icon: '👨‍🏫', color: 'from-purple-400 to-violet-600', border: 'border-purple-400/25', shadow: 'shadow-purple-500/10', label: 'Faculty Member' },
  { role: 'Student', email: 'student1@college.edu', icon: '🎓', color: 'from-cyan-400 to-blue-500', border: 'border-cyan-400/25', shadow: 'shadow-cyan-500/10', label: 'AI & DS Student' },
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
      const dashboardRoutes = { student: '/student/dashboard', staff: '/staff/dashboard', hod: '/hod/dashboard' }
      navigate(dashboardRoutes[result.user.role])
    } else {
      toast.error(result.error || 'Login failed')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header with animated icon */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="mx-auto mb-5 relative"
        >
          {/* Glowing ring */}
          <div className="absolute inset-0 w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-xl animate-breathe" />
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-cyan-400/20 flex items-center justify-center shadow-xl shadow-cyan-500/10">
            <span className="text-3xl">🧠</span>
          </div>
        </motion.div>
        <h2 className="font-display text-[1.65rem] font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Access Portal
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to the <span className="text-cyan-400/80 font-medium">AI & Data Science</span> Platform
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-[13px] font-bold uppercase tracking-[0.15em] text-slate-400">Email Address</label>
          <div className="relative group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 transition-all focus:border-cyan-400/40 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.08),0_0_20px_rgba(0,229,255,0.06)] focus:bg-white/[0.06]"
              placeholder="you@college.edu"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-bold uppercase tracking-[0.15em] text-slate-400">Password</label>
          <div className="relative group">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-xl px-4 py-3.5 pr-12 text-sm outline-none bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 transition-all focus:border-cyan-400/40 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.08),0_0_20px_rgba(0,229,255,0.06)] focus:bg-white/[0.06]"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition-all hover:bg-white/[0.06] hover:text-slate-300"
            >
              {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-pink-500/20 bg-pink-500/[0.06] px-4 py-3 text-sm text-pink-300">
            {error}
          </motion.div>
        )}

        <div className="text-right">
          <Link to="/forgot-password" className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent hover:from-cyan-300 hover:to-purple-300 transition-all">
            Forgot password?
          </Link>
        </div>

        {/* Gradient submit button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-full h-[52px] rounded-xl font-bold text-white overflow-hidden shadow-xl shadow-cyan-500/15 disabled:opacity-60 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-data-stream" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="relative z-10 flex items-center justify-center gap-2 text-[15px]">
            {isLoading ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>Launch Platform <ArrowRightIcon className="h-4 w-4" /></>
            )}
          </span>
        </motion.button>
      </form>

      {/* Sign up link */}
      <p className="text-center text-sm text-slate-400">
        Need an account?{' '}
        <Link to="/register" className="font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent hover:from-cyan-300 hover:to-purple-300">
          Create one
        </Link>
      </p>

      {/* Quick Access — colorful cards */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-glow-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">Quick Access</span>
          </div>
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500">password123</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {demoAccounts.map((account) => (
            <motion.button
              key={account.role}
              type="button"
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setFormData({ email: account.email, password: 'password123' })}
              className={`group relative flex flex-col items-center gap-2 rounded-2xl border ${account.border} bg-white/[0.02] px-3 py-4 transition-all hover:bg-white/[0.05] shadow-lg ${account.shadow}`}
            >
              {/* Icon with gradient bg */}
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${account.color} shadow-lg text-lg`}>
                {account.icon}
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-white/80">{account.role}</span>
                <span className="block text-[9px] text-slate-500 mt-0.5">{account.label}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
