import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staffAPI, leaveAPI, whatsappAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  ClockIcon, CheckCircleIcon, XCircleIcon, ArrowTrendingUpIcon,
  ChartBarIcon, ArrowRightIcon, InboxStackIcon, SignalIcon, CommandLineIcon,
} from '@heroicons/react/24/outline'

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { animate: { transition: { staggerChildren: 0.06 } } }

export default function StaffDashboard() {
  const [stats, setStats] = useState({ pending: 0, reviewed_today: 0, approved: 0, rejected: 0 })
  const [pendingRequests, setPendingRequests] = useState([])
  const [leaveStats, setLeaveStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [waStatus, setWaStatus] = useState(null)
  const waPollerRef = useRef(null)
  const { user } = useAuthStore()
  const { isDark } = useTheme()

  useEffect(() => {
    fetchDashboard(); fetchWAStatus()
    waPollerRef.current = setInterval(fetchWAStatus, 5000)
    return () => clearInterval(waPollerRef.current)
  }, [])

  const fetchWAStatus = async () => { try { const res = await whatsappAPI.getStatus(); setWaStatus(res.data.data) } catch {} }
  const handleWAConnect = async () => { try { await whatsappAPI.connect() } catch {} setTimeout(fetchWAStatus, 2000) }

  const fetchDashboard = async () => {
    try {
      const [sRes, rRes, lRes] = await Promise.all([
        staffAPI.getDashboard(), staffAPI.getPendingRequests(),
        leaveAPI.getStaffPending().catch(() => null),
      ])
      setStats(sRes.data.data || {})
      setPendingRequests(rRes.data.data?.slice(0, 5) || [])
      if (lRes) { const leaves = lRes.data.data || []; setLeaveStats({ pending: leaves.length, recent: leaves.slice(0, 4) }) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const analytics = useMemo(() => {
    const total = (stats.approved || 0) + (stats.rejected || 0)
    return { total, approvalRate: total > 0 ? Math.round(((stats.approved || 0) / total) * 100) : 0 }
  }, [stats])

  const quickStats = [
    { label: 'Pending', value: stats.pending || 0, icon: ClockIcon, accent: 'text-accent-amber', bg: 'from-accent-amber/20 to-accent-amber/5', border: 'border-accent-amber/10', path: '/staff/requests' },
    { label: 'Today', value: stats.reviewed_today || 0, icon: ArrowTrendingUpIcon, accent: 'text-accent-cyan', bg: 'from-accent-cyan/20 to-accent-cyan/5', border: 'border-accent-cyan/10' },
    { label: 'Approved', value: stats.approved || 0, icon: CheckCircleIcon, accent: 'text-accent-green', bg: 'from-accent-green/20 to-accent-green/5', border: 'border-accent-green/10' },
    { label: 'Rejected', value: stats.rejected || 0, icon: XCircleIcon, accent: 'text-accent-magenta', bg: 'from-accent-magenta/20 to-accent-magenta/5', border: 'border-accent-magenta/10' },
  ]

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-44 skeleton" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}</div>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">

      {/* ── Hero ── */}
      <motion.section variants={fadeUp}
        className="neural-grid scanline relative overflow-hidden rounded-2xl border border-accent-purple/8 bg-gradient-to-br from-neural-surface via-[#140a25]/50 to-neural-surface p-6 lg:p-7"
      >
        <div className="absolute top-0 right-[15%] w-64 h-64 rounded-full bg-accent-purple/6 blur-[80px]" />
        <div className="absolute bottom-0 left-[5%] w-48 h-48 rounded-full bg-accent-cyan/4 blur-[60px]" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-purple/15 bg-accent-purple/[0.04] px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-glow-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-purple/60">Faculty Intelligence</span>
            </div>
            <h1 className="font-display mt-4 text-3xl lg:text-4xl font-black text-white/90">Staff Review Hub</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/35">
              Review requests, validate submissions, and monitor workflow performance inside the AI & Data Science faculty console.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/staff/requests" className="btn btn-primary"><ClockIcon className="h-4 w-4" /> Review Requests</Link>
              <Link to="/staff/history" className="btn btn-secondary"><CommandLineIcon className="h-4 w-4" /> History</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: 'Faculty', value: user?.name || 'Staff' },
              { label: 'Queue', value: stats.pending > 0 ? `${stats.pending} pending` : 'Synced' },
              { label: 'Rate', value: `${analytics.approvalRate}%` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">{item.label}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white/70">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Stat Cards ── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((item, i) => {
          const Wrapper = item.path ? Link : 'div'
          return (
            <motion.div key={item.label} variants={fadeUp}>
              <Wrapper to={item.path || undefined}
                className={`group relative block overflow-hidden rounded-2xl border ${item.border} bg-gradient-to-br ${item.bg} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-neural`}>
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/[0.03] blur-xl" />
                <div className="relative z-10">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] ${item.accent} mb-3`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <p className="font-mono text-3xl font-black text-white/90">{item.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">{item.label}</p>
                </div>
              </Wrapper>
            </motion.div>
          )
        })}
      </div>

      {/* ── Analytics + Queue ── */}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section variants={fadeUp} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Performance</p>
              <h2 className="font-display mt-1 text-lg font-bold text-white/80">Review Analytics</h2>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-cyan/10 text-accent-cyan">
              <ChartBarIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="p-5 space-y-5">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-white/40">Approval Rate</p>
                <p className="font-mono text-lg font-black text-accent-cyan">{analytics.approvalRate}%</p>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-accent-cyan via-accent-green to-accent-purple"
                  initial={{ width: 0 }} animate={{ width: `${analytics.approvalRate}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total', value: analytics.total, color: 'text-accent-cyan' },
                { label: 'Today', value: stats.reviewed_today || 0, color: 'text-accent-green' },
                { label: 'Approved', value: stats.approved || 0, color: 'text-accent-green' },
                { label: 'Rejected', value: stats.rejected || 0, color: 'text-accent-magenta' },
              ].map((i) => (
                <div key={i.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                  <p className={`font-mono text-2xl font-black ${i.color}`}>{i.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/20">{i.label}</p>
                </div>
              ))}
            </div>

            {/* Visual bar chart */}
            <div className="flex items-end gap-3 h-32">
              {[
                { label: 'Approved', value: stats.approved || 0, color: 'from-accent-green to-accent-cyan' },
                { label: 'Rejected', value: stats.rejected || 0, color: 'from-accent-magenta to-danger-400' },
                { label: 'Pending', value: stats.pending || 0, color: 'from-accent-amber to-warning-400' },
                { label: 'Today', value: stats.reviewed_today || 0, color: 'from-accent-cyan to-accent-purple' },
              ].map((bar) => {
                const max = Math.max(stats.approved || 0, stats.rejected || 0, stats.pending || 0, stats.reviewed_today || 0, 1)
                return (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-white/50">{bar.value}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max((bar.value / max) * 100, 10)}%` }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className={`w-full rounded-t-xl bg-gradient-to-t ${bar.color}`}
                    />
                    <span className="text-[9px] uppercase tracking-[0.15em] text-white/20">{bar.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Queue</p>
              <h2 className="font-display mt-1 text-lg font-bold text-white/80">Pending Requests</h2>
            </div>
            <Link to="/staff/requests" className="text-[11px] font-semibold text-accent-cyan/60 hover:text-accent-cyan">Open</Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {pendingRequests.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <CheckCircleIcon className="mx-auto mb-2 h-8 w-8 text-white/10" />
                <p className="text-sm text-white/25">All reviewed</p>
              </div>
            ) : pendingRequests.map((req) => (
              <Link key={req.id} to={`/staff/review/${req.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple/15 to-accent-cyan/10 text-white/80 font-bold text-sm">
                  {req.student_name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/70">{req.event_name}</p>
                  <p className="truncate text-xs text-white/25 mt-0.5">{req.student_name} | {req.student_department}</p>
                </div>
                <span className="rounded-lg bg-accent-amber/8 px-2.5 py-1 text-[10px] font-semibold text-accent-amber">Pending</span>
              </Link>
            ))}
          </div>
        </motion.section>
      </div>

      {/* ── Leave + WA ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        {leaveStats !== null && (
          <motion.section variants={fadeUp} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
              <h2 className="font-display flex items-center gap-2 text-base font-bold text-white/80">Leave Queue</h2>
              <Link to="/staff/leaves" className="text-[11px] font-semibold text-accent-cyan/60 hover:text-accent-cyan">Review all</Link>
            </div>
            <div className="p-5">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Pending</p>
                  <p className="mt-1 font-mono text-2xl font-black text-white/80">{leaveStats.pending}</p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Status</p>
                  <p className="mt-1 text-sm font-semibold text-accent-cyan">{leaveStats.pending > 0 ? 'Action needed' : 'Stable'}</p>
                </div>
              </div>
              {leaveStats.recent.length === 0 ? (
                <div className="py-8 text-center">
                  <InboxStackIcon className="mx-auto mb-2 h-8 w-8 text-white/10" />
                  <p className="text-sm text-white/25">No pending leaves</p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.04] overflow-hidden divide-y divide-white/[0.03]">
                  {leaveStats.recent.map((l) => (
                    <Link key={l.id} to={`/staff/leave-letter/${l.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-purple/15 to-accent-cyan/10 text-white/70 font-bold text-sm">
                        {l.student_name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/60">{l.student_name}</p>
                        <p className="truncate text-xs text-white/25 mt-0.5">{l.leave_type} | {l.days_count}d</p>
                      </div>
                      <span className="rounded-lg bg-accent-amber/8 px-2 py-1 text-[10px] font-semibold text-accent-amber">Pending</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {waStatus && waStatus.status !== 'disabled' && (
          <motion.section variants={fadeUp} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
              <h2 className="font-display flex items-center gap-2 text-base font-bold text-white/80">WhatsApp Sync</h2>
              <div className="flex items-center gap-1.5 rounded-lg bg-accent-green/8 px-2.5 py-1">
                <SignalIcon className="h-3 w-3 text-accent-green" />
                <span className="text-[11px] font-semibold text-accent-green">{waStatus.status}</span>
              </div>
            </div>
            <div className="p-5">
              {waStatus.status === 'qr' && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-white/35 text-center">Scan QR to connect WhatsApp.</p>
                  <div className="rounded-xl bg-white p-3"><img src={waStatus.qr} alt="QR" className="h-52 w-52 rounded-lg" /></div>
                </div>
              )}
              {(waStatus.status === 'not_started' || waStatus.status === 'connecting') && (
                <div className="py-8 text-center">
                  <p className="text-sm text-white/35 mb-4">{waStatus.status === 'connecting' ? 'Connecting...' : 'Not connected.'}</p>
                  {waStatus.status === 'not_started' && <button onClick={handleWAConnect} className="btn btn-primary">Connect</button>}
                </div>
              )}
              {(waStatus.status === 'ready' || waStatus.status === 'ultramsg') && (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                  <p className="text-sm text-white/40">Connected and ready for reports.</p>
                  <Link to="/staff/whatsapp-report" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-cyan/70 hover:text-accent-cyan">
                    Open Report <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </div>
    </motion.div>
  )
}
