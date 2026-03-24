import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentAPI, leaveAPI, featuresAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  DocumentPlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
  CalendarIcon, MapPinIcon, DocumentTextIcon, TrophyIcon,
  BoltIcon, SignalIcon, ExclamationTriangleIcon, InboxIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline'

const STATUS = {
  pending: { label: 'Pending', dot: 'bg-accent-amber', glow: 'shadow-[0_0_8px_rgba(255,190,11,0.4)]' },
  staff_review: { label: 'Staff Review', dot: 'bg-accent-cyan', glow: 'shadow-[0_0_8px_rgba(0,229,255,0.4)]' },
  hod_review: { label: 'HOD Review', dot: 'bg-accent-purple', glow: 'shadow-[0_0_8px_rgba(139,92,246,0.4)]' },
  approved: { label: 'Approved', dot: 'bg-accent-green', glow: 'shadow-[0_0_8px_rgba(0,245,160,0.4)]' },
  rejected: { label: 'Rejected', dot: 'bg-accent-magenta', glow: 'shadow-[0_0_8px_rgba(244,63,138,0.4)]' },
  staff_rejected: { label: 'Rejected', dot: 'bg-accent-magenta', glow: 'shadow-[0_0_8px_rgba(244,63,138,0.4)]' },
}

const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function StudentDashboard() {
  const [data, setData] = useState(null)
  const [leaveStats, setLeaveStats] = useState(null)
  const [leaveBalance, setLeaveBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { isDark } = useTheme()

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    try {
      const [response, lRes, balRes] = await Promise.all([
        studentAPI.getDashboard(),
        leaveAPI.getMyLeaves({ limit: 100 }).catch(() => null),
        featuresAPI.getLeaveBalance().catch(() => null),
      ])
      setData(response.data.data)
      if (balRes?.data?.data) setLeaveBalance(balRes.data.data)
      if (lRes) {
        const leaves = lRes.data.data || []
        setLeaveStats({
          total: leaves.length,
          pending: leaves.filter(l => l.status === 'pending').length,
          approved: leaves.filter(l => l.status === 'approved').length,
          rejected: leaves.filter(l => ['staff_rejected', 'rejected'].includes(l.status)).length,
          days: leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days_count || 0), 0),
          recent: leaves.slice(0, 3),
        })
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const stats = data?.stats || {}

  const statCards = [
    { label: 'Total', value: stats.total || 0, icon: DocumentTextIcon, gradient: 'from-accent-cyan/20 to-accent-purple/20', border: 'border-accent-cyan/10', accent: 'text-accent-cyan', link: '/student/my-requests' },
    { label: 'Pending', value: stats.pending || 0, icon: ClockIcon, gradient: 'from-accent-amber/20 to-accent-amber/5', border: 'border-accent-amber/10', accent: 'text-accent-amber', link: '/student/my-requests' },
    { label: 'Approved', value: stats.approved || 0, icon: CheckCircleIcon, gradient: 'from-accent-green/20 to-accent-cyan/10', border: 'border-accent-green/10', accent: 'text-accent-green', link: '/student/my-requests' },
    { label: 'Rejected', value: stats.rejected || 0, icon: XCircleIcon, gradient: 'from-accent-magenta/20 to-accent-magenta/5', border: 'border-accent-magenta/10', accent: 'text-accent-magenta' },
  ]

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-40 skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="h-64 skeleton" /><div className="h-64 skeleton" />
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">

      {/* ── Hero Banner ── */}
      <motion.div variants={fadeUp}
        className="neural-grid scanline relative overflow-hidden rounded-2xl border border-accent-cyan/8 bg-gradient-to-br from-neural-surface via-neural-elevated/50 to-neural-surface p-6 lg:p-7"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent-purple/8 blur-[80px]" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-accent-cyan/6 blur-[60px]" />

        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/15 bg-accent-cyan/[0.04] px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-glow-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-cyan/60">Student Neural Hub</span>
            </div>
            <p className="mt-4 text-sm text-white/30">{greeting}</p>
            <h1 className="font-display text-3xl lg:text-4xl font-black gradient-text mt-1">
              {user?.name || 'Student'}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/35">
              Track OD requests, monitor approvals, submit outcomes, and stay connected through the AI & Data Science workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/student/new-request" className="btn btn-primary text-sm">
                <DocumentPlusIcon className="h-4 w-4" /> New Request
              </Link>
              <Link to="/student/calendar" className="btn btn-secondary text-sm">
                <CalendarIcon className="h-4 w-4" /> Calendar
              </Link>
            </div>
          </div>

          <div className="hidden xl:grid grid-cols-2 gap-3 min-w-[260px]">
            {[
              { label: 'Today', value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
              { label: 'Status', value: 'Online' },
              { label: 'Mode', value: 'Real-time' },
              { label: 'Dept', value: 'AI & DS' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">{item.label}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white/60">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => {
          const Wrapper = card.link ? Link : 'div'
          return (
            <motion.div key={card.label} variants={fadeUp}>
              <Wrapper
                to={card.link || undefined}
                className={`group relative block overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.gradient} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-neural`}
              >
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/[0.03] blur-xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] ${card.accent}`}>
                      <card.icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="font-mono text-3xl font-black text-white/90">{card.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">{card.label}</p>
                </div>
              </Wrapper>
            </motion.div>
          )
        })}
      </div>

      {/* ── Leave Balance ── */}
      {leaveBalance && (
        <motion.div variants={fadeUp} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">Leave System</p>
              <h3 className="font-display text-lg font-bold text-white/80 mt-1">Academic Leave Balance</h3>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple">
              <ChartBarSquareIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total', value: leaveBalance.total_allowed || 15, color: 'text-accent-cyan' },
              { label: 'Used', value: leaveBalance.used || 0, color: 'text-accent-amber' },
              { label: 'Remaining', value: (leaveBalance.total_allowed || 15) - (leaveBalance.used || 0), color: 'text-accent-green' },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                <div className={`font-mono text-2xl font-black ${b.color}`}>{b.value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/20">{b.label}</div>
              </div>
            ))}
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-green via-accent-cyan to-accent-purple"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((leaveBalance.used || 0) / (leaveBalance.total_allowed || 15)) * 100)}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* ── Active Events ── */}
      {data?.activeEvents?.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-2">
          {data.activeEvents.map(evt => {
            const lastCheckin = evt.last_checkin ? new Date(evt.last_checkin) : null
            const minutesSince = lastCheckin ? (Date.now() - lastCheckin.getTime()) / (1000 * 60) : null
            const interval = evt.checkin_interval_minutes || 180
            const isOverdue = minutesSince != null && minutesSince > interval
            return (
              <Link key={evt.id} to="/student/active-event"
                className={`block rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
                  isOverdue
                    ? 'border-danger-500/15 bg-gradient-to-r from-danger-500/10 to-accent-magenta/5'
                    : 'border-accent-cyan/12 bg-gradient-to-r from-accent-cyan/8 to-accent-purple/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${isOverdue ? 'bg-danger-500/15 text-danger-400' : 'bg-accent-cyan/15 text-accent-cyan'}`}>
                    <SignalIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">Live Tracking</p>
                    <p className="text-base font-semibold text-white/80 truncate mt-0.5">{evt.event_name}</p>
                    <p className="text-sm text-white/35 mt-0.5">
                      {isOverdue ? `Check-in overdue. Last was ${Math.round(minutesSince / 60)}h ago.` : lastCheckin ? `Last check-in ${Math.round(minutesSince)}m ago.` : 'No check-in yet.'}
                    </p>
                  </div>
                  <span className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${isOverdue ? 'bg-danger-500/10 text-danger-400' : 'bg-accent-cyan/10 text-accent-cyan'}`}>
                    {isOverdue ? 'Check In' : 'Track'}
                  </span>
                </div>
              </Link>
            )
          })}
        </motion.div>
      )}

      {/* ── Pending Results ── */}
      {data?.pendingResults?.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-2">
          {data.pendingResults.map(pr => {
            const days = pr.days_until_deadline
            const isOverdue = days != null && days < 0
            const isUrgent = days != null && days >= 0 && days <= 3
            return (
              <Link key={pr.id} to="/student/submit-result"
                className={`block rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
                  isOverdue ? 'border-danger-500/15 bg-gradient-to-r from-danger-500/10 to-accent-magenta/5'
                  : isUrgent ? 'border-accent-amber/15 bg-gradient-to-r from-accent-amber/8 to-accent-amber/3'
                  : 'border-accent-purple/12 bg-gradient-to-r from-accent-purple/8 to-accent-cyan/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${isOverdue ? 'bg-danger-500/15 text-danger-400' : 'bg-accent-amber/15 text-accent-amber'}`}>
                    {isOverdue ? <ExclamationTriangleIcon className="h-5 w-5" /> : <TrophyIcon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">Result Submission</p>
                    <p className="text-base font-semibold text-white/80 truncate mt-0.5">{pr.event_name}</p>
                    <p className="text-sm text-white/35 mt-0.5">
                      {isOverdue ? `Overdue by ${Math.abs(days)} day(s).` : days != null ? `Submit within ${days} day(s).` : 'Result pending.'}
                    </p>
                  </div>
                  <span className="rounded-lg bg-accent-amber/10 px-3 py-1.5 text-[11px] font-semibold text-accent-amber">Submit</span>
                </div>
              </Link>
            )
          })}
        </motion.div>
      )}

      {/* ── Recent Requests & Upcoming Events ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div variants={fadeUp} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
            <h2 className="font-display flex items-center gap-2 text-base font-bold text-white/80">
              <ClockIcon className="h-4 w-4 text-accent-cyan" /> Recent Requests
            </h2>
            <Link to="/student/my-requests" className="text-[11px] font-semibold text-accent-cyan/60 hover:text-accent-cyan transition-colors">View all</Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {data?.recentRequests?.length > 0 ? data.recentRequests.map(req => {
              const s = STATUS[req.status] || STATUS.pending
              return (
                <Link key={req.id} to={`/student/request/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                  <span className={`h-2 w-2 rounded-full ${s.dot} ${s.glow}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/70">{req.event_name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/25">
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(req.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${s.dot === 'bg-accent-green' ? 'bg-accent-green/8 text-accent-green' : s.dot === 'bg-accent-magenta' ? 'bg-accent-magenta/8 text-accent-magenta' : s.dot === 'bg-accent-amber' ? 'bg-accent-amber/8 text-accent-amber' : 'bg-accent-cyan/8 text-accent-cyan'}`}>
                    {s.label}
                  </span>
                </Link>
              )
            }) : (
              <div className="py-12 text-center">
                <DocumentPlusIcon className="mx-auto mb-2 h-8 w-8 text-white/10" />
                <p className="text-sm text-white/25">No requests yet</p>
                <Link to="/student/new-request" className="mt-2 inline-block text-sm font-medium text-accent-cyan/60 hover:text-accent-cyan">Create first request</Link>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="card overflow-hidden">
          <div className="border-b border-white/[0.04] px-5 py-4">
            <h2 className="font-display flex items-center gap-2 text-base font-bold text-white/80">
              <CalendarIcon className="h-4 w-4 text-accent-green" /> Upcoming Events
            </h2>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {data?.upcomingEvents?.length > 0 ? data.upcomingEvents.map(event => {
              const d = new Date(event.event_start_date)
              return (
                <div key={event.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-accent-green/15 to-accent-cyan/10 border border-accent-green/10">
                    <span className="text-[9px] font-black uppercase text-accent-green/70">{d.toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-lg font-black leading-none text-white/80">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/70">{event.event_name}</p>
                    {event.venue && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-white/25">
                        <MapPinIcon className="h-3 w-3" /> {event.venue}
                      </p>
                    )}
                  </div>
                </div>
              )
            }) : (
              <div className="py-12 text-center">
                <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-white/10" />
                <p className="text-sm text-white/25">No upcoming events</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div variants={fadeUp}>
        <div className="mb-3 flex items-center gap-2">
          <BoltIcon className="h-4 w-4 text-accent-amber" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/25">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'New OD', path: '/student/new-request', icon: DocumentPlusIcon, color: 'from-accent-cyan/15 to-accent-purple/10', border: 'border-accent-cyan/10', accent: 'text-accent-cyan' },
            { label: 'My Requests', path: '/student/my-requests', icon: DocumentTextIcon, color: 'from-accent-purple/15 to-accent-purple/5', border: 'border-accent-purple/10', accent: 'text-accent-purple' },
            { label: 'Calendar', path: '/student/calendar', icon: CalendarIcon, color: 'from-accent-green/15 to-accent-cyan/5', border: 'border-accent-green/10', accent: 'text-accent-green' },
            { label: 'Results', path: '/student/submit-result', icon: TrophyIcon, color: 'from-accent-amber/15 to-accent-amber/5', border: 'border-accent-amber/10', accent: 'text-accent-amber' },
          ].map(a => (
            <Link key={a.path} to={a.path}
              className={`flex items-center gap-3 rounded-xl border ${a.border} bg-gradient-to-br ${a.color} px-4 py-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-neural`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] ${a.accent}`}>
                <a.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-white/70">{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Leave Summary ── */}
      {leaveStats !== null && (
        <motion.div variants={fadeUp} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
            <h2 className="font-display flex items-center gap-2 text-base font-bold text-white/80">
              <InboxIcon className="h-4 w-4 text-accent-cyan" /> Leave Summary
            </h2>
            <Link to="/student/leaves" className="text-[11px] font-semibold text-accent-cyan/60 hover:text-accent-cyan transition-colors flex items-center gap-1">View all</Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 mb-4">
              {[
                { label: 'Total', value: leaveStats.total, color: 'text-accent-cyan' },
                { label: 'Pending', value: leaveStats.pending, color: 'text-accent-amber' },
                { label: 'Approved', value: leaveStats.approved, color: 'text-accent-green' },
                { label: 'Days Off', value: leaveStats.days, color: 'text-accent-purple' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                  <p className={`font-mono text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">{s.label}</p>
                </div>
              ))}
            </div>
            {leaveStats.recent.length > 0 ? (
              <div className="rounded-xl border border-white/[0.04] overflow-hidden divide-y divide-white/[0.03]">
                {leaveStats.recent.map(l => (
                  <Link key={l.id} to={`/student/leave-letter/${l.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className={`h-2 w-2 rounded-full ${l.status === 'approved' ? 'bg-accent-green shadow-[0_0_8px_rgba(0,245,160,0.4)]' : l.status === 'pending' ? 'bg-accent-amber shadow-[0_0_8px_rgba(255,190,11,0.4)]' : 'bg-accent-magenta shadow-[0_0_8px_rgba(244,63,138,0.4)]'}`} />
                    <span className="flex-1 truncate text-sm font-medium capitalize text-white/60">{l.leave_type} - {l.days_count} day(s)</span>
                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${l.status === 'approved' ? 'bg-accent-green/8 text-accent-green' : l.status === 'pending' ? 'bg-accent-amber/8 text-accent-amber' : 'bg-accent-magenta/8 text-accent-magenta'}`}>
                      {l.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Link to="/student/leaves/new" className="btn btn-primary">
                  <DocumentPlusIcon className="h-4 w-4" /> Apply for Leave
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
