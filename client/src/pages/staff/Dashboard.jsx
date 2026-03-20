import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staffAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  DocumentTextIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
  ArrowTrendingUpIcon, ChartBarIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline'

export default function StaffDashboard() {
  const [stats, setStats] = useState({ pending:0, reviewed_today:0, approved:0, rejected:0 })
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { isDark } = useTheme()

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    try {
      const [sRes, rRes] = await Promise.all([staffAPI.getDashboard(), staffAPI.getPendingRequests()])
      setStats(sRes.data.data || {})
      setPendingRequests(rRes.data.data?.slice(0,5) || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const analytics = useMemo(() => {
    const total = (stats.approved||0) + (stats.rejected||0)
    return { total, approvalRate: total > 0 ? Math.round(((stats.approved||0)/total)*100) : 0 }
  }, [stats])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '🌤️ Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening'

  const statCards = [
    { label:'Pending Review',  value:stats.pending||0,         icon:ClockIcon,           gradient:'from-amber-400 to-orange-500',  shadow:'shadow-amber-500/30',  link:'/staff/requests' },
    { label:'Reviewed Today',  value:stats.reviewed_today||0,  icon:ArrowTrendingUpIcon, gradient:'from-sky-400 to-blue-600',      shadow:'shadow-blue-500/30'   },
    { label:'Approved',        value:stats.approved||0,        icon:CheckCircleIcon,     gradient:'from-emerald-400 to-green-600', shadow:'shadow-green-500/30'  },
    { label:'Rejected',        value:stats.rejected||0,        icon:XCircleIcon,         gradient:'from-rose-400 to-red-600',      shadow:'shadow-rose-500/30'   },
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
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-xl shadow-emerald-500/25"
      >
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-40 w-40 h-40 bg-white/5 rounded-full -mb-12" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold text-white">{user?.name || 'Staff'}</h1>
            <p className="text-white/55 text-xs mt-1">
              {stats.pending > 0 ? `${stats.pending} request${stats.pending>1?'s':''} awaiting your review` : '✅ All caught up — no pending requests'}
            </p>
          </div>
          <Link to="/staff/requests" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm w-fit">
            <ClockIcon className="w-4 h-4" /> Review Requests
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
        {/* Analytics */}
        {analytics.total > 0 && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
            className={`rounded-2xl shadow-sm border p-6 ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
          >
            <div className="flex items-center gap-2 mb-5">
              <ChartBarIcon className="w-5 h-5 text-emerald-500" />
              <h2 className={`font-bold ${isDark?'text-white':'text-gray-900'}`}>Review Performance</h2>
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className={isDark?'text-gray-400':'text-gray-600'}>Approval Rate</span>
                <span className={`font-bold ${analytics.approvalRate>=70?'text-emerald-500':analytics.approvalRate>=40?'text-amber-500':'text-red-500'}`}>{analytics.approvalRate}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDark?'bg-gray-700':'bg-gray-100'}`}>
                <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${analytics.approvalRate}%`}} transition={{duration:1,delay:0.5}}
                  style={{background: analytics.approvalRate>=70?'linear-gradient(90deg,#34d399,#10b981)':analytics.approvalRate>=40?'linear-gradient(90deg,#fbbf24,#f59e0b)':'linear-gradient(90deg,#f87171,#ef4444)'}}
                />
              </div>
              <p className={`text-xs mt-1.5 ${isDark?'text-gray-500':'text-gray-400'}`}>{analytics.total} total reviews</p>
            </div>
            <div className="flex items-end gap-3 h-24">
              {[{label:'Approved',value:stats.approved||0,color:'#10b981'},{label:'Rejected',value:stats.rejected||0,color:'#ef4444'},{label:'Pending',value:stats.pending||0,color:'#f59e0b'},{label:'Today',value:stats.reviewed_today||0,color:'#3b82f6'}].map(bar=>{
                const max=Math.max(stats.approved||0,stats.rejected||0,stats.pending||0,stats.reviewed_today||0,1)
                return (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-bold ${isDark?'text-gray-300':'text-gray-700'}`}>{bar.value}</span>
                    <motion.div className="w-full rounded-t-lg" initial={{scaleY:0}} animate={{scaleY:1}} transition={{duration:0.8,delay:0.6}}
                      style={{backgroundColor:bar.color,height:`${Math.max((bar.value/max)*100,6)}%`,minHeight:4,transformOrigin:'bottom'}}
                    />
                    <span className={`text-[10px] ${isDark?'text-gray-500':'text-gray-400'}`}>{bar.label}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Pending Requests list */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
          className={`rounded-2xl shadow-sm border overflow-hidden ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark?'border-gray-700':'border-gray-100'}`}>
            <h2 className={`font-bold flex items-center gap-2 ${isDark?'text-white':'text-gray-900'}`}>
              <ClockIcon className="w-4 h-4 text-amber-500" /> Pending Requests
            </h2>
            <Link to="/staff/requests" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-semibold">
              View All <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className={`divide-y ${isDark?'divide-gray-700/50':'divide-gray-50'}`}>
            {pendingRequests.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircleIcon className={`w-10 h-10 mx-auto mb-2 ${isDark?'text-gray-600':'text-gray-300'}`} />
                <p className={`text-sm ${isDark?'text-gray-400':'text-gray-500'}`}>All caught up!</p>
              </div>
            ) : pendingRequests.map(req => (
              <Link key={req.id} to={`/staff/review/${req.id}`}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${isDark?'hover:bg-gray-700/40':'hover:bg-gray-50'}`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-white bg-gradient-to-br from-emerald-400 to-teal-500 shadow">
                  {req.student_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${isDark?'text-gray-100':'text-gray-900'}`}>{req.event_name}</p>
                  <p className={`text-xs truncate ${isDark?'text-gray-500':'text-gray-400'}`}>{req.student_name} · {req.student_department}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Pending</span>
                  <p className={`text-[10px] mt-0.5 ${isDark?'text-gray-500':'text-gray-400'}`}>{new Date(req.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
