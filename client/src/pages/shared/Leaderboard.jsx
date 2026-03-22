import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import { trackingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  TrophyIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  StarIcon,
  SparklesIcon,
  UserGroupIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  GiftIcon,
} from '@heroicons/react/24/outline'
import { TrophyIcon as TrophySolid } from '@heroicons/react/24/solid'

const RESULT_TYPES = [
  { value: '', label: 'All' },
  { value: 'winner', label: 'Winner' },
  { value: 'runner_up', label: 'Runner Up' },
  { value: 'special_mention', label: 'Special Award' },
  { value: 'finalist', label: 'Finalist' },
  { value: 'participated', label: 'Participated' },
  { value: 'other', label: 'Other' },
]

const FEATURED_TYPES = ['winner', 'runner_up', 'special_mention'] // For Achievement Wall

const TYPE_CONFIG = {
  winner:          { label: 'Winner',        bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: '🥇', rankBg: 'bg-gradient-to-br from-yellow-400 to-amber-500' },
  runner_up:       { label: 'Runner Up',     bg: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',            icon: '🥈', rankBg: 'bg-gradient-to-br from-gray-400 to-gray-500' },
  special_mention: { label: 'Special Award', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: '⭐', rankBg: 'bg-gradient-to-br from-purple-400 to-indigo-500' },
  finalist:        { label: 'Finalist',      bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',         icon: '🏅', rankBg: 'bg-gradient-to-br from-blue-400 to-blue-500' },
  participated:    { label: 'Participated',  bg: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',     icon: '🎖️', rankBg: 'bg-gradient-to-br from-green-400 to-emerald-500' },
  other:           { label: 'Other',         bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', icon: '📌', rankBg: 'bg-gradient-to-br from-indigo-400 to-indigo-500' },
}

const MEDAL_EMOJI = ['🥇', '🥈', '🥉']

const DEPARTMENTS = [
  '', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'MCE'
]

/* ═══════ Confetti / Flower particles ═══════ */
function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            fontSize: ['🎉', '🎊', '🌸', '✨', '🎁'][i % 5],
          }}
          animate={{
            y: window.innerHeight + 20,
            x: Math.sin(i) * 100,
            opacity: [1, 0],
            rotate: 360,
          }}
          transition={{
            duration: 2 + Math.random() * 1.5,
            delay: Math.random() * 0.3,
            ease: 'easeIn',
          }}
        >
          {['🎉', '🎊', '🌸', '✨', '🎁'][i % 5]}
        </motion.div>
      ))}
    </div>
  )
}

