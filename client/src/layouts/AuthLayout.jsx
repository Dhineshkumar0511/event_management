import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import {
  SunIcon,
  MoonIcon,
  CpuChipIcon,
  ChartBarSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

const highlights = [
  {
    icon: CpuChipIcon,
    title: 'AI-first approvals',
    desc: 'Smart workflows for event validation, OD processing, and faster academic decisions.',
  },
  {
    icon: ChartBarSquareIcon,
    title: 'Data-driven visibility',
    desc: 'Live request signals, activity summaries, and department-wide performance insights.',
  },
  {
    icon: SparklesIcon,
    title: 'Professional student experience',
    desc: 'Elegant portals for students, staff, and HOD with one consistent digital identity.',
  },
]

export default function AuthLayout() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <div className="hidden lg:flex lg:w-[56%] relative overflow-hidden border-r border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.26),_transparent_28%),radial-gradient(circle_at_82%_18%,_rgba(34,211,238,0.18),_transparent_25%),linear-gradient(135deg,_#04101d_0%,_#0a1628_45%,_#081423_100%)]" />
        <div className="absolute inset-0 panel-grid opacity-70" />
        <div className="absolute top-20 left-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl pulse-ring" />
        <div className="absolute bottom-24 right-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl float-orbit" />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Artificial Intelligence and Data Science
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl">
                <CpuChipIcon className="h-8 w-8 text-cyan-200" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-400">Department Control Hub</p>
                <h1 className="section-title text-5xl font-bold tracking-tight text-white xl:text-6xl">
                  EventOS AI
                </h1>
              </div>
            </div>

            <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">
              A polished digital workspace for OD letters, event intelligence, approvals, and student engagement built for an AI & Data Science department.
            </p>

            <div className="mt-12 grid gap-4">
              {highlights.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.1 }}
                  className="data-glow rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-emerald-300/10 text-cyan-200">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="grid max-w-xl grid-cols-3 gap-4"
          >
            {[
              { label: 'Automation', value: 'AI workflows' },
              { label: 'Analytics', value: 'Live metrics' },
              { label: 'Experience', value: 'Modern portal' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{stat.label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{stat.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className={`relative flex w-full items-center justify-center p-6 sm:p-8 lg:w-[44%] ${isDark ? 'bg-slate-950' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_22%),linear-gradient(180deg,_rgba(2,6,23,0.95),_rgba(8,15,32,0.98))]' : 'bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.1),_transparent_22%),linear-gradient(180deg,_#f4fbff,_#edf7ff)]'}`} />
        <button
          onClick={toggleTheme}
          className={`absolute right-5 top-5 z-20 rounded-2xl border px-3 py-3 transition-all ${isDark ? 'border-white/10 bg-white/5 text-amber-300 hover:bg-white/10' : 'border-slate-200 bg-white/80 text-slate-600 hover:bg-white shadow-sm'}`}
        >
          {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
