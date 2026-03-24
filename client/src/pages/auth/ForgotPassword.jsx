import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function ForgotPassword() {
  const { isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
      toast.success('Reset link sent!')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 border border-accent-purple/20 flex items-center justify-center"
        >
          <EnvelopeIcon className="w-7 h-7 text-accent-cyan" />
        </motion.div>
        <h2 className="font-display text-2xl font-bold gradient-text">Reset Password</h2>
        <p className="mt-2 text-sm text-white/40">
          {sent ? 'Check your inbox for the reset link' : "Enter your email and we'll send you a reset link"}
        </p>
      </div>

      {sent ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-xl border border-accent-green/15 bg-accent-green/[0.04] p-4">
            <p className="text-sm text-accent-green/80">
              ✅ If <strong className="text-accent-green">{email}</strong> is registered, you'll receive a password reset link shortly.
            </p>
            <p className="text-xs mt-2 text-white/30">
              Check your spam folder if you don't see it within a few minutes.
            </p>
          </div>
          <Link to="/login" className="btn btn-primary w-full h-12 text-base font-bold">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Login
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="you@college.edu"
              required
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn btn-primary w-full h-12 text-base font-bold">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Send Reset Link →'}
          </button>
        </form>
      )}

      <div className="text-center">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-accent-cyan/60 hover:text-accent-cyan transition-colors">
          <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Login
        </Link>
      </div>
    </div>
  )
}