export default function Leaderboard() {
  const { isDark } = useTheme()
  const { user } = useAuthStore()
  const canDelete = user?.role === 'staff' || user?.role === 'hod'

  const [tab, setTab] = useState('leaderboard') // 'leaderboard' | 'achievement-wall'
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    try {
      // In Achievement Wall, don't set a default type filter - load all featured types
      // Only apply type filter if user explicitly selected one
      const typeFilter = filterType || undefined
      
      const res = await trackingAPI.getLeaderboard({
        result_type: typeFilter,
        department: filterDept || undefined,
        search: search || undefined,
        limit: 200,
      })
      let data = res.data.data || []
      
      // If in Achievement Wall, filter to only featured types if backend returned more types
      if (tab === 'achievement-wall') {
        data = data.filter(e => FEATURED_TYPES.includes(e.result_type))
      }
      
      if (sortDir === 'asc') data = [...data].reverse()
      setEntries(data)
      setTotal(res.data.total || data.length)
    } catch {
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [tab, filterType, filterDept, search, sortDir])

  useEffect(() => {
    const timer = setTimeout(fetchLeaderboard, 300)
    const interval = setInterval(fetchLeaderboard, 60000)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [fetchLeaderboard])

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(entries.map(e => e.id)))
    }
  }

  const handleDeleteOne = async (id) => {
    if (!window.confirm('Delete this result entry?')) return
    try {
      await trackingAPI.deleteResult(id)
      toast.success('Entry deleted')
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
      fetchLeaderboard()
    } catch {
      toast.error('Failed to delete entry')
    }
  }

  const handleDeleteBulk = async () => {
    const ids = [...selected]
    setDeleting(true)
    try {
      await trackingAPI.deleteResults(ids)
      toast.success(`${ids.length} entry(s) deleted`)
      setSelected(new Set())
      setConfirmBulk(false)
      fetchLeaderboard()
    } catch {
      toast.error('Failed to delete entries')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      const ids = entries.map(e => e.id)
      if (!ids.length) { toast.error('No entries to delete'); setDeleting(false); return }
      await trackingAPI.deleteResults(ids)
      toast.success(`${ids.length} entry(s) deleted`)
      setSelected(new Set())
      setConfirmDeleteAll(false)
      fetchLeaderboard()
    } catch {
      toast.error('Failed to delete all entries')
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCSV = () => {
    if (!entries.length) return toast.error('No data to export')
    const headers = ['Rank', 'Student Name', 'Register No', 'Department', 'Year', 'Section', 'Event Name', 'Result', 'Prize Amount', 'Date', 'Verified']
    const rows = entries.map((e, i) => [
      i + 1,
      e.student_name,
      e.register_number,
      e.student_department,
      e.year_of_study || '',
      e.section || '',
      e.event_name,
      TYPE_CONFIG[e.result_type]?.label || e.result_type,
      e.prize_amount ? `₹${e.prize_amount}` : '-',
      e.event_start_date ? new Date(e.event_start_date).toLocaleDateString('en-IN') : '',
      e.is_verified ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leaderboard_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const cardBase = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'

  return (
    <div className="space-y-6">
      {/* Confetti for Achievement Wall */}
      {tab === 'achievement-wall' && <Confetti />}

      {/* Tab selector */}
      <div className="flex justify-center">
        <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200/70'}`}>
          {[
            { id: 'leaderboard', label: 'Leaderboard', icon: TrophySolid },
            { id: 'achievement-wall', label: 'Achievement Wall', icon: GiftIcon },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setFilterType(''); }}
              className={`relative flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/20'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {tab === 'achievement-wall' ? (
              <>
                <GiftIcon className="w-7 h-7 text-purple-500" />
                Achievement Wall
              </>
            ) : (
              <>
                <TrophySolid className="w-7 h-7 text-yellow-500" />
                Leaderboard
              </>
            )}
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {tab === 'achievement-wall' 
              ? (total > 0 ? `${total} featured achievement${total !== 1 ? 's' : ''} · 🌸 celebration mode` : 'No achievements yet')
              : (`${total} result${total !== 1 ? 's' : ''} · sorted by achievement & prize`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && selected.size > 0 && (
            <button
              onClick={() => setConfirmBulk(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <TrashIcon className="w-4 h-4" />
              Delete {selected.size}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <TrashIcon className="w-4 h-4" />
              Delete All
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-2xl border p-4 ${cardBase} space-y-3`}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search student or event..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-400'
              }`}
            />
          </div>
          {/* Dept filter */}
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {/* Sort toggle */}
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Prize {sortDir === 'desc' ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
          </button>
        </div>
        {/* Type tabs */}
        <div className="flex flex-wrap gap-2">
          {(tab === 'achievement-wall' 
            ? RESULT_TYPES.filter(t => t.value === '' || FEATURED_TYPES.includes(t.value))
            : RESULT_TYPES
          ).map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterType === t.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.value && TYPE_CONFIG[t.value] ? `${TYPE_CONFIG[t.value].icon} ` : ''}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary row */}
      {!loading && entries.length > 0 && (() => {
        const counts = {}
        let totalPrize = 0
        entries.forEach(e => {
          counts[e.result_type] = (counts[e.result_type] || 0) + 1
          totalPrize += parseFloat(e.prize_amount || 0)
        })
        const topTypes = ['winner', 'runner_up', 'special_mention'].filter(t => counts[t])
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topTypes.map(t => (
              <div key={t} className={`rounded-xl p-3 border ${cardBase} text-center`}>
                <div className="text-2xl mb-1">{TYPE_CONFIG[t].icon}</div>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{counts[t]}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{TYPE_CONFIG[t].label}</div>
              </div>
            ))}
            {totalPrize > 0 && (
              <div className={`rounded-xl p-3 border ${cardBase} text-center`}>
                <div className="text-2xl mb-1">💰</div>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{totalPrize.toLocaleString('en-IN')}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Prizes</div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Achievement Wall Gallery View */}
      {tab === 'achievement-wall' ? (
        loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-10 w-10 border-3 border-yellow-500 border-t-transparent rounded-full" /></div>
        ) : entries.length === 0 ? (
          <div className={`rounded-2xl border p-16 text-center ${cardBase}`}>
            <GiftIcon className={`w-16 h-16 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No achievements yet</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Check back when winners are announced!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry, idx) => {
              const cfg = TYPE_CONFIG[entry.result_type] || TYPE_CONFIG.other
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border p-5 ${cardBase} hover:shadow-lg transition-shadow`}
                >
                  {/* Rank badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${cfg.rankBg} text-white`}>
                      {cfg.icon}
                    </div>
                    {entry.prize_amount && (
                      <span className={`text-sm font-bold px-2 py-1 rounded-lg ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                        ₹{parseFloat(entry.prize_amount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  {/* Student info */}
                  <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>{entry.student_name}</h3>
                  <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{entry.student_department} • {entry.register_number}</p>
                  {entry.year_of_study && (
                    <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Year {entry.year_of_study}</p>
                  )}
                  {/* Event name */}
                  <div className={`rounded-lg p-2.5 mb-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Event</p>
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.event_name}</p>
                  </div>
                  {/* Achievement description */}
                  {entry.achievement_description && (
                    <div className={`rounded-lg p-2.5 mb-3 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                      <p className={`text-xs italic ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{entry.achievement_description}</p>
                    </div>
                  )}
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                    {entry.is_verified && (
                      <span className="flex items-center gap-0.5 text-xs text-green-600">
                        <CheckCircleIcon className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )
      ) : loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : entries.length === 0 ? (
        <div className={`rounded-2xl border p-16 text-center ${cardBase}`}>
          <TrophyIcon className={`w-16 h-16 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No results found</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Try adjusting your filters</p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${cardBase}`}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  {canDelete && (
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === entries.length && entries.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                  )}
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rank</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Event</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Achievement</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prize</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
                  {canDelete && (
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: isDark ? '#374151' : '#f3f4f6' }}>
                {entries.map((entry, idx) => {
                  const cfg = TYPE_CONFIG[entry.result_type] || TYPE_CONFIG.other
                  const isTop3 = idx < 3
                  return (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`transition-colors ${
                        selected.has(entry.id)
                          ? isDark ? 'bg-primary-900/20' : 'bg-primary-50'
                          : isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      {canDelete && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center w-8 h-8">
                          {isTop3 ? (
                            <span className="text-xl">{MEDAL_EMOJI[idx]}</span>
                          ) : (
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.student_name}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {entry.register_number && <span>{entry.register_number} · </span>}
                          {entry.student_department}
                          {entry.year_of_study && <span> · Yr {entry.year_of_study}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.event_name}</div>
                        {entry.event_type && (
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{entry.event_type}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}>
                          <span>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                        {entry.achievement_description && (
                          <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{entry.achievement_description}</div>
                        )}
                        {entry.is_verified && (
                          <div className="flex items-center gap-0.5 mt-1">
                            <CheckCircleIcon className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600">Verified</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.prize_amount ? (
                          <span className={`font-semibold text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            ₹{parseFloat(entry.prize_amount).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {entry.event_start_date ? new Date(entry.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      {canDelete && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteOne(entry.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete entry"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y" style={{ borderColor: isDark ? '#374151' : '#f3f4f6' }}>
            {entries.map((entry, idx) => {
              const cfg = TYPE_CONFIG[entry.result_type] || TYPE_CONFIG.other
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-4 ${selected.has(entry.id) ? (isDark ? 'bg-primary-900/20' : 'bg-primary-50') : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {canDelete && (
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="mt-1 rounded"
                      />
                    )}
                    <div className="flex items-center justify-center w-9 h-9 flex-shrink-0">
                      {idx < 3 ? (
                        <span className="text-2xl">{MEDAL_EMOJI[idx]}</span>
                      ) : (
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.student_name}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {entry.register_number} · {entry.student_department}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.prize_amount && (
                            <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                              ₹{parseFloat(entry.prize_amount).toLocaleString('en-IN')}
                            </span>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDeleteOne(entry.id)} className="text-red-400 hover:text-red-600 p-1">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{entry.event_name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {entry.is_verified && (
                          <span className="flex items-center gap-0.5 text-xs text-green-600">
                            <CheckCircleIcon className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {entry.event_start_date && (
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(entry.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delete All confirmation modal */}
      <AnimatePresence>
        {confirmDeleteAll && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteAll(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl shadow-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete All {entries.length} Entries</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                    isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >Cancel</button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {deleting ? <div className="spinner w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
                  {deleting ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk delete confirmation modal */}
      <AnimatePresence>
        {confirmBulk && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmBulk(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl shadow-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete {selected.size} Entries</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setConfirmBulk(false)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                    isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBulk}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {deleting ? <div className="spinner w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
                  {deleting ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
