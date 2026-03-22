import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackingAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import {
  TrophyIcon, MagnifyingGlassIcon, CheckBadgeIcon as CheckBadgeOutline,
  DocumentTextIcon, PhotoIcon, XMarkIcon, CurrencyRupeeIcon, GiftIcon,
  LightBulbIcon, UserGroupIcon, ChatBubbleLeftRightIcon, FunnelIcon,
  ChevronDownIcon, ChevronUpIcon, ClockIcon, SparklesIcon, TrashIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'

const RESULT_TYPES = [
  { value: '',               label: 'All Results'     },
  { value: 'winner',         label: '🏆 Winner'        },
  { value: 'runner_up',      label: '🥈 Runner-Up'     },
  { value: 'finalist',       label: '🥉 Finalist'      },
  { value: 'participated',   label: '✅ Participated'   },
  { value: 'special_mention',label: '⭐ Special Mention'},
  { value: 'other',          label: '🎯 Other'          },
]

const TYPE_STYLES = {
  winner:          { color: 'from-yellow-400 to-amber-500',  badge: 'bg-yellow-100 text-yellow-800',   darkBadge: 'bg-yellow-900/30 text-yellow-300' },
  runner_up:       { color: 'from-gray-300 to-slate-400',    badge: 'bg-gray-100 text-gray-700',       darkBadge: 'bg-gray-700 text-gray-300' },
  finalist:        { color: 'from-orange-400 to-amber-500',  badge: 'bg-orange-100 text-orange-700',   darkBadge: 'bg-orange-900/30 text-orange-300' },
  participated:    { color: 'from-blue-400 to-indigo-500',   badge: 'bg-blue-100 text-blue-700',       darkBadge: 'bg-blue-900/30 text-blue-300' },
  special_mention: { color: 'from-purple-400 to-violet-500', badge: 'bg-purple-100 text-purple-700',   darkBadge: 'bg-purple-900/30 text-purple-300' },
  other:           { color: 'from-teal-400 to-cyan-500',     badge: 'bg-teal-100 text-teal-700',       darkBadge: 'bg-teal-900/30 text-teal-300' },
}

export default function EventResults() {
  const { isDark } = useTheme()
  const { user } = useAuthStore()
  const canDelete = user?.role === 'staff' || user?.role === 'hod'

  const [results, setResults]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [filterType, setFilterType]         = useState('')
  const [expanded, setExpanded]             = useState(null)
  const [verifyingId, setVerifyingId]       = useState(null)
  const [verifyNotes, setVerifyNotes]       = useState('')
  const [showVerifyFor, setShowVerifyFor]   = useState(null)
  const [lightboxPhoto, setLightboxPhoto]   = useState(null)
  const [stats, setStats]                   = useState({})
  const [deletingId, setDeletingId]         = useState(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [deletingAll, setDeletingAll]       = useState(false)

  useEffect(() => {
    fetchResults()
    const interval = setInterval(fetchResults, 60000)
    return () => clearInterval(interval)
  }, [filterType])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const res = await trackingAPI.getAllResults({ result_type: filterType || undefined, search: search || undefined })
      const data = res.data.data || []
      setResults(data)
      // compute stats
      const s = { total: data.length, winners: 0, certified: 0, verified: 0 }
      data.forEach(r => {
        if (r.result_type === 'winner' || r.result_type === 'runner_up') s.winners++
        if (r.certificate_path) s.certified++
        if (r.is_verified || r.verified_by_staff) s.verified++
      })
      setStats(s)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchResults()
  }

  const handleVerify = async (id) => {
    setVerifyingId(id)
    try {
      await trackingAPI.verifyResult(id, { staff_verification_notes: verifyNotes })
      toast.success('✅ Result verified!')
      setShowVerifyFor(null); setVerifyNotes('')
      fetchResults()
    } catch (e) { toast.error('Failed to verify') } finally { setVerifyingId(null) }
  }

  const handleDeleteOne = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this result entry? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await trackingAPI.deleteResult(id)
      toast.success('Result deleted')
      setResults(prev => prev.filter(r => r.id !== id))
    } catch { toast.error('Failed to delete result') } finally { setDeletingId(null) }
  }

  const handleDeleteAll = async () => {
    setDeletingAll(true)
    try {
      const ids = results.map(r => r.id)
      if (!ids.length) { toast.error('No results to delete'); return }
      await trackingAPI.deleteResults(ids)
      toast.success(`${ids.length} result(s) deleted`)
      setResults([])
      setStats({})
      setConfirmDeleteAll(false)
    } catch { toast.error('Failed to delete results') } finally { setDeletingAll(false) }
  }

  const card = isDark ? 'bg-gray-800' : 'bg-white'
  const sub  = isDark ? 'text-gray-400' : 'text-gray-500'
  const head = isDark ? 'text-white' : 'text-gray-900'

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600" />
        <TrophyIcon className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${head}`}>
            <span>🏆</span> Event Results
          </h1>
          <p className={sub}>Post-event reports submitted by students</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${sub}`}>Auto-refresh: 1 min</span>
          <button
            onClick={fetchResults}
            className={`p-2 rounded-lg border text-sm font-medium transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            title="Refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canDelete && results.length > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
            >
              <TrashIcon className="w-4 h-4" />
              Delete All
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: stats.total,      icon: '📋', color: 'from-blue-500 to-indigo-500' },
            { label: 'Winners',       value: stats.winners,    icon: '🏆', color: 'from-yellow-400 to-amber-500' },
            { label: 'Certificates',  value: stats.certified,  icon: '📄', color: 'from-purple-500 to-violet-500' },
            { label: 'Verified',      value: stats.verified,   icon: '✅', color: 'from-green-400 to-emerald-500' },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl p-4 shadow ${card}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg shadow`}>{s.icon}</div>
                <div>
                  <p className={`text-2xl font-bold ${head}`}>{s.value}</p>
                  <p className={`text-xs ${sub}`}>{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className={`rounded-2xl p-4 shadow ${card}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
              placeholder="Search by student name or event…"
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {RESULT_TYPES.map(rt => (
              <button key={rt.value} onClick={() => setFilterType(rt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  filterType === rt.value
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                    : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >{rt.label}</button>
            ))}
          </div>
          <button onClick={fetchResults}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow whitespace-nowrap"
          >Search</button>
        </div>
      </div>

      {/* ── Results list ── */}
      {results.length === 0 ? (
        <div className={`rounded-2xl p-16 text-center shadow ${card}`}>
          <div className="text-6xl mb-4">🏅</div>
          <h3 className={`text-xl font-bold mb-2 ${head}`}>No Results Found</h3>
          <p className={sub}>No post-event reports match your search</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r, i) => {
            const rt       = TYPE_STYLES[r.result_type] || TYPE_STYLES.participated
            const label    = RESULT_TYPES.find(x => x.value === r.result_type)?.label || r.result_type
            const isOpen   = expanded === r.id
            const verified = r.is_verified || r.verified_by_staff
            const photos   = Array.isArray(r.photo_urls) ? r.photo_urls : []

            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-2xl shadow overflow-hidden ${card}`}
              >
                <div className={`h-1 bg-gradient-to-r ${rt.color}`} />
                <div className="p-5">
                  {/* Card header */}
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="text-3xl mt-0.5 leading-none">{label.split(' ')[0]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className={`font-bold ${head}`}>{r.event_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? rt.darkBadge : rt.badge}`}>{label.slice(3)}</span>
                        {verified && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckBadgeIcon className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                      </div>
                      <div className={`flex flex-wrap gap-x-4 gap-y-0.5 text-xs ${sub}`}>
                        <span>👤 {r.student_name}</span>
                        {r.roll_number && <span>🎓 {r.roll_number}</span>}
                        {r.department   && <span>🏫 {r.department}</span>}
                        <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      {!verified && (
                        <button onClick={e => { e.stopPropagation(); setShowVerifyFor(showVerifyFor === r.id ? null : r.id) }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition-all"
                        >
                          <CheckBadgeOutline className="w-4 h-4" /> Verify
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={e => handleDeleteOne(r.id, e)}
                          disabled={deletingId === r.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-400 hover:bg-red-50'}`}
                          title="Delete result"
                        >
                          {deletingId === r.id
                            ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            : <TrashIcon className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={() => setExpanded(isOpen ? null : r.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {isOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Awards summary line */}
                  {(r.award_name || r.prize_amount) && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {r.award_name && (
                        <span className={`text-sm flex items-center gap-1.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          <GiftIcon className="w-4 h-4" /> {r.award_name}
                        </span>
                      )}
                      {r.prize_amount > 0 && (
                        <span className={`text-sm flex items-center gap-1.5 font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          <CurrencyRupeeIcon className="w-4 h-4" /> ₹{Number(r.prize_amount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Verify panel */}
                  <AnimatePresence>
                    {showVerifyFor === r.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
                        <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-green-900/10 border-green-800' : 'bg-green-50 border-green-200'}`}>
                          <p className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Add verification note (optional):</p>
                          <textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)}
                            rows={2} placeholder="e.g. Certificate checked, achievement confirmed..."
                            className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-green-200'} focus:outline-none`}
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowVerifyFor(null)} className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
                            <button onClick={() => handleVerify(r.id)} disabled={verifyingId === r.id}
                              className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-semibold shadow disabled:opacity-60 flex items-center gap-1.5"
                            >
                              {verifyingId === r.id ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckBadgeIcon className="w-4 h-4" />}
                              Confirm Verify
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className={`mt-4 pt-4 border-t space-y-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                          {[
                            { key: 'what_happened',          label: 'What Happened',          icon: ChatBubbleLeftRightIcon, color: 'text-purple-500' },
                            { key: 'achievement_description',label: 'Achievement Summary',     icon: TrophyIcon,              color: 'text-yellow-500' },
                            { key: 'prize_details',          label: 'Prize / Award Details',  icon: GiftIcon,                color: 'text-pink-500'   },
                            { key: 'learning_outcomes',      label: 'Key Learnings',           icon: LightBulbIcon,           color: 'text-blue-500'   },
                            { key: 'team_reflection',        label: 'Team Reflection',         icon: UserGroupIcon,           color: 'text-teal-500'   },
                            { key: 'feedback',               label: 'Feedback',                icon: ChatBubbleLeftRightIcon, color: 'text-orange-500' },
                          ].filter(f => r[f.key]).map(f => (
                            <div key={f.key}>
                              <p className={`text-xs font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5 ${sub}`}>
                                <f.icon className={`w-3.5 h-3.5 ${f.color}`} />{f.label}
                              </p>
                              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{r[f.key]}</p>
                            </div>
                          ))}

                          {/* Certificate */}
                          {r.certificate_path && (
                            <div>
                              <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Certificate</p>
                              <a href={r.certificate_path} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium shadow hover:from-indigo-600 hover:to-purple-600 transition-all"
                              >
                                <DocumentTextIcon className="w-4 h-4" /> Open Certificate
                              </a>
                            </div>
                          )}

                          {/* Photos */}
                          {photos.length > 0 && (
                            <div>
                              <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Event Photos ({photos.length})</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {photos.map((p, pi) => {
                                  const src = p.url
                                  return (
                                    <button key={pi} onClick={() => setLightboxPhoto(src)}
                                      className="aspect-square rounded-xl overflow-hidden hover:scale-105 transition-transform focus:outline-none"
                                    >
                                      <img src={src} alt="" className="w-full h-full object-cover" />
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Verification status */}
                          {verified && r.staff_verification_notes && (
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                              <p className={`text-xs font-semibold flex items-center gap-1.5 mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                <CheckBadgeIcon className="w-4 h-4" /> Verified Note
                              </p>
                              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{r.staff_verification_notes}</p>
                              {r.verified_at && <p className={`text-xs mt-1 ${sub}`}>{new Date(r.verified_at).toLocaleString('en-IN')}</p>}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Delete All Modal ── */}
      <AnimatePresence>
        {confirmDeleteAll && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteAll(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl shadow-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete All {results.length} Results</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>This cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteAll(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >Cancel</button>
                <button onClick={handleDeleteAll} disabled={deletingAll}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {deletingAll
                    ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : <TrashIcon className="w-4 h-4" />}
                  {deletingAll ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
              <XMarkIcon className="w-6 h-6" />
            </button>
            <motion.img src={lightboxPhoto} alt="" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
