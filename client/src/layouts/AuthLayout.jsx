import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function AuthLayout() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-900 to-purple-900">
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-400/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-400/10 rounded-full blur-[80px]" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="text-center max-w-lg">
            {/* Logo */}
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}
              className="mb-10"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-violet-500/20">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </motion.div>

            <h1 className="text-5xl font-black tracking-tight mb-3">EventPass</h1>
            <p className="text-lg text-white/60 font-medium mb-12">Smart OD Letter Management System</p>

            <div className="space-y-5 text-left">
              {[
                { icon: '🚀', title: 'Quick OD Requests', desc: 'Submit for hackathons, symposiums, workshops & more' },
                { icon: '🤖', title: 'AI Verification', desc: 'Instant event authenticity check for faster approvals' },
                { icon: '📍', title: 'Live Tracking', desc: 'Real-time location check-ins during events' },
                { icon: '📄', title: 'Digital OD Letters', desc: 'Auto-generated formal letters with e-signatures' },
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <h3 className="font-bold text-white/90">{f.title}</h3>
                    <p className="text-sm text-white/50 mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
              className="mt-12 flex items-center justify-center gap-2 text-white/30 text-xs"
            >
              <span className="w-8 h-px bg-white/20" />
              Sri Manakula Vinayagar Engineering College
              <span className="w-8 h-px bg-white/20" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2.5 rounded-xl transition-all ${
            isDark ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-gray-200 text-gray-600'
          }`}
        >
          {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
