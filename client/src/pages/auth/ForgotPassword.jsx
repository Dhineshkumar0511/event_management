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

  const cardCls = `rounded-2xl p-8 border shadow-xl ${isDark ? 'bg-gray-800/80 border-gray-700 shadow-black/30' : 'bg-white border-gray-200 shadow-gray-200/50'}`
  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`
  const labelCls = `block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`

  return (
    <div>
      <div className={cardCls}>
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4 shadow-lg shadow-violet-500/25"
          >
            <EnvelopeIcon className="w-7 h-7 text-white" />
          </motion.div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Forgot Password</h2>
          <p className={`mt-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {sent ? 'Check your inbox for the reset link' : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-5"
          >
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                ✅ If <strong>{email}</strong> is registered, you will receive a password reset link shortly.
              </p>
              <p className={`text-xs mt-2 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
                Check your spam folder if you don't see it within a few minutes.
              </p>
            </div>
            <Link to="/login"
              className="w-full h-12 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Back to Login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelCls}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@college.edu"
                required
              />
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full h-12 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link →'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className={`text-sm font-semibold ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-700'} flex items-center justify-center gap-1`}>
            <ArrowLeftIcon className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
