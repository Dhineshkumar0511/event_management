import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { hodAPI, leaveAPI, whatsappAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  ClockIcon, CheckCircleIcon, UsersIcon, MapPinIcon,
  ChartBarIcon, ArrowRightIcon, InboxStackIcon,
  ShieldCheckIcon, BoltIcon, SignalIcon,
} from '@heroicons/react/24/outline'

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { animate: { transition: { staggerChildren: 0.06 } } }

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

  const fetchWAStatus = async () => { try { const res = await whatsappAPI.getStatus(); setWaStatus(res.data.data) } catch {} }
  const handleWAConnect = async () => { try { await whatsappAPI.connect() } catch {} setTimeout(fetchWAStatus, 2000) }

  const fetchDashboard = async () => {
    try {
      const [aRes, pRes, lRes] = await Promise.all([
        hodAPI.getAnalytics(), hodAPI.getPendingApproval(),
        leaveAPI.getHodPending().catch(() => null),
      ])
      setStats(aRes.data.data || {})
      setPendingRequests(pRes.data.data?.slice(0, 5) || [])
      if (lRes) { const leaves = lRes.data.data || []; setLeaveStats({ pending: leaves.length, recent: leaves.slice(0, 4) }) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const approvalRate = (stats.total_approved || 0) + (stats.total_rejected || 0) > 0
    ? Math.round((stats.total_approved / ((stats.total_approved || 0) + (stats.total_rejected || 0))) * 100) : 0

  const commandTiles = [
    { label: 'Pending', value: stats.pending_approval || 0, icon: ClockIcon, accent: 'text-accent-amber', bg: 'from-accent-amber/20 to-accent-amber/5', border: 'border-accent-amber/10', path: '/hod/requests' },
    { label: 'Today', value: stats.approved_today || 0, icon: CheckCircleIcon, accent: 'text-accent-green', bg: 'from-accent-green/20 to-accent-green/5', border: 'border-accent-green/10' },
    { label: 'Events', value: stats.active_events || 0, icon: MapPinIcon, accent: 'text-accent-cyan', bg: 'from-accent-cyan/20 to-accent-cyan/5', border: 'border-accent-cyan/10', path: '/hod/tracking' },
    { label: 'Students', value: stats.total_students || 0, icon: UsersIcon, accent: 'text-accent-purple', bg: 'from-accent-purple/20 to-accent-purple/5', border: 'border-accent-purple/10', path: '/hod/users' },
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

      {/* ── Command Center Hero ── */}
      <motion.section variants={fadeUp}
        className="neural-grid scanline relative overflow-hidden rounded-2xl border border-accent-green/8 bg-gradient-to-br from-neural-surface via-[#0a1a15]/50 to-neural-surface p-6 lg:p-7"
      >
        <div className="absolute top-0 left-[20%] w-72 h-72 rounded-full bg-accent-green/5 blur-[100px]" />
        <div className="absolute bottom-0 right-[10%] w-56 h-56 rounded-full bg-accent-cyan/4 blur-[80px]" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-green/15 bg-accent-green/[0.04] px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-glow-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-green/60">Department Command</span>
            </div>
            <h1 className="font-display mt-4 text-3xl lg:text-4xl font-black text-white/90">
              HOD Command Center
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/35">
              Oversee approvals, live tracking, department workload, and communication through the AI & Data Science executive dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/hod/requests" className="btn btn-primary"><ShieldCheckIcon className="h-4 w-4" /> Review Approvals</Link>
              <Link to="/hod/reports" className="btn btn-secondary"><ChartBarIcon className="h-4 w-4" /> Reports</Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: 'Head', value: user?.name || 'HOD' },
              { label: 'Approval Rate', value: `${approvalRate}%` },
              { label: 'System', value: stats.pending_approval > 0 ? 'Attention' : 'Stable' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">{item.label}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white/70">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Stat Tiles ── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {commandTiles.map((item, i) => {
          const Wrapper = item.path ? Link : 'div'
          return (
            <motion.div key={item.label} variants={fadeUp}>
              <Wrapper to={item.path || undefined}
                className={`group relative block overflow-hidden rounded-2xl border ${item.border} bg-gradient-to-br ${item.bg} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-neural`}
              >
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

      {/* ── Analytics + Pending ── */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.section variants={fadeUp} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Insight</p>
              <h2 className="font-display mt-1 text-lg font-bold text-white/80">Department Analytics</h2>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-green/10 text-accent-green">
              <BoltIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="p-5 space-y-5">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-white/40">Approval Efficiency</p>
                <p className="font-mono text-lg font-black text-accent-green">{approvalRate}%</p>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-accent-green via-accent-cyan to-accent-purple"
                  initial={{ width: 0 }} animate={{ width: `${approvalRate}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Approved', value: stats.total_approved || 0, color: 'text-accent-green' },
                { label: 'Rejected', value: stats.total_rejected || 0, color: 'text-accent-magenta' },
                { label: 'Events', value: stats.active_events || 0, color: 'text-accent-cyan' },
                { label: 'Students', value: stats.total_students || 0, color: 'text-accent-purple' },
              ].map((i) => (
                <div key={i.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                  <p className={`font-mono text-2xl font-black ${i.color}`}>{i.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/20">{i.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Stream</p>
              <h2 className="font-display mt-1 text-lg font-bold text-white/80">Pending Approvals</h2>
            </div>
            <Link to="/hod/requests" className="text-[11px] font-semibold text-accent-cyan/60 hover:text-accent-cyan">Open</Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {pendingRequests.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <CheckCircleIcon className="mx-auto mb-2 h-8 w-8 text-white/10" />
                <p className="text-sm text-white/25">No approvals waiting</p>
              </div>
            ) : pendingRequests.map((req) => (
              <Link key={req.id} to={`/hod/review/${req.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-green/15 to-accent-cyan/10 text-white/80 font-bold text-sm">
                  {req.student_name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/70">{req.event_name}</p>
                  <p className="truncate text-xs text-white/25 mt-0.5">{req.student_name} | {req.student_department}</p>
                </div>
                <span className="rounded-lg bg-accent-cyan/8 px-2.5 py-1 text-[10px] font-semibold text-accent-cyan">Cleared</span>
              </Link>
            ))}
          </div>
        </motion.section>
      </div>

      {/* ── Leave & WhatsApp ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        {leaveStats !== null && (
          <motion.section variants={fadeUp} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
              <h2 className="font-display flex items-center gap-2 text-base font-bold text-white/80">Leave Management</h2>
              <Link to="/hod/leaves" className="text-[11px] font-semibold text-accent-cyan/60 hover:text-accent-cyan">Manage</Link>
            </div>
            <div className="p-5">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Pending</p>
                  <p className="mt-1 font-mono text-2xl font-black text-white/80">{leaveStats.pending}</p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">Status</p>
                  <p className="mt-1 text-sm font-semibold text-accent-green">{leaveStats.pending > 0 ? 'Review needed' : 'Controlled'}</p>
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
                    <Link key={l.id} to={`/hod/leave-letter/${l.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-green/15 to-accent-cyan/10 text-white/70 font-bold text-sm">
                        {l.student_name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/60">{l.student_name}</p>
                        <p className="truncate text-xs text-white/25 mt-0.5">{l.department} | {l.leave_type} | {l.days_count}d</p>
                      </div>
                      <span className="rounded-lg bg-accent-cyan/8 px-2 py-1 text-[10px] font-semibold text-accent-cyan">Review</span>
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
              <h2 className="font-display flex items-center gap-2 text-base font-bold text-white/80">WhatsApp Broadcast</h2>
              <div className="flex items-center gap-1.5 rounded-lg bg-accent-green/8 px-2.5 py-1">
                <SignalIcon className="h-3 w-3 text-accent-green" />
                <span className="text-[11px] font-semibold text-accent-green">{waStatus.status}</span>
              </div>
            </div>
            <div className="p-5">
              {waStatus.status === 'qr' && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-white/35 text-center">Scan QR to link WhatsApp for alerts.</p>
                  <div className="rounded-xl bg-white p-3"><img src={waStatus.qr} alt="QR" className="h-52 w-52 rounded-lg" /></div>
                </div>
              )}
              {(waStatus.status === 'not_started' || waStatus.status === 'connecting') && (
                <div className="py-8 text-center">
                  <p className="text-sm text-white/35 mb-4">{waStatus.status === 'connecting' ? 'Connecting... QR will appear.' : 'WhatsApp not connected.'}</p>
                  {waStatus.status === 'not_started' && <button onClick={handleWAConnect} className="btn btn-primary">Connect WhatsApp</button>}
                </div>
              )}
              {(waStatus.status === 'ready' || waStatus.status === 'ultramsg') && (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                  <p className="text-sm text-white/40">Broadcast system connected and ready.</p>
                  <Link to="/hod/whatsapp-report" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-cyan/70 hover:text-accent-cyan">
                    Open WA Report <ArrowRightIcon className="h-3.5 w-3.5" />
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
