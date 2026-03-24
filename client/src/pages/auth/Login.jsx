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
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto mb-6 relative w-20 h-20"
        >
          {/* Pulsing Core */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 blur-2xl animate-pulse" />
          <div className="relative w-full h-full rounded-3xl bg-[#0a0c1f]/60 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-accent-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-4xl filter drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">🧠</span>
            {/* Scanning line */}
            <div className="absolute inset-x-0 h-[2px] bg-accent-cyan/50 top-0 animate-scanline shadow-[0_0_10px_#00e5ff]" />
          </div>
        </motion.div>
        
        <h2 className="font-display text-5xl font-black tracking-tight leading-none italic">
          <span className="bg-gradient-to-r from-white via-white/90 to-white/40 bg-clip-text text-transparent">ACCESS</span><br/>
          <span className="bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-magenta bg-clip-text text-transparent">PORTAL VR.4</span>
        </h2>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
          SYSTEM AUTHENTICATION PROTOCOL // <span className="text-accent-cyan">LEVEL 01</span>
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

      {/* Quick Access — High Fidelity Cards */}
      <div className="neural-card rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-3xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-cyan/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse shadow-[0_0_10px_#ffbe0b]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Neural Quick-Link</span>
          </div>
          <span className="font-mono text-[9px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/30 tracking-widest">PWD: 123</span>
        </div>

        <div className="grid grid-cols-3 gap-3 relative z-10">
          {demoAccounts.map((account) => (
            <motion.button
              key={account.role}
              type="button"
              whileHover={{ y: -5, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFormData({ email: account.email, password: 'password123' })}
              className={`group relative flex flex-col items-center gap-3 rounded-[1.25rem] border border-white/5 bg-white/[0.02] px-2 py-5 transition-all hover:bg-white/[0.08] hover:border-white/20`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${account.color} shadow-xl text-xl relative`}>
                 <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                 <span className="relative z-10">{account.icon}</span>
              </div>
              <div className="text-center">
                <span className="block text-xs font-black text-white uppercase tracking-tighter">{account.role}</span>
                <span className="block text-[8px] font-bold text-white/25 mt-1 uppercase tracking-widest">{account.label?.split(' ')[0]}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
