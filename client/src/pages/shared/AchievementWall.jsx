import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { MagnifyingGlassIcon, TrophyIcon, FunnelIcon } from '@heroicons/react/24/outline'

const RESULT_TYPES = [
  { value: '', label: 'All Results' },
  { value: 'winner', label: '🏆 Winner' },
  { value: 'runner_up', label: '🥈 Runner-Up' },
  { value: 'finalist', label: '🥉 Finalist' },
  { value: 'participated', label: '✅ Participated' },
  { value: 'special_mention', label: '⭐ Special Mention' },
  { value: 'other', label: '🎯 Other' },
]

const TYPE_CONFIG = {
  winner:          { emoji: '🏆', gradient: 'from-yellow-400 to-amber-500',  badge: 'bg-yellow-100 text-yellow-800',    darkBadge: 'bg-yellow-900/30 text-yellow-300' },
  runner_up:       { emoji: '🥈', gradient: 'from-gray-300 to-slate-400',    badge: 'bg-gray-100 text-gray-700',        darkBadge: 'bg-gray-700 text-gray-300' },
  finalist:        { emoji: '🥉', gradient: 'from-orange-400 to-amber-500',  badge: 'bg-orange-100 text-orange-700',    darkBadge: 'bg-orange-900/30 text-orange-300' },
  participated:    { emoji: '✅', gradient: 'from-blue-400 to-indigo-500',   badge: 'bg-blue-100 text-blue-700',        darkBadge: 'bg-blue-900/30 text-blue-300' },
  special_mention: { emoji: '⭐', gradient: 'from-purple-400 to-violet-500', badge: 'bg-purple-100 text-purple-700',    darkBadge: 'bg-purple-900/30 text-purple-300' },
  other:           { emoji: '🎯', gradient: 'from-teal-400 to-cyan-500',     badge: 'bg-teal-100 text-teal-700',        darkBadge: 'bg-teal-900/30 text-teal-300' },
}

export default function AchievementWall() {
  const { isDark } = useTheme()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState({ total: 0, winners: 0, departments: 0 })

  useEffect(() => { fetchAchievements() }, [filterType, page])

  const fetchAchievements = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tracking/achievements', {
        params: { result_type: filterType || undefined, search: search || undefined, page, limit: 24 }
      })
      const data = res.data.data || []
      setResults(data)
      const depts = new Set(data.map(r => r.student_department).filter(Boolean))
      setStats({
        total: data.length,
        winners: data.filter(r => r.result_type === 'winner' || r.result_type === 'runner_up').length,
        departments: depts.size
      })
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchAchievements()
  }

  const textMain = isDark ? 'text-white' : 'text-gray-900'
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500'
  const cardCls = isDark
    ? 'bg-gray-800/80 border border-gray-700/60 rounded-2xl'
    : 'bg-white border border-gray-100 rounded-2xl shadow-sm'

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <TrophyIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Achievement Wall</h1>
            <p className={`text-sm ${textSub}`}>Celebrating our students' event accomplishments</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Achievements', value: stats.total, emoji: '🎖️', gradient: 'from-violet-500 to-indigo-600' },
          { label: 'Winners & Runners-Up', value: stats.winners, emoji: '🏆', gradient: 'from-yellow-400 to-amber-500' },
          { label: 'Departments Active', value: stats.departments, emoji: '🏛️', gradient: 'from-emerald-500 to-teal-600' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`${cardCls} p-4 flex items-center gap-3`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-lg flex-shrink-0`}>
              {s.emoji}
            </div>
            <div>
              <p className={`text-xl font-black ${textMain}`}>{s.value}</p>
              <p className={`text-xs ${textSub}`}>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className={`${cardCls} p-4 mb-6`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <MagnifyingGlassIcon className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textSub}`} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by student or event name..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/30 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
          </form>
          <div className="flex items-center gap-2">
            <FunnelIcon className={`w-4 h-4 ${textSub} flex-shrink-0`} />
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
              className={`px-3 py-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {RESULT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {RESULT_TYPES.slice(1).map(t => (
            <button key={t.value} onClick={() => { setFilterType(filterType === t.value ? '' : t.value); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterType === t.value ? 'bg-amber-500 text-white border-amber-500' : isDark ? 'border-gray-600 text-gray-400 hover:border-amber-400' : 'border-gray-200 text-gray-500 hover:border-amber-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className={`${cardCls} p-16 text-center`}>
          <p className="text-4xl mb-3">🏆</p>
          <p className={`font-semibold text-lg ${textMain}`}>No achievements yet</p>
          <p className={`text-sm mt-1 ${textSub}`}>Verified results will appear here</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r, i) => {
              const cfg = TYPE_CONFIG[r.result_type] || TYPE_CONFIG.other
              return (
                <motion.div key={r.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className={`${cardCls} overflow-hidden hover:shadow-lg transition-shadow`}
                >
                  {/* Gradient bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />
                  <div className="p-5">
                    {/* Badge + emoji */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? cfg.darkBadge : cfg.badge}`}>
                        {cfg.emoji} {r.result_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      {(r.is_verified || r.verified_by_staff) && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>✓ Verified</span>
                      )}
                    </div>

                    {/* Event name */}
                    <h3 className={`font-bold text-base leading-snug mb-1 ${textMain}`}>{r.event_name}</h3>
                    <p className={`text-xs mb-3 ${textSub}`}>
                      {r.event_type?.replace(/\b\w/g, c => c.toUpperCase())} · {r.venue}
                    </p>

                    {/* Student */}
                    <div className={`flex items-center gap-2 p-2.5 rounded-xl mb-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {r.student_name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${textMain}`}>{r.student_name}</p>
                        <p className={`text-xs truncate ${textSub}`}>{r.student_department} · {r.year_of_study ? `Year ${r.year_of_study}` : ''}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {r.achievement_description && (
                      <p className={`text-xs leading-relaxed line-clamp-2 ${textSub}`}>{r.achievement_description}</p>
                    )}

                    {/* Date */}
                    <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(r.event_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {results.length > 0 && (
        <div className="flex justify-center gap-3 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${isDark ? 'border-gray-600 text-gray-300 disabled:opacity-40 hover:border-amber-400' : 'border-gray-200 text-gray-600 disabled:opacity-40 hover:border-amber-400'}`}
          >← Prev</button>
          <span className={`px-4 py-2 text-sm font-semibold ${textSub}`}>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={results.length < 24}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${isDark ? 'border-gray-600 text-gray-300 disabled:opacity-40 hover:border-amber-400' : 'border-gray-200 text-gray-600 disabled:opacity-40 hover:border-amber-400'}`}
          >Next →</button>
        </div>
      )}
    </div>
  )
}
