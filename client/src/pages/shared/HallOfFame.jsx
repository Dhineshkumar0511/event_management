import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import { useTheme } from '../../context/ThemeContext'
import { featuresAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import {
  TrophyIcon, StarIcon, BuildingOfficeIcon, ArrowDownTrayIcon,
  SparklesIcon, UserGroupIcon, CalendarIcon, AcademicCapIcon,
  TrashIcon, ArrowPathIcon
} from '@heroicons/react/24/outline'

const COLLEGE_NAME = 'Sri Manakula Vinayagar Engineering College'
const medals = ['🥇', '🥈', '🥉']
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

/* ═══════ Sparkle / confetti particles for banner ═══════ */
function Sparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 6 + 3,
            height: Math.random() * 6 + 3,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: ['#fbbf24','#f59e0b','#ffffff','#fde68a','#fb923c'][i % 5],
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            y: [0, -20, -40],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

/* ═══════ Student of the Month Banner (downloadable) ═══════ */
function MonthBanner({ student, month, year, onDownload, bannerRef }) {
  const displayMonth = monthNames[(month || 1) - 1]

  return (
    <div ref={bannerRef} className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)' }}>
      <Sparkles />
      {/* Top ribbon */}
      <div className="relative z-10 text-center pt-6 pb-2">
        <div className="inline-block px-6 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-xs font-bold tracking-widest uppercase text-gray-900 shadow-lg">
          ⭐ Student of the Month ⭐
        </div>
      </div>
      {/* College name */}
      <div className="relative z-10 text-center mt-3">
        <h2 className="text-lg md:text-xl font-extrabold text-yellow-300 tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(251,191,36,0.4)' }}>
          {COLLEGE_NAME}
        </h2>
        <p className="text-yellow-100/70 text-xs mt-0.5 tracking-wider">{displayMonth} {year}</p>
      </div>
      {/* Trophy + Photo + Info */}
      <div className="relative z-10 flex flex-col items-center mt-5 pb-7 px-6">
        {/* Trophy cup above photo */}
        <div className="relative mb-3">
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0], y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl drop-shadow-xl"
          >
            🏆
          </motion.div>
        </div>
        {/* Photo with glowing ring */}
        <div className="relative">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-spin" style={{ animationDuration: '6s' }} />
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-xl">
            {student.profile_image ? (
              <img src={student.profile_image} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                {student.name?.charAt(0)}
              </div>
            )}
          </div>
        </div>
        {/* Student Name */}
        <motion.h3
          className="mt-4 text-2xl md:text-3xl font-extrabold text-white tracking-wide text-center"
          style={{ textShadow: '0 2px 12px rgba(255,255,255,0.3)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {student.name}
        </motion.h3>
        {/* Details */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
          <span className="text-yellow-200/90 font-medium">{student.department}</span>
          {student.year_of_study && <span className="text-yellow-100/70">Year {student.year_of_study}</span>}
          {student.section && <span className="text-yellow-100/70">Section {student.section}</span>}
        </div>
        <p className="text-yellow-100/70 text-xs mt-1">{student.employee_id}</p>
        {/* Achievement badge */}
        {student.achievement && (
          <div className="mt-4 mx-auto max-w-md">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <SparklesIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-100 text-sm text-center">{student.achievement}</span>
            </div>
          </div>
        )}
        {/* Decorative laurels */}
        <div className="flex items-center mt-4 gap-3 text-yellow-400/50 text-2xl">
          <span>🏅</span>
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
          <StarIcon className="h-5 w-5 text-yellow-400" />
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
          <span>🏅</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════ Certificate (downloadable) ═══════ */
function Certificate({ student, month, year, certRef }) {
  const displayMonth = monthNames[(month || 1) - 1]

  return (
    <div ref={certRef} className="relative w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ aspectRatio: '1.414/1' }}>
      {/* Ornate gold border */}
      <div className="absolute inset-3 border-4 border-yellow-500 rounded-xl pointer-events-none" />
      <div className="absolute inset-5 border border-yellow-300 rounded-lg pointer-events-none" />
      {/* Corner ornaments */}
      {['top-4 left-4','top-4 right-4','bottom-4 left-4','bottom-4 right-4'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-10 h-10 border-yellow-600 ${i < 2 ? 'border-t-2' : 'border-b-2'} ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'} rounded-sm`} />
      ))}
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center h-full px-10 py-8 text-center">
        {/* College Logo Text */}
        <div className="mb-1">
          <span className="text-xs tracking-[0.3em] uppercase text-yellow-700 font-semibold">{COLLEGE_NAME}</span>
        </div>
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-yellow-700 mt-2" style={{ fontFamily: 'Georgia, serif' }}>
          Certificate of Recognition
        </h2>
        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mt-3 mb-4" />
        {/* Sub-heading */}
        <p className="text-gray-500 text-sm italic">This is proudly presented to</p>
        {/* Student name */}
        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-3 underline decoration-yellow-400 decoration-2 underline-offset-4" style={{ fontFamily: 'Georgia, serif' }}>
          {student.name}
        </h3>
        {/* Department and details */}
        <p className="text-gray-500 text-sm mt-2">
          {student.department}{student.year_of_study ? ` • Year ${student.year_of_study}` : ''}{student.section ? ` • Section ${student.section}` : ''}
        </p>
        {/* Recognition text */}
        <p className="text-gray-600 text-sm mt-4 max-w-md leading-relaxed">
          In recognition of outstanding performance and being awarded the title of
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-lg">
          <span className="text-2xl">🏆</span>
          <span className="text-lg font-bold text-yellow-700">Student of the Month</span>
        </div>
        <p className="text-gray-600 text-sm mt-2">
          for the month of <strong className="text-gray-800">{displayMonth} {year}</strong>
        </p>
        {/* Achievement */}
        {student.achievement && (
          <p className="text-gray-500 text-xs mt-3 italic max-w-sm">"{student.achievement}"</p>
        )}
        {/* Signature line */}
        <div className="flex items-center justify-center gap-16 mt-auto pt-6">
          <div className="text-center">
            <div className="w-28 border-b border-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Head of Department</span>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-0.5">🎓</div>
            <span className="text-[10px] text-gray-400">SMVEC</span>
          </div>
          <div className="text-center">
            <div className="w-28 border-b border-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Principal</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════ HOD Selection Form — shows top 5 students dynamically ═══════ */
function SelectStudentForm({ dark, onSelect, onSeedDemo }) {
  const [top5, setTop5] = useState([])
  const [selected, setSelected] = useState(null)
  const [achievement, setAchievement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingTop5, setLoadingTop5] = useState(true)
  const [manualRoll, setManualRoll] = useState('')
  const [manualStudent, setManualStudent] = useState(null)
  const [searching, setSearching] = useState(false)
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear, setSelYear] = useState(now.getFullYear())

  useEffect(() => {
    loadTop5()
  }, [])

  const loadTop5 = async () => {
    setLoadingTop5(true)
    try {
      const res = await featuresAPI.getTop5Students()
      setTop5(res.data.data || [])
    } catch {} finally { setLoadingTop5(false) }
  }

  const searchManual = async () => {
    if (!manualRoll.trim()) return
    setSearching(true)
    try {
      const res = await featuresAPI.lookupStudent({ roll: manualRoll.trim() })
      if (res.data.success) { setManualStudent(res.data.data); setSelected(res.data.data) }
      else setManualStudent(null)
    } catch { setManualStudent(null) }
    finally { setSearching(false) }
  }

  const pickStudent = (s) => {
    setSelected(s)
    setManualStudent(null)
    setManualRoll('')
  }

  const handleSubmit = async () => {
    if (!selected || !achievement.trim()) return
    setSubmitting(true)
    try {
      await onSelect({ student_id: selected.id, month: selMonth, year: selYear, achievement: achievement.trim() })
      setSelected(null); setAchievement(''); setManualRoll(''); setManualStudent(null)
    } catch {} finally { setSubmitting(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 mb-6 ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-lg flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
          <SparklesIcon className="h-5 w-5 text-yellow-500" /> Select Student of the Month
        </h3>
        <button onClick={onSeedDemo}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 font-medium transition-colors">
          🎲 Load Demo Data
        </button>
      </div>

      {/* Month/Year selectors */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Month</label>
          <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
            {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Year</label>
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
            {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Top 5 dynamic list */}
      <div className="mb-4">
        <label className={`text-xs font-semibold mb-2 block ${dark ? 'text-yellow-400' : 'text-yellow-700'}`}>
          🏆 Top 5 Students (auto-ranked by wins) — Click to select
        </label>
        {loadingTop5 ? (
          <div className="text-center py-4"><div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : top5.length > 0 ? (
          <div className="space-y-2">
            {top5.map((s, i) => (
              <motion.button key={s.id} type="button" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => pickStudent(s)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  selected?.id === s.id
                    ? 'ring-2 ring-yellow-400 border-yellow-400 bg-yellow-50 dark:bg-yellow-950'
                    : dark ? 'border-gray-700 bg-gray-700/30 hover:bg-gray-700/60' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}>
                <span className="text-lg w-7 text-center flex-shrink-0">{medals[i] || `#${i + 1}`}</span>
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  {s.profile_image ? (
                    <img src={s.profile_image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {s.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
                  <div className="text-xs text-gray-500">{s.department} • {s.employee_id} • {s.wins} wins, {s.runner_ups} runner-ups</div>
                </div>
                {selected?.id === s.id && <span className="text-yellow-500 text-lg flex-shrink-0">✓</span>}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className={`text-center py-4 rounded-xl border ${dark ? 'border-gray-700 bg-gray-700/20' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-gray-500 text-sm">No event results yet. Use manual search below or load demo data.</p>
          </div>
        )}
      </div>

      {/* Manual search fallback */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Or search by Roll Number</label>
        <div className="flex gap-2">
          <input value={manualRoll} onChange={e => setManualRoll(e.target.value)} placeholder="e.g. 22IT101"
            onKeyDown={e => e.key === 'Enter' && searchManual()}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
          <button onClick={searchManual} disabled={searching}
            className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
            {searching ? '...' : 'Find'}
          </button>
        </div>
        {manualStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`flex items-center gap-3 p-3 rounded-xl mt-2 ${dark ? 'bg-gray-700/50' : 'bg-yellow-50'}`}>
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              {manualStudent.profile_image ? (
                <img src={manualStudent.profile_image} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {manualStudent.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{manualStudent.name}</div>
              <div className="text-xs text-gray-500">{manualStudent.department} • {manualStudent.employee_id}</div>
            </div>
            <span className="text-green-500 text-lg">✓</span>
          </motion.div>
        )}
      </div>

      {/* Selected student summary */}
      {selected && (
        <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 text-sm font-medium ${dark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-800'}`}>
          ✨ Selected: <strong>{selected.name}</strong> ({selected.employee_id})
        </div>
      )}

      {/* Achievement */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Achievement / Reason</label>
        <textarea value={achievement} onChange={e => setAchievement(e.target.value)}
          rows={2} placeholder="Outstanding performance in..."
          className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
      </div>

      <button onClick={handleSubmit} disabled={!selected || !achievement.trim() || submitting}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-sm hover:from-yellow-600 hover:to-amber-700 disabled:opacity-40 transition-all shadow-lg shadow-yellow-500/20">
        {submitting ? 'Selecting...' : '🏆 Announce Student of the Month'}
      </button>
      <p className="text-xs text-gray-500 mt-2 text-center">
        💡 If no student is selected by month end, the #1 ranked student is auto-chosen
      </p>
    </motion.div>
  )
}

/* ═══════ MAIN COMPONENT ═══════ */
export default function HallOfFame() {
  const { isDark: dark } = useTheme()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('sotm')
  const [data, setData] = useState({ hallOfFame: [], deptStats: [] })
  const [sotmData, setSotmData] = useState({ current: [], history: [] })
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')

  const bannerRef = useRef(null)
  const certRef = useRef(null)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [fameRes, sotmRes] = await Promise.all([
        featuresAPI.getHallOfFame({ year: year || undefined }),
        featuresAPI.getStudentOfMonth()
      ])
      setData(fameRes.data.data || { hallOfFame: [], deptStats: [] })
      setSotmData(sotmRes.data.data || { current: [], history: [] })
    } catch {} finally { setLoading(false) }
  }, [year])

  useEffect(() => { loadAll() }, [loadAll])

  const handleSelectStudent = async (payload) => {
    await featuresAPI.selectStudentOfMonth(payload)
    loadAll()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this Student of the Month entry?')) return
    try {
      await featuresAPI.deleteStudentOfMonth(id)
      loadAll()
    } catch {}
  }

  const handleReset = async () => {
    if (!window.confirm('Reset ALL Student of the Month data? This cannot be undone.')) return
    try {
      await featuresAPI.resetAllStudentOfMonth()
      loadAll()
    } catch {}
  }

  const handleSeedDemo = async () => {
    try {
      await featuresAPI.seedDemoStudentOfMonth()
      loadAll()
    } catch {}
  }

  const downloadImage = async (ref, filename) => {
    if (!ref.current) return
    try {
      const dataUrl = await toPng(ref.current, { quality: 0.95, pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) { console.error('Download failed', err) }
  }

  const currentSOTM = sotmData.current?.[0]

  const tabs = [
    { id: 'sotm', label: 'Student of the Month', icon: TrophyIcon },
    { id: 'achievers', label: 'Top Achievers', icon: StarIcon },
    { id: 'departments', label: 'Departments', icon: BuildingOfficeIcon },
  ]

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* ──── Header ──── */}
        <motion.div className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative inline-block">
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-yellow-500/30"
            >
              <TrophyIcon className="h-9 w-9 text-white" />
            </motion.div>
          </div>
          <h1 className={`text-2xl md:text-3xl font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}>
            Hall of Fame
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Celebrating our top achievers and department excellence</p>
        </motion.div>

        {/* ──── Tabs ──── */}
        <div className="flex justify-center mb-6">
          <div className={`inline-flex rounded-xl p-1 ${dark ? 'bg-gray-800' : 'bg-gray-200/70'}`}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/20'
                    : dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-10 w-10 border-3 border-yellow-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Loading Hall of Fame...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ═══════════ TAB: Student of the Month ═══════════ */}
            {tab === 'sotm' && (
              <motion.div key="sotm" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                {/* HOD Selection Form */}
                {user?.role === 'hod' && (
                  <SelectStudentForm dark={dark} onSelect={handleSelectStudent} onSeedDemo={handleSeedDemo} />
                )}

                {/* HOD action bar: Reset */}
                {user?.role === 'hod' && sotmData.history.length > 0 && (
                  <div className="flex justify-end gap-2 mb-4">
                    <button onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                      <ArrowPathIcon className="h-3.5 w-3.5" /> Reset All Data
                    </button>
                  </div>
                )}

                {/* Current SOTM Banner */}
                {currentSOTM ? (
                  <div className="space-y-6">
                    <MonthBanner
                      student={currentSOTM}
                      month={currentSOTM.month || currentMonth}
                      year={currentSOTM.year || currentYear}
                      bannerRef={bannerRef}
                    />
                    <div className="flex justify-center gap-3">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => downloadImage(bannerRef, `student-of-month-${currentSOTM.name?.replace(/\s+/g, '-')}.png`)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-shadow">
                        <ArrowDownTrayIcon className="h-4 w-4" /> Download Banner
                      </motion.button>
                      {user?.role === 'hod' && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(currentSOTM.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 rounded-xl font-medium text-sm hover:bg-red-500/20 transition-colors border border-red-500/20">
                          <TrashIcon className="h-4 w-4" /> Remove
                        </motion.button>
                      )}
                    </div>

                    {/* Certificate */}
                    <div className="mt-8">
                      <h3 className={`text-lg font-bold text-center mb-4 flex items-center justify-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                        <AcademicCapIcon className="h-5 w-5 text-yellow-600" /> Certificate of Recognition
                      </h3>
                      <Certificate
                        student={currentSOTM}
                        month={currentSOTM.month || currentMonth}
                        year={currentSOTM.year || currentYear}
                        certRef={certRef}
                      />
                      <div className="flex justify-center mt-4">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => downloadImage(certRef, `certificate-${currentSOTM.name?.replace(/\s+/g, '-')}.png`)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow">
                          <ArrowDownTrayIcon className="h-4 w-4" /> Download Certificate
                        </motion.button>
                      </div>
                    </div>

                    {/* History */}
                    {sotmData.history.length > 1 && (
                      <div className="mt-8">
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                          <CalendarIcon className="h-5 w-5 text-blue-500" /> Past Winners
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sotmData.history.filter(h => !(h.month === currentSOTM.month && h.year === currentSOTM.year && h.department === currentSOTM.department)).map((h, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`rounded-xl border p-4 flex items-center gap-3 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-md transition-shadow`}>
                              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-yellow-400/50">
                                {h.profile_image ? (
                                  <img src={h.profile_image} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    {h.name?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{h.name}</div>
                                <div className="text-xs text-gray-500">{h.department}</div>
                                <div className="text-xs text-yellow-500 font-medium">{monthNames[(h.month || 1) - 1]} {h.year}</div>
                              </div>
                              <span className="text-xl">🏆</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`text-center py-16 rounded-2xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-4">🏆</motion.div>
                    <h3 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>No Student of the Month Yet</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {user?.role === 'hod' ? 'Use the form above to select a student!' : 'Check back soon for this month\'s winner!'}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ═══════════ TAB: Top Achievers ═══════════ */}
            {tab === 'achievers' && (
              <motion.div key="achievers" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                {/* Year filter */}
                <div className="flex justify-center gap-2 mb-6">
                  <button onClick={() => setYear('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!year ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : dark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                    All Time
                  </button>
                  {years.map(y => (
                    <button key={y} onClick={() => setYear(y.toString())}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${year == y ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : dark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                      {y}
                    </button>
                  ))}
                </div>

                {data.hallOfFame.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <TrophyIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No achievements yet for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.hallOfFame.map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`rounded-xl border p-4 flex items-center gap-4 transition-shadow hover:shadow-lg ${
                          i === 0 ? 'ring-2 ring-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-300 dark:border-yellow-800' :
                          i === 1 ? 'ring-1 ring-gray-300 dark:ring-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-gray-300 dark:border-gray-700' :
                          i === 2 ? 'ring-1 ring-orange-200 dark:ring-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800' :
                          dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                        <div className="flex-shrink-0 w-10 text-center">
                          {i < 3 ? <span className="text-2xl">{medals[i]}</span> : (
                            <span className={`text-lg font-bold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>#{i + 1}</span>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {s.profile_image ? (
                            <img src={s.profile_image} className="w-12 h-12 rounded-full object-cover ring-2 ring-yellow-400/30" alt="" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                              {s.name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
                          <div className="text-xs text-gray-500">{s.department} • {s.employee_id}</div>
                          <div className="text-xs text-gray-400 mt-0.5 truncate">{s.events}</div>
                        </div>
                        <div className="flex gap-4 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-500">{s.wins}</div>
                            <div className="text-xs text-gray-500">Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-500">{s.runner_ups}</div>
                            <div className="text-xs text-gray-500">Runner-up</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>₹{Number(s.total_prize || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Prize</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════ TAB: Department Rankings ═══════════ */}
            {tab === 'departments' && (
              <motion.div key="departments" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                {data.deptStats.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No department data available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.deptStats.map((d, i) => (
                      <motion.div key={d.department} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        className={`rounded-2xl border p-5 transition-shadow hover:shadow-lg ${
                          i === 0 ? 'ring-2 ring-yellow-400 border-yellow-300 dark:border-yellow-700' :
                          dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        } ${i === 0 ? (dark ? 'bg-gradient-to-br from-yellow-950 to-gray-800' : 'bg-gradient-to-br from-yellow-50 to-orange-50') : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {i < 3 && <span className="text-xl">{medals[i]}</span>}
                            <span className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{d.department}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            i === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>Rank #{i + 1}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className={`rounded-xl p-2 ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <div className={`text-xl font-bold ${dark ? 'text-yellow-400' : 'text-yellow-600'}`}>{d.wins}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Wins</div>
                          </div>
                          <div className={`rounded-xl p-2 ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <div className={`text-xl font-bold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{d.total_achievements}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Total</div>
                          </div>
                          <div className={`rounded-xl p-2 ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <div className={`text-xl font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>₹{Number(d.total_prize || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Prize</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
