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

  if (!token) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-danger-500/10 border border-danger-500/20 flex items-center justify-center">
          <LockClosedIcon className="w-7 h-7 text-danger-400" />
        </div>
        <p className="text-danger-400 font-semibold">Invalid or missing reset token.</p>
        <Link to="/forgot-password" className="text-accent-cyan hover:underline font-medium text-sm">Request a new reset link</Link>
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
      <label className="label">{label} *</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={formData[field]}
          onChange={e => setFormData({ ...formData, [field]: e.target.value })}
          className="input pr-12"
          placeholder="Min 12 chars, A-Z, a-z, 0-9, @$!%*?&"
          required
        />
        <button type="button" onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/30 hover:bg-white/[0.04] hover:text-white/60 transition-colors">
          {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-green/20 border border-accent-cyan/20 flex items-center justify-center"
        >
          <LockClosedIcon className="w-7 h-7 text-accent-cyan" />
        </motion.div>
        <h2 className="font-display text-2xl font-bold gradient-text">New Password</h2>
        <p className="mt-2 text-sm text-white/40">Choose a strong new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField label="New Password" field="password" show={showPassword} toggleShow={() => setShowPassword(!showPassword)} />
        <PasswordField label="Confirm Password" field="confirmPassword" show={showConfirm} toggleShow={() => setShowConfirm(!showConfirm)} />

        <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-xs text-white/30 leading-relaxed">
          Password must: be ≥12 characters • have uppercase & lowercase • have a number • have a special char (@$!%*?&)
        </div>

        <button type="submit" disabled={isLoading} className="btn btn-primary w-full h-12 text-base font-bold">
          {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Reset Password →'}
        </button>
      </form>

      <div className="text-center">
        <Link to="/login" className="text-sm text-white/30 hover:text-accent-cyan transition-colors">Back to Login</Link>
      </div>
    </div>
  )
}
