import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function ResetPassword() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const cardCls = `rounded-2xl p-8 border shadow-xl ${isDark ? 'bg-gray-800/80 border-gray-700 shadow-black/30' : 'bg-white border-gray-200 shadow-gray-200/50'}`
  const inputCls = `w-full px-4 py-3 pr-12 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`
  const labelCls = `block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`

  if (!token) {
    return (
      <div className={cardCls}>
        <div className="text-center py-4">
          <p className="text-red-500 font-semibold mb-4">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="text-violet-500 font-bold hover:underline">Request a new reset link</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: formData.password })
      toast.success('Password reset! Please log in.')
      navigate('/login')
    } catch (err) {
      const data = err.response?.data
      const msg = data?.message || (Array.isArray(data?.errors) && data.errors[0]?.msg) || 'Reset failed'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const PasswordField = ({ label, field, show, toggleShow }) => (
    <div>
      <label className={labelCls}>{label} *</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={formData[field]}
          onChange={e => setFormData({ ...formData, [field]: e.target.value })}
          className={inputCls}
          placeholder="Min 12 chars, A-Z, a-z, 0-9, @$!%*?&"
          required
        />
        <button type="button" onClick={toggleShow}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-violet-400' : 'text-gray-400 hover:text-violet-600'}`}
        >
          {show ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className={cardCls}>
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4 shadow-lg shadow-violet-500/25"
          >
            <LockClosedIcon className="w-7 h-7 text-white" />
          </motion.div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Set New Password</h2>
          <p className={`mt-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Choose a strong new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordField label="New Password" field="password" show={showPassword} toggleShow={() => setShowPassword(!showPassword)} />
          <PasswordField label="Confirm Password" field="confirmPassword" show={showConfirm} toggleShow={() => setShowConfirm(!showConfirm)} />

          <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-gray-700/60 text-gray-400' : 'bg-violet-50 text-gray-600'}`}>
            Password must: be ≥12 characters • have uppercase & lowercase • have a number • have a special char (@$!%*?&)
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full h-12 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reset Password →'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className={`text-sm ${isDark ? 'text-gray-400 hover:text-violet-400' : 'text-gray-500 hover:text-violet-600'}`}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
