import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { CpuChipIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'

const featureRows = [
  'Realtime OD approvals',
  'Smart event tracking',
  'AI-inspired operations UI',
  'Data Science department branding',
]

export default function AuthLayout() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-[#140b43] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.18fr_0.82fr]">
        <section className="ai-shell panel-grid relative hidden overflow-hidden border-r border-white/10 lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,_#140b43_0%,_#25106b_52%,_#170a4a_100%)]" />
          <div className="absolute left-12 top-14 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-10 top-20 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-cyan-400/14 blur-3xl" />
          <div className="absolute -left-8 top-16 h-36 w-36 rounded-full border border-blue-400/10 bg-blue-500/10 blur-sm" />
          <div className="absolute left-16 bottom-12 h-56 w-56 rounded-full border border-pink-400/10 bg-pink-500/10 blur-sm" />

          <div className="relative z-10 flex w-full flex-col justify-between p-14 xl:p-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-200">
                Artificial Intelligence & Data Science
              </div>

              <div className="mt-9 flex items-center gap-4">
                <div className="signal-ring flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/6">
                  <CpuChipIcon className="h-8 w-8 text-cyan-300" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Department Platform</p>
                  <h1 className="section-title text-5xl font-bold gradient-text xl:text-6xl">EventOS AI</h1>
                </div>
              </div>

              <h2 className="section-title mt-10 max-w-xl text-5xl font-bold leading-[0.95] text-white">
                Artificial
                <br />
                Intelligence
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                A futuristic department workspace for approvals, OD letters, event control, and academic operations.
              </p>

              <div className="mt-10 grid max-w-xl gap-3">
                {featureRows.map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.16 + index * 0.08 }}
                    className="neon-panel rounded-[22px] px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(56,213,255,0.8)]" />
                      <p className="text-sm font-medium text-slate-200">{item}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="relative ml-auto mr-10 mt-8 h-[380px] w-[380px]"
            >
              <div className="neural-orb float-orbit absolute inset-0" />
              <div className="absolute inset-[13%] rounded-full border border-cyan-300/20" />
              <div className="absolute inset-[24%] rounded-full border border-pink-300/20" />
              <div className="spin-slow absolute inset-[8%] rounded-full border border-blue-300/10 border-dashed" />
              <div className="absolute left-[22%] top-[20%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(56,213,255,0.9)]" />
              <div className="absolute right-[24%] top-[26%] h-3 w-3 rounded-full bg-pink-300 shadow-[0_0_16px_rgba(255,60,199,0.9)]" />
              <div className="absolute left-[30%] bottom-[24%] h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(155,109,255,0.9)]" />
            </motion.div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center p-6 sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,_#140b43_0%,_#1b0c58_100%)]" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-pink-500/12 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-400/12 blur-3xl" />
          <button
            onClick={toggleTheme}
            className="absolute right-6 top-6 z-20 rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative z-10 w-full max-w-md"
          >
            <Outlet />
          </motion.div>
        </section>
      </div>
    </div>
  )
}
