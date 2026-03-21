import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentAPI, leaveAPI, featuresAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  DocumentPlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
  CalendarIcon, MapPinIcon, ArrowRightIcon, DocumentTextIcon,
  TrophyIcon, BoltIcon, SignalIcon, ExclamationTriangleIcon, InboxIcon,
} from '@heroicons/react/24/outline'

const STATUS = {
  pending:        { label: 'Pending',      dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-800',    darkBadge: 'bg-amber-900/30 text-amber-300' },
  staff_review:   { label: 'Staff Review', dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-800',      darkBadge: 'bg-blue-900/30 text-blue-300' },
  hod_review:     { label: 'HOD Review',   dot: 'bg-indigo-400',  badge: 'bg-indigo-100 text-indigo-800',  darkBadge: 'bg-indigo-900/30 text-indigo-300' },
  approved:       { label: 'Approved',     dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-800',darkBadge: 'bg-emerald-900/30 text-emerald-300' },
  rejected:       { label: 'Rejected',     dot: 'bg-red-400',     badge: 'bg-red-100 text-red-800',        darkBadge: 'bg-red-900/30 text-red-300' },
  staff_rejected: { label: 'Rejected',     dot: 'bg-red-400',     badge: 'bg-red-100 text-red-800',        darkBadge: 'bg-red-900/30 text-red-300' },
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
          rejected: leaves.filter(l => ['staff_rejected','rejected'].includes(l.status)).length,
          days: leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days_count || 0), 0),
          recent: leaves.slice(0, 3),
        })
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '🌤️ Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening'

  const stats = data?.stats || {}
  const statCards = [
    { label: 'Total Requests', value: stats.total || 0,    icon: DocumentTextIcon, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-purple-500/30', link: '/student/my-requests' },
    { label: 'Pending',        value: stats.pending || 0,  icon: ClockIcon,         gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30',  link: '/student/my-requests' },
    { label: 'Approved',       value: stats.approved || 0, icon: CheckCircleIcon,   gradient: 'from-emerald-400 to-green-600',shadow: 'shadow-green-500/30',  link: '/student/my-requests' },
    { label: 'Rejected',       value: stats.rejected || 0, icon: XCircleIcon,       gradient: 'from-rose-400 to-red-600',     shadow: 'shadow-rose-500/30' },
  ]

  if (loading) return (
    <div className="space-y-6">
      <div className="h-28 rounded-2xl skeleton" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_,i) => <div key={i} className="h-32 rounded-2xl skeleton" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6"><div className="h-64 rounded-2xl skeleton" /><div className="h-64 rounded-2xl skeleton" /></div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-xl shadow-purple-500/25"
      >
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-40 w-40 h-40 bg-white/5 rounded-full -mb-12" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold text-white">{user?.name || 'Student'}</h1>
            <p className="text-white/55 text-xs mt-1">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <Link to="/student/new-request" className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm w-fit">
            <DocumentPlusIcon className="w-4 h-4" /> New OD Request
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const W = card.link ? Link : 'div'
          return (
            <motion.div key={card.label} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.08 }}>
              <W to={card.link || undefined}
                className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow} block ${ card.link ? 'hover:scale-[1.03] active:scale-[0.98]' : ''} transition-transform`}
              >
                <div className="absolute right-2 top-1 text-white/15 pointer-events-none"><card.icon className="w-16 h-16" /></div>
                <div className="absolute -bottom-3 -right-3 w-20 h-20 bg-white/10 rounded-full" />
                <div className="relative z-10">
                  <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">{card.label}</p>
                  <p className="text-4xl font-black text-white mt-1.5">{card.value}</p>
                </div>
              </W>
            </motion.div>
          )
        })}
      </div>

      {/* Leave Balance */}
      {leaveBalance && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className={`rounded-2xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leave Balance</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total', value: leaveBalance.total_allowed || 15, color: 'text-blue-500' },
                { label: 'Used', value: leaveBalance.used || 0, color: 'text-orange-500' },
                { label: 'Remaining', value: (leaveBalance.total_allowed || 15) - (leaveBalance.used || 0), color: 'text-green-500' },
              ].map(b => (
                <div key={b.label} className="text-center">
                  <div className={`text-2xl font-black ${b.color}`}>{b.value}</div>
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{b.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, ((leaveBalance.used || 0) / (leaveBalance.total_allowed || 15)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Events Alert */}
      {data?.activeEvents?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="space-y-3">
            {data.activeEvents.map(evt => {
              const lastCheckin = evt.last_checkin ? new Date(evt.last_checkin) : null
              const minutesSince = lastCheckin ? (Date.now() - lastCheckin.getTime()) / (1000 * 60) : null
              const interval = evt.checkin_interval_minutes || 180
              const isOverdue = minutesSince != null && minutesSince > interval
              return (
                <Link key={evt.id} to="/student/active-event"
                  className={`flex items-center gap-4 p-4 rounded-2xl shadow-lg transition-all hover:scale-[1.01] ${
                    isOverdue
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30'
                  } text-white`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <SignalIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{evt.event_name}</p>
                    <p className="text-xs text-white/80">
                      {isOverdue ? `Check-in overdue — last was ${Math.round(minutesSince / 60)}h ago`
                       : lastCheckin ? `Last check-in ${Math.round(minutesSince)}m ago`
                       : 'No check-ins yet — check in now!'}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 bg-white/20 rounded-xl text-xs font-bold flex-shrink-0">
                    {isOverdue ? 'Check In Now' : 'Track'}
                  </span>
                </Link>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Pending Results Alert */}
      {data?.pendingResults?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="space-y-3">
            {data.pendingResults.map(pr => {
              const days = pr.days_until_deadline
              const isOverdue = days != null && days < 0
              const isUrgent = days != null && days >= 0 && days <= 3
              return (
                <Link key={pr.id} to="/student/submit-result"
                  className={`flex items-center gap-4 p-4 rounded-2xl shadow-lg transition-all hover:scale-[1.01] ${
                    isOverdue ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30'
                    : isUrgent ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-500/30'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-purple-500/30'
                  } text-white`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    {isOverdue ? <ExclamationTriangleIcon className="w-5 h-5" /> : <TrophyIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{pr.event_name}</p>
                    <p className="text-xs text-white/80">
                      {isOverdue ? `Result ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue!`
                       : days != null ? `Submit result within ${days} day${days !== 1 ? 's' : ''}`
                       : 'Post-event result pending'}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 bg-white/20 rounded-xl text-xs font-bold flex-shrink-0">
                    Submit Result
                  </span>
                </Link>
              )
            })}
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
          className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <h2 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <ClockIcon className="w-4 h-4 text-purple-500" /> Recent Requests
            </h2>
            <Link to="/student/my-requests" className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 font-semibold">
              View all <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-50'}`}>
            {data?.recentRequests?.length > 0 ? data.recentRequests.map(req => {
              const s = STATUS[req.status] || STATUS.pending
              return (
                <Link key={req.id} to={`/student/request/${req.id}`}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors ${isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50/80'}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{req.event_name}</p>
                    <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <CalendarIcon className="w-3 h-3" />{new Date(req.event_start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${isDark ? s.darkBadge : s.badge}`}>{s.label}</span>
                </Link>
              )
            }) : (
              <div className="py-12 text-center">
                <DocumentPlusIcon className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No requests yet</p>
                <Link to="/student/new-request" className="text-purple-600 hover:underline text-xs mt-1 inline-block">Create your first</Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
          className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
        >
          <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <h2 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <CalendarIcon className="w-4 h-4 text-indigo-500" /> Upcoming Events
            </h2>
          </div>
          <div className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-50'}`}>
            {data?.upcomingEvents?.length > 0 ? data.upcomingEvents.map(event => {
              const d = new Date(event.event_start_date)
              return (
                <div key={event.id} className={`flex items-center gap-4 px-5 py-3 ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'} transition-colors`}>
                  <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow">
                    <span className="text-[9px] font-black uppercase opacity-80">{d.toLocaleDateString('en',{month:'short'})}</span>
                    <span className="text-lg font-black leading-none">{d.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{event.event_name}</p>
                    {event.venue && <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}><MapPinIcon className="w-3 h-3" />{event.venue}</p>}
                  </div>
                </div>
              )
            }) : (
              <div className="py-12 text-center">
                <CalendarIcon className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No upcoming events</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}>
        <h2 className={`font-bold mb-3 flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <BoltIcon className="w-4 h-4 text-yellow-500" /> QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New OD Request',  path:'/student/new-request',   icon: DocumentPlusIcon, from:'from-violet-500', to:'to-purple-600'  },
            { label: 'My Requests',     path:'/student/my-requests',   icon: DocumentTextIcon, from:'from-blue-500',   to:'to-indigo-600'  },
            { label: 'Event Calendar',  path:'/student/calendar',      icon: CalendarIcon,     from:'from-teal-500',   to:'to-cyan-600'    },
            { label: 'Submit Result',   path:'/student/submit-result', icon: TrophyIcon,       from:'from-amber-400',  to:'to-orange-500'  },
          ].map(a => (
            <Link key={a.path} to={a.path}
              className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${a.from} ${a.to} text-white hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] transition-all shadow-md`}
            >
              <a.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-bold text-sm leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Leave Overview */}
      {leaveStats !== null && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55 }}
          className={`rounded-2xl shadow-sm border overflow-hidden ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark?'border-gray-700':'border-gray-100'}`}>
            <h2 className={`font-bold flex items-center gap-2 ${isDark?'text-white':'text-gray-900'}`}>
              <InboxIcon className="w-4 h-4 text-indigo-500" /> My Leave Summary
            </h2>
            <Link to="/student/leaves" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold">
              View All <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label:'Total', value: leaveStats.total,    color:'from-indigo-400 to-purple-500' },
                { label:'Pending', value: leaveStats.pending,  color:'from-amber-400 to-orange-500' },
                { label:'Approved', value: leaveStats.approved, color:'from-emerald-400 to-green-500' },
                { label:'Days Off', value: leaveStats.days,     color:'from-sky-400 to-blue-500' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl bg-gradient-to-br ${s.color} p-3 text-center shadow`}>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {leaveStats.recent.length > 0 ? (
              <div className={`divide-y ${isDark?'divide-gray-700':'divide-gray-50'} rounded-xl overflow-hidden border ${isDark?'border-gray-700':'border-gray-100'}`}>
                {leaveStats.recent.map(l => (
                  <Link key={l.id} to={`/student/leave-letter/${l.id}`}
                    className={`flex items-center gap-3 px-4 py-2.5 ${isDark?'hover:bg-gray-700/40':'hover:bg-gray-50'} transition-colors`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      l.status==='approved'?'bg-emerald-400':l.status==='pending'?'bg-amber-400':'bg-red-400'
                    }`} />
                    <span className={`flex-1 text-sm font-medium capitalize truncate ${isDark?'text-gray-200':'text-gray-800'}`}>
                      {l.leave_type} — {l.days_count}d
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      l.status==='approved'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300':
                      l.status==='pending'?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300':
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>{l.status.replace(/_/g,' ')}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Link to="/student/leaves/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <DocumentPlusIcon className="w-4 h-4" /> Apply for Leave
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

const StatCard = ({ icon: Icon, title, value, color, bgColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6"
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </motion.div>
)

const statusColors = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  staff_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Staff Review' },
  hod_review: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'HOD Review' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  staff_rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
}
