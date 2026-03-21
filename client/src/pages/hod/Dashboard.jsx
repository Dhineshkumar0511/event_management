import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { hodAPI, leaveAPI, whatsappAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  DocumentTextIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
  UsersIcon, MapPinIcon, ChartBarIcon, ArrowRightIcon,
  TrophyIcon, RocketLaunchIcon, InboxStackIcon,
} from '@heroicons/react/24/outline'

export default function HODDashboard() {
  const [stats, setStats] = useState({ pending_approval:0,approved_today:0,total_approved:0,total_rejected:0,active_events:0,total_students:0 })
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
    // Poll WA status every 5s so QR refreshes automatically
    waPollerRef.current = setInterval(fetchWAStatus, 5000)
    return () => clearInterval(waPollerRef.current)
  }, [])

  const fetchWAStatus = async () => {
    try {
      const res = await whatsappAPI.getStatus()
      setWaStatus(res.data.data)
    } catch { /* ignore */ }
  }

  const handleWAConnect = async () => {
    try { await whatsappAPI.connect() } catch { /* ignore */ }
    setTimeout(fetchWAStatus, 2000)
  }

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    try {
      const [aRes, pRes, lRes] = await Promise.all([
        hodAPI.getAnalytics(),
        hodAPI.getPendingApproval(),
        leaveAPI.getHodPending().catch(() => null),
      ])
      setStats(aRes.data.data || {})
      setPendingRequests(pRes.data.data?.slice(0,5) || [])
      if (lRes) {
        const leaves = lRes.data.data || []
        setLeaveStats({ pending: leaves.length, recent: leaves.slice(0, 4) })
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '🌤️ Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening'

  const approvalRate = stats.total_approved > 0 || stats.total_rejected > 0
    ? Math.round((stats.total_approved / ((stats.total_approved||0) + (stats.total_rejected||0))) * 100) : 0

  const statCards = [
    { label:'Pending Approval', value:stats.pending_approval||0,  icon:ClockIcon,        gradient:'from-amber-400 to-orange-500',  shadow:'shadow-amber-500/30',  link:'/hod/requests' },
    { label:'Approved Today',   value:stats.approved_today||0,    icon:CheckCircleIcon,  gradient:'from-emerald-400 to-green-600', shadow:'shadow-green-500/30'  },
    { label:'Active Events',    value:stats.active_events||0,     icon:MapPinIcon,       gradient:'from-sky-400 to-blue-600',      shadow:'shadow-blue-500/30',   link:'/hod/tracking' },
    { label:'Total Students',   value:stats.total_students||0,    icon:UsersIcon,        gradient:'from-violet-500 to-purple-600', shadow:'shadow-purple-500/30', link:'/hod/users' },
  ]

  if (loading) return (
    <div className="space-y-6">
      <div className="h-28 rounded-2xl skeleton" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="h-32 rounded-2xl skeleton" />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 shadow-xl shadow-purple-500/25"
      >
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
        <div className="absolute -bottom-12 left-48 w-40 h-40 bg-white/5 rounded-full" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm mb-1">{greeting}, HOD</p>
            <h1 className="text-2xl font-bold text-white">{user?.name || 'Head of Department'}</h1>
            <p className="text-white/55 text-xs mt-1">
              {stats.pending_approval > 0 ? `${stats.pending_approval} approval${stats.pending_approval>1?'s':''} pending — requires your attention` : '✅ No pending approvals'}
            </p>
          </div>
          <Link to="/hod/requests" className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm w-fit">
            <RocketLaunchIcon className="w-4 h-4" /> Review & Approve
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const W = card.link ? Link : 'div'
          return (
            <motion.div key={card.label} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.08 }}>
              <W to={card.link||undefined}
                className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow} block ${card.link?'hover:scale-[1.03] active:scale-[0.98]':''} transition-transform`}
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
          className={`rounded-2xl shadow-sm border overflow-hidden ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark?'border-gray-700':'border-gray-100'}`}>
            <h2 className={`font-bold flex items-center gap-2 ${isDark?'text-white':'text-gray-900'}`}>
              <ClockIcon className="w-4 h-4 text-amber-500" /> Pending Approvals
            </h2>
            <Link to="/hod/requests" className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 font-semibold">
              View All <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className={`divide-y ${isDark?'divide-gray-700/50':'divide-gray-50'}`}>
            {pendingRequests.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircleIcon className={`w-10 h-10 mx-auto mb-2 ${isDark?'text-gray-600':'text-gray-300'}`} />
                <p className={`text-sm ${isDark?'text-gray-400':'text-gray-500'}`}>No pending approvals</p>
              </div>
            ) : pendingRequests.map(req => (
              <Link key={req.id} to={`/hod/review/${req.id}`}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${isDark?'hover:bg-gray-700/40':'hover:bg-gray-50'}`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-white bg-gradient-to-br from-purple-400 to-violet-500 shadow">
                  {req.student_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${isDark?'text-gray-100':'text-gray-900'}`}>{req.event_name}</p>
                  <p className={`text-xs truncate ${isDark?'text-gray-500':'text-gray-400'}`}>{req.student_name} · {req.student_department}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Staff ✔</span>
                  <p className={`text-[10px] mt-0.5 ${isDark?'text-gray-500':'text-gray-400'}`}>{req.staff_reviewed_at ? new Date(req.staff_reviewed_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Analytics Overview */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
          className={`rounded-2xl shadow-sm border p-6 ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
        >
          <div className="flex items-center gap-2 mb-5">
            <ChartBarIcon className="w-5 h-5 text-purple-500" />
            <h2 className={`font-bold ${isDark?'text-white':'text-gray-900'}`}>Analytics Overview</h2>
          </div>
          <div className="space-y-4">
            {/* Approval Rate */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={isDark?'text-gray-400':'text-gray-600'}>Approval Rate</span>
                <span className={`font-bold ${approvalRate>=70?'text-emerald-500':approvalRate>=40?'text-amber-500':'text-red-500'}`}>{approvalRate}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDark?'bg-gray-700':'bg-gray-100'}`}>
                <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${approvalRate}%`}} transition={{duration:1.2,delay:0.5}}
                  style={{background:`linear-gradient(90deg, #a78bfa, #7c3aed)`}}
                />
              </div>
            </div>
            {/* Stats grid */}
            {[
              { label:'Total Approved', value:stats.total_approved||0, color:'text-emerald-500' },
              { label:'Total Rejected', value:stats.total_rejected||0, color:'text-red-500' },
              { label:'Active Events',  value:stats.active_events||0,  color:'text-blue-500'   },
              { label:'Students',       value:stats.total_students||0,  color:'text-purple-500' },
            ].map(item => (
              <div key={item.label} className={`flex items-center justify-between py-2.5 border-b ${isDark?'border-gray-700':'border-gray-50'} last:border-0`}>
                <span className={`text-sm ${isDark?'text-gray-400':'text-gray-600'}`}>{item.label}</span>
                <span className={`font-black text-lg ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
          {/* Quick links */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[
              { label:'Reports',  path:'/hod/reports',  from:'from-purple-500', to:'to-indigo-600' },
              { label:'Tracking', path:'/hod/tracking', from:'from-blue-500',   to:'to-cyan-600'   },
              { label:'Results',  path:'/hod/results',  from:'from-amber-400',  to:'to-orange-500' },
              { label:'Users',    path:'/hod/users',    from:'from-emerald-500',to:'to-teal-600'   },
            ].map(l => (
              <Link key={l.path} to={l.path}
                className={`text-center py-2 rounded-xl bg-gradient-to-r ${l.from} ${l.to} text-white text-xs font-bold hover:scale-[1.03] transition-transform shadow`}
              >{l.label}</Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Leave Management Widget */}
      {leaveStats !== null && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55 }}
          className={`rounded-2xl shadow-sm border overflow-hidden ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark?'border-gray-700':'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <h2 className={`font-bold flex items-center gap-2 ${isDark?'text-white':'text-gray-900'}`}>
                <InboxStackIcon className="w-4 h-4 text-indigo-500" /> Leave Management Overview
              </h2>
              {leaveStats.pending > 0 && (
                <span className="inline-flex items-center justify-center px-2 h-5 rounded-full bg-red-500 text-white text-[10px] font-black">
                  {leaveStats.pending} pending
                </span>
              )}
            </div>
            <Link to="/hod/leaves" className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 font-semibold">
              Manage All <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5">
            {leaveStats.recent.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircleIcon className={`w-9 h-9 mx-auto mb-2 ${isDark?'text-gray-600':'text-gray-300'}`} />
                <p className={`text-sm ${isDark?'text-gray-400':'text-gray-500'}`}>No leave requests pending HOD review</p>
              </div>
            ) : (
              <div className={`divide-y rounded-xl overflow-hidden border ${isDark?'divide-gray-700 border-gray-700':'divide-gray-50 border-gray-100'}`}>
                {leaveStats.recent.map(l => (
                  <Link key={l.id} to={`/hod/leave-letter/${l.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDark?'hover:bg-gray-700/40':'hover:bg-gray-50'}`}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-white bg-gradient-to-br from-indigo-400 to-purple-500 shadow">
                      {l.student_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate text-sm ${isDark?'text-gray-100':'text-gray-900'}`}>{l.student_name}</p>
                      <p className={`text-xs truncate ${isDark?'text-gray-500':'text-gray-400'}`}>
                        {l.department} · {l.leave_type} · {l.days_count}d
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">
                      Staff ✔
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* WhatsApp Notification Status */}
      {waStatus && waStatus.status !== 'disabled' && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}
          className={`rounded-2xl shadow-sm border overflow-hidden ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark?'border-gray-700':'border-gray-100'}`}>
            <h2 className={`font-bold flex items-center gap-2 ${isDark?'text-white':'text-gray-900'}`}>
              <span className="text-lg">💬</span> WhatsApp Notifications
            </h2>
            {(waStatus.status === 'ready' || waStatus.status === 'ultramsg') && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
              </span>
            )}
            {waStatus.status === 'connecting' && (
              <span className="text-xs text-amber-600 font-semibold">Initialising...</span>
            )}
          </div>
          <div className="p-5">
            {waStatus.status === 'ultramsg' && (
              <p className={`text-sm ${isDark?'text-gray-300':'text-gray-600'}`}>
                ✅ <strong>UltraMsg connected</strong> — ready to send. Use the <a href="/hod/whatsapp-report" className="text-emerald-500 font-semibold underline">WA Report</a> page to manually send reports.
              </p>
            )}
            {waStatus.status === 'ready' && (
              <p className={`text-sm ${isDark?'text-gray-300':'text-gray-600'}`}>
                ✅ WhatsApp is connected. Use the <a href="/hod/whatsapp-report" className="text-emerald-500 font-semibold underline">WA Report</a> page to send reports.
              </p>
            )}
            {waStatus.status === 'qr' && (
              <div className="flex flex-col items-center gap-4">
                <p className={`text-sm text-center ${isDark?'text-gray-300':'text-gray-600'}`}>
                  Scan this QR code with WhatsApp to enable notifications.<br/>
                  <span className="text-xs text-gray-400">Open WhatsApp → Linked Devices → Link a Device</span>
                </p>
                <div className="p-3 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-60 h-60 rounded-xl" />
                </div>
                <p className="text-xs text-gray-400">QR refreshes automatically. Scan once — stays connected forever.</p>
              </div>
            )}
            {(waStatus.status === 'not_started' || waStatus.status === 'connecting') && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className={`text-sm text-center ${isDark?'text-gray-300':'text-gray-600'}`}>
                  {waStatus.status === 'connecting' ? 'WhatsApp client is starting up, QR will appear shortly...' : 'WhatsApp client not started yet.'}
                </p>
                {waStatus.status === 'not_started' && (
                  <button onClick={handleWAConnect}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow hover:scale-[1.03] transition-transform"
                  >
                    Connect WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
