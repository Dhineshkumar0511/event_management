import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { hodAPI, leaveAPI, whatsappAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  ClockIcon,
  CheckCircleIcon,
  UsersIcon,
  MapPinIcon,
  ChartBarIcon,
  ArrowRightIcon,
  InboxStackIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  BoltIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'

const appear = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

export default function HODDashboard() {
  const [stats, setStats] = useState({ pending_approval: 0, approved_today: 0, total_approved: 0, total_rejected: 0, active_events: 0, total_students: 0 })
  const [pendingRequests, setPendingRequests] = useState([])
  const [leaveStats, setLeaveStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [waStatus, setWaStatus] = useState(null)
  const waPollerRef = useRef(null)
  const { user } = useAuthStore()
  const { isDark } = useTheme()

  useEffect(() => {
    fetchDashboard()
    fetchWAStatus()
    waPollerRef.current = setInterval(fetchWAStatus, 5000)
    return () => clearInterval(waPollerRef.current)
  }, [])

  const fetchWAStatus = async () => {
    try {
      const res = await whatsappAPI.getStatus()
      setWaStatus(res.data.data)
    } catch {}
  }

  const handleWAConnect = async () => {
    try {
      await whatsappAPI.connect()
    } catch {}
    setTimeout(fetchWAStatus, 2000)
  }

  const fetchDashboard = async () => {
    try {
      const [aRes, pRes, lRes] = await Promise.all([
        hodAPI.getAnalytics(),
        hodAPI.getPendingApproval(),
        leaveAPI.getHodPending().catch(() => null),
      ])
      setStats(aRes.data.data || {})
      setPendingRequests(pRes.data.data?.slice(0, 5) || [])
      if (lRes) {
        const leaves = lRes.data.data || []
        setLeaveStats({ pending: leaves.length, recent: leaves.slice(0, 4) })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const approvalRate = stats.total_approved > 0 || stats.total_rejected > 0
    ? Math.round((stats.total_approved / ((stats.total_approved || 0) + (stats.total_rejected || 0))) * 100)
    : 0

  const commandTiles = [
    { label: 'Pending Approvals', value: stats.pending_approval || 0, icon: ClockIcon, tone: 'from-amber-300 to-orange-500', path: '/hod/requests' },
    { label: 'Approved Today', value: stats.approved_today || 0, icon: CheckCircleIcon, tone: 'from-emerald-300 to-teal-500' },
    { label: 'Active Events', value: stats.active_events || 0, icon: MapPinIcon, tone: 'from-cyan-300 to-sky-500', path: '/hod/tracking' },
    { label: 'Students', value: stats.total_students || 0, icon: UsersIcon, tone: 'from-lime-300 to-emerald-500', path: '/hod/users' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 rounded-[32px] skeleton" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-[28px] skeleton" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ai-mesh scanline relative overflow-hidden rounded-[36px] border border-lime-300/10 bg-[linear-gradient(140deg,_rgba(6,17,28,0.98)_0%,_rgba(9,30,40,0.96)_42%,_rgba(24,73,54,0.92)_100%)] p-7 shadow-[0_35px_100px_rgba(2,8,23,0.34)]"
      >
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.7fr_1fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-lime-200">
              <CpuChipIcon className="h-4 w-4" />
              AI Department Command Layer
            </div>
            <h1 className="section-title mt-5 text-3xl font-bold text-white lg:text-5xl">
              HOD Command Center
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
              Oversee approvals, live activity, department workload, and communication channels through a single executive-grade AI & Data Science dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/hod/requests" className="btn btn-primary">
                <ShieldCheckIcon className="h-4 w-4" />
                Review Approvals
              </Link>
              <Link to="/hod/reports" className="btn btn-secondary">
                <ChartBarIcon className="h-4 w-4" />
                Open Reports
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: 'Head', value: user?.name || 'HOD' },
              { label: 'Approval Rate', value: `${approvalRate}%` },
              { label: 'System State', value: stats.pending_approval > 0 ? 'Attention needed' : 'Stable' },
            ].map((item) => (
              <div key={item.label} className="metric-tile rounded-[26px] bg-white/[0.05] px-5 py-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commandTiles.map((item, index) => {
          const Wrapper = item.path ? Link : 'div'
          return (
            <motion.div key={item.label} {...appear} transition={{ delay: index * 0.06 }}>
              <Wrapper
                to={item.path || undefined}
                className={`metric-tile relative block overflow-hidden rounded-[28px] bg-gradient-to-br ${item.tone} p-5 text-slate-950 shadow-[0_22px_65px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-1`}
              >
                <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-900/70">{item.label}</p>
                    <p className="mt-3 text-4xl font-black">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-white/25 p-3">
                    <item.icon className="h-6 w-6" />
                  </div>
                </div>
              </Wrapper>
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.section
          {...appear}
          transition={{ delay: 0.14 }}
          className={`card ai-radar ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}
        >
          <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Executive Insight</p>
              <h2 className={`section-title mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Department Analytics</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
              <BoltIcon className="h-6 w-6" />
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className={`rounded-[28px] border p-5 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Approval Efficiency</p>
                <p className="text-xl font-black text-lime-300">{approvalRate}%</p>
              </div>
              <div className={`mt-4 h-3 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${approvalRate}%` }}
                  transition={{ duration: 1.1, delay: 0.3 }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: 'Approved', value: stats.total_approved || 0 },
                  { label: 'Rejected', value: stats.total_rejected || 0 },
                  { label: 'Active Events', value: stats.active_events || 0 },
                  { label: 'Students', value: stats.total_students || 0 },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/70' : 'bg-white shadow-sm'}`}>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <p className={`mt-2 text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { label: 'Pending Approvals', value: stats.pending_approval || 0, tone: 'from-amber-300 to-orange-500' },
                { label: 'Approved Today', value: stats.approved_today || 0, tone: 'from-emerald-300 to-teal-500' },
                { label: 'Live Events', value: stats.active_events || 0, tone: 'from-cyan-300 to-sky-500' },
                { label: 'User Scale', value: stats.total_students || 0, tone: 'from-lime-300 to-emerald-500' },
              ].map((item) => (
                <div key={item.label} className={`rounded-[24px] bg-gradient-to-r ${item.tone} px-5 py-4 text-slate-950 shadow-[0_16px_40px_rgba(15,23,42,0.16)]`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-900/70">{item.label}</p>
                  <p className="mt-2 text-3xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          {...appear}
          transition={{ delay: 0.2 }}
          className={`card ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}
        >
          <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Approval Stream</p>
              <h2 className={`section-title mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pending Approvals</h2>
            </div>
            <Link to="/hod/requests" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              Open stream
            </Link>
          </div>
          <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
            {pendingRequests.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <CheckCircleIcon className={`mx-auto mb-3 h-10 w-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No approvals waiting</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <Link
                  key={req.id}
                  to={`/hod/review/${req.id}`}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-cyan-300 text-slate-950 font-black">
                    {req.student_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{req.event_name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{req.student_name} | {req.student_department}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-semibold text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                      Staff Cleared
                    </span>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {req.staff_reviewed_at ? new Date(req.staff_reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {leaveStats !== null && (
          <motion.section
            {...appear}
            transition={{ delay: 0.26 }}
            className={`card ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}
          >
            <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Leave Governance</p>
                <h2 className={`section-title mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Leave Management</h2>
              </div>
              <Link to="/hod/leaves" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                Manage all
              </Link>
            </div>
            <div className="p-6">
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Pending</p>
                  <p className={`mt-2 text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{leaveStats.pending}</p>
                </div>
                <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">State</p>
                  <p className="mt-2 text-sm font-semibold text-lime-300">{leaveStats.pending > 0 ? 'Review needed' : 'Controlled'}</p>
                </div>
              </div>
              {leaveStats.recent.length === 0 ? (
                <div className="py-10 text-center">
                  <InboxStackIcon className={`mx-auto mb-3 h-10 w-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No leave items pending</p>
                </div>
              ) : (
                <div className={`overflow-hidden rounded-[24px] border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
                    {leaveStats.recent.map((l) => (
                      <Link
                        key={l.id}
                        to={`/hod/leave-letter/${l.id}`}
                        className={`flex items-center gap-4 px-4 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-cyan-300 text-slate-950 font-black">
                          {l.student_name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{l.student_name}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{l.department} | {l.leave_type} | {l.days_count} day(s)</p>
                        </div>
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-semibold text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                          Staff Cleared
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {waStatus && waStatus.status !== 'disabled' && (
          <motion.section
            {...appear}
            transition={{ delay: 0.32 }}
            className={`card ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}
          >
            <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Channel Control</p>
                <h2 className={`section-title mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>WhatsApp Broadcast</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <SignalIcon className="h-4 w-4" />
                {waStatus.status}
              </div>
            </div>
            <div className="p-6">
              {waStatus.status === 'qr' && (
                <div className="flex flex-col items-center gap-4">
                  <p className={`text-center text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Scan the QR code to link the department WhatsApp system for alerts and report delivery.
                  </p>
                  <div className="rounded-[26px] bg-white p-3 shadow-lg">
                    <img src={waStatus.qr} alt="WhatsApp QR Code" className="h-60 w-60 rounded-[18px]" />
                  </div>
                </div>
              )}

              {(waStatus.status === 'not_started' || waStatus.status === 'connecting') && (
                <div className="py-8 text-center">
                  <p className={`mb-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {waStatus.status === 'connecting' ? 'Client is starting. QR will appear shortly.' : 'WhatsApp broadcast is not connected yet.'}
                  </p>
                  {waStatus.status === 'not_started' && (
                    <button onClick={handleWAConnect} className="btn btn-primary">
                      Connect WhatsApp
                    </button>
                  )}
                </div>
              )}

              {(waStatus.status === 'ready' || waStatus.status === 'ultramsg') && (
                <div className={`rounded-[24px] border p-5 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    The department broadcast system is connected and ready for WhatsApp-based reporting and communication workflows.
                  </p>
                  <Link to="/hod/whatsapp-report" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                    Open WA Report
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}
