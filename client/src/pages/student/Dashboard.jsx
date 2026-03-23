import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentAPI, leaveAPI, featuresAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  DocumentPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  MapPinIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  TrophyIcon,
  BoltIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  CpuChipIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline'

const STATUS = {
  pending: { label: 'Pending', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800', darkBadge: 'bg-amber-900/30 text-amber-300' },
  staff_review: { label: 'Staff Review', dot: 'bg-cyan-400', badge: 'bg-cyan-100 text-cyan-800', darkBadge: 'bg-cyan-900/30 text-cyan-300' },
  hod_review: { label: 'HOD Review', dot: 'bg-sky-400', badge: 'bg-sky-100 text-sky-800', darkBadge: 'bg-sky-900/30 text-sky-300' },
  approved: { label: 'Approved', dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-800', darkBadge: 'bg-emerald-900/30 text-emerald-300' },
  rejected: { label: 'Rejected', dot: 'bg-rose-400', badge: 'bg-rose-100 text-rose-800', darkBadge: 'bg-rose-900/30 text-rose-300' },
  staff_rejected: { label: 'Rejected', dot: 'bg-rose-400', badge: 'bg-rose-100 text-rose-800', darkBadge: 'bg-rose-900/30 text-rose-300' },
}

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
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = data?.stats || {}
  const statCards = [
    { label: 'Total Requests', value: stats.total || 0, icon: DocumentTextIcon, gradient: 'from-cyan-400 via-sky-400 to-blue-500', link: '/student/my-requests' },
    { label: 'Pending', value: stats.pending || 0, icon: ClockIcon, gradient: 'from-amber-300 via-amber-400 to-orange-500', link: '/student/my-requests' },
    { label: 'Approved', value: stats.approved || 0, icon: CheckCircleIcon, gradient: 'from-emerald-300 via-teal-400 to-cyan-500', link: '/student/my-requests' },
    { label: 'Rejected', value: stats.rejected || 0, icon: XCircleIcon, gradient: 'from-rose-300 via-rose-400 to-red-500' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-[28px] skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-[24px] skeleton" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-[28px] skeleton" />
          <div className="h-72 rounded-[28px] skeleton" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] border border-cyan-300/10 bg-[linear-gradient(135deg,_rgba(8,28,45,0.98)_0%,_rgba(9,39,54,0.96)_48%,_rgba(10,67,62,0.9)_100%)] p-7 shadow-[0_32px_90px_rgba(2,8,23,0.34)]"
      >
        <div className="absolute inset-0 panel-grid opacity-40" />
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
              <CpuChipIcon className="h-4 w-4" />
              AI and Data Science Student Hub
            </div>
            <p className="mt-5 text-sm text-cyan-100/80">{greeting}</p>
            <h1 className="section-title mt-2 text-3xl font-bold text-white lg:text-4xl">
              {user?.name || 'Student'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
              Track OD requests, monitor approvals, submit outcomes, and stay connected to department events through a more modern academic workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/student/new-request" className="btn btn-primary">
                <DocumentPlusIcon className="h-4 w-4" />
                Create New Request
              </Link>
              <Link to="/student/calendar" className="btn btn-secondary">
                <CalendarIcon className="h-4 w-4" />
                View Event Calendar
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:min-w-[320px]">
            {[
              { label: 'Today', value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
              { label: 'Portal', value: 'Realtime' },
              { label: 'Focus', value: 'Approvals' },
              { label: 'Experience', value: 'Professional' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Wrapper = card.link ? Link : 'div'
          return (
            <motion.div key={card.label} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
              <Wrapper
                to={card.link || undefined}
                className={`group relative block overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br ${card.gradient} p-5 text-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-1`}
              >
                <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-900/65">{card.label}</p>
                    <p className="mt-3 text-4xl font-black">{card.value}</p>
                  </div>
                  <div className="rounded-2xl bg-white/25 p-3">
                    <card.icon className="h-6 w-6" />
                  </div>
                </div>
              </Wrapper>
            </motion.div>
          )
        })}
      </div>

      {leaveBalance && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`card p-5 ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Leave Balance</p>
                <h3 className={`section-title mt-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Academic Leave Overview</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                <ChartBarSquareIcon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[
                { label: 'Total', value: leaveBalance.total_allowed || 15, tone: 'text-cyan-300' },
                { label: 'Used', value: leaveBalance.used || 0, tone: 'text-amber-300' },
                { label: 'Remaining', value: (leaveBalance.total_allowed || 15) - (leaveBalance.used || 0), tone: 'text-emerald-300' },
              ].map((b) => (
                <div key={b.label} className={`rounded-3xl border p-4 text-center ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-3xl font-black ${b.tone}`}>{b.value}</div>
                  <div className={`mt-1 text-xs uppercase tracking-[0.24em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{b.label}</div>
                </div>
              ))}
            </div>
            <div className={`mt-5 h-3 w-full rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-400 to-sky-500 transition-all"
                style={{ width: `${Math.min(100, ((leaveBalance.used || 0) / (leaveBalance.total_allowed || 15)) * 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {data?.activeEvents?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {data.activeEvents.map(evt => {
            const lastCheckin = evt.last_checkin ? new Date(evt.last_checkin) : null
            const minutesSince = lastCheckin ? (Date.now() - lastCheckin.getTime()) / (1000 * 60) : null
            const interval = evt.checkin_interval_minutes || 180
            const isOverdue = minutesSince != null && minutesSince > interval
            return (
              <Link
                key={evt.id}
                to="/student/active-event"
                className={`block rounded-[28px] border p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-1 ${isOverdue ? 'border-rose-300/20 bg-gradient-to-r from-rose-500 to-red-500' : 'border-emerald-300/20 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <SignalIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/70">Live Event Tracking</p>
                    <p className="mt-1 text-lg font-semibold truncate">{evt.event_name}</p>
                    <p className="mt-1 text-sm text-white/80">
                      {isOverdue
                        ? `Check-in overdue. Last update was ${Math.round(minutesSince / 60)} hour(s) ago.`
                        : lastCheckin
                        ? `Last check-in ${Math.round(minutesSince)} minute(s) ago.`
                        : 'No check-in logged yet. Open the tracker now.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
                    {isOverdue ? 'Check In' : 'Track'}
                  </span>
                </div>
              </Link>
            )
          })}
        </motion.div>
      )}

      {data?.pendingResults?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {data.pendingResults.map(pr => {
            const days = pr.days_until_deadline
            const isOverdue = days != null && days < 0
            const isUrgent = days != null && days >= 0 && days <= 3
            return (
              <Link
                key={pr.id}
                to="/student/submit-result"
                className={`block rounded-[28px] border p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-1 ${isOverdue ? 'border-rose-300/20 bg-gradient-to-r from-rose-500 to-red-500' : isUrgent ? 'border-amber-300/20 bg-gradient-to-r from-amber-300 to-orange-500 text-slate-950' : 'border-cyan-300/20 bg-gradient-to-r from-cyan-400 to-blue-500'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isUrgent ? 'bg-slate-950/10' : 'bg-white/15'}`}>
                    {isOverdue ? <ExclamationTriangleIcon className="h-6 w-6" /> : <TrophyIcon className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold uppercase tracking-[0.24em] ${isUrgent ? 'text-slate-900/70' : 'text-white/70'}`}>Result Submission</p>
                    <p className="mt-1 text-lg font-semibold truncate">{pr.event_name}</p>
                    <p className={`mt-1 text-sm ${isUrgent ? 'text-slate-900/75' : 'text-white/80'}`}>
                      {isOverdue
                        ? `Submission is overdue by ${Math.abs(days)} day(s).`
                        : days != null
                        ? `Submit the result within ${days} day(s).`
                        : 'Post-event result is still pending.'}
                    </p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${isUrgent ? 'bg-slate-950/10' : 'bg-white/15'}`}>
                    Submit
                  </span>
                </div>
              </Link>
            )
          })}
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className={`card ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}>
          <div className={`flex items-center justify-between border-b px-5 py-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`section-title flex items-center gap-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ClockIcon className="h-5 w-5 text-cyan-300" />
              Recent Requests
            </h2>
            <Link to="/student/my-requests" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              View all
            </Link>
          </div>
          <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
            {data?.recentRequests?.length > 0 ? data.recentRequests.map(req => {
              const s = STATUS[req.status] || STATUS.pending
              return (
                <Link
                  key={req.id}
                  to={`/student/request/${req.id}`}
                  className={`flex items-center gap-3 px-5 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{req.event_name}</p>
                    <p className={`mt-1 flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(req.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? s.darkBadge : s.badge}`}>
                    {s.label}
                  </span>
                </Link>
              )
            }) : (
              <div className="py-14 text-center">
                <DocumentPlusIcon className={`mx-auto mb-3 h-10 w-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No requests yet</p>
                <Link to="/student/new-request" className="mt-2 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                  Create your first request
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={`card ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}>
          <div className={`border-b px-5 py-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`section-title flex items-center gap-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <CalendarIcon className="h-5 w-5 text-emerald-300" />
              Upcoming Events
            </h2>
          </div>
          <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
            {data?.upcomingEvents?.length > 0 ? data.upcomingEvents.map(event => {
              const d = new Date(event.event_start_date)
              return (
                <div key={event.id} className={`flex items-center gap-4 px-5 py-4 ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'} transition-colors`}>
                  <div className="flex h-14 w-14 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-[0_18px_45px_rgba(45,212,191,0.22)]">
                    <span className="text-[10px] font-black uppercase">{d.toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-lg font-black leading-none">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{event.event_name}</p>
                    {event.venue && (
                      <p className={`mt-1 flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        <MapPinIcon className="h-3 w-3" />
                        {event.venue}
                      </p>
                    )}
                  </div>
                </div>
              )
            }) : (
              <div className="py-14 text-center">
                <CalendarIcon className={`mx-auto mb-3 h-10 w-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No upcoming events</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <div className="mb-3 flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-amber-300" />
          <h2 className={`text-sm font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New OD Request', path: '/student/new-request', icon: DocumentPlusIcon, from: 'from-cyan-400', to: 'to-sky-500' },
            { label: 'My Requests', path: '/student/my-requests', icon: DocumentTextIcon, from: 'from-sky-400', to: 'to-blue-500' },
            { label: 'Event Calendar', path: '/student/calendar', icon: CalendarIcon, from: 'from-emerald-300', to: 'to-teal-500' },
            { label: 'Submit Result', path: '/student/submit-result', icon: TrophyIcon, from: 'from-amber-300', to: 'to-orange-500' },
          ].map(a => (
            <Link
              key={a.path}
              to={a.path}
              className={`flex items-center gap-3 rounded-[24px] bg-gradient-to-br ${a.from} ${a.to} px-4 py-4 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-1`}
            >
              <div className="rounded-2xl bg-white/30 p-2">
                <a.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {leaveStats !== null && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className={`card ${!isDark ? '!bg-white !border-slate-200 !shadow-[0_18px_50px_rgba(148,163,184,0.18)]' : ''}`}>
          <div className={`flex items-center justify-between border-b px-5 py-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`section-title flex items-center gap-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <InboxIcon className="h-5 w-5 text-cyan-300" />
              My Leave Summary
            </h2>
            <Link to="/student/leaves" className="flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              View all
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
              {[
                { label: 'Total', value: leaveStats.total, color: 'from-sky-400 to-cyan-500' },
                { label: 'Pending', value: leaveStats.pending, color: 'from-amber-300 to-orange-500' },
                { label: 'Approved', value: leaveStats.approved, color: 'from-emerald-300 to-teal-500' },
                { label: 'Days Off', value: leaveStats.days, color: 'from-lime-300 to-emerald-500' },
              ].map(s => (
                <div key={s.label} className={`rounded-[24px] bg-gradient-to-br ${s.color} p-4 text-slate-950 shadow-[0_14px_35px_rgba(15,23,42,0.16)]`}>
                  <p className="text-3xl font-black">{s.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-900/70">{s.label}</p>
                </div>
              ))}
            </div>
            {leaveStats.recent.length > 0 ? (
              <div className={`overflow-hidden rounded-[24px] border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
                  {leaveStats.recent.map(l => (
                    <Link
                      key={l.id}
                      to={`/student/leave-letter/${l.id}`}
                      className={`flex items-center gap-3 px-4 py-3 ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'} transition-colors`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${l.status === 'approved' ? 'bg-emerald-400' : l.status === 'pending' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                      <span className={`flex-1 truncate text-sm font-medium capitalize ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {l.leave_type} - {l.days_count} day(s)
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        l.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : l.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}>
                        {l.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Link to="/student/leaves/new" className="btn btn-primary">
                  <DocumentPlusIcon className="h-4 w-4" />
                  Apply for Leave
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
