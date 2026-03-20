import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackingAPI, studentAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'
import {
  TrophyIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  PhotoIcon,
  StarIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  AcademicCapIcon,
  SparklesIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CameraIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  GiftIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'

const RESULT_TYPES = [
  { value: 'winner',          label: '🏆 Winner',         color: 'from-yellow-400 to-amber-500',   badge: 'bg-yellow-100 text-yellow-800',  darkBadge: 'bg-yellow-900/30 text-yellow-300' },
  { value: 'runner_up',       label: '🥈 Runner-Up',      color: 'from-gray-300 to-slate-400',     badge: 'bg-gray-100 text-gray-700',      darkBadge: 'bg-gray-700 text-gray-300' },
  { value: 'finalist',        label: '🥉 Finalist',       color: 'from-orange-400 to-amber-500',   badge: 'bg-orange-100 text-orange-700',  darkBadge: 'bg-orange-900/30 text-orange-300' },
  { value: 'participated',    label: '✅ Participated',    color: 'from-blue-400 to-indigo-500',    badge: 'bg-blue-100 text-blue-700',      darkBadge: 'bg-blue-900/30 text-blue-300' },
  { value: 'special_mention', label: '⭐ Special Mention', color: 'from-purple-400 to-violet-500',  badge: 'bg-purple-100 text-purple-700',  darkBadge: 'bg-purple-900/30 text-purple-300' },
  { value: 'other',           label: '🎯 Other',           color: 'from-teal-400 to-cyan-500',      badge: 'bg-teal-100 text-teal-700',      darkBadge: 'bg-teal-900/30 text-teal-300' },
]

const STEPS = [
  { id: 1, label: 'Select Event',      icon: AcademicCapIcon },
  { id: 2, label: 'Result & Awards',   icon: TrophyIcon },
  { id: 3, label: 'Story & Learnings', icon: LightBulbIcon },
  { id: 4, label: 'Files & Submit',    icon: ArrowUpTrayIcon },
]

export default function SubmitResult() {
  const { isDark } = useTheme()
  const certRef  = useRef()
  const photoRef = useRef()

  const [requests, setRequests]                 = useState([])
  const [submittedResults, setSubmittedResults] = useState([])
  const [selectedRequest, setSelectedRequest]   = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [submitting, setSubmitting]             = useState(false)
  const [activeTab, setActiveTab]               = useState('submit')
  const [step, setStep]                         = useState(1)
  const [certFile, setCertFile]                 = useState(null)
  const [photoFiles, setPhotoFiles]             = useState([])
  const [photoPreviews, setPhotoPreviews]       = useState([])
  const [expandedResult, setExpandedResult]     = useState(null)

  const [pendingResults, setPendingResults] = useState([])

  const [form, setForm] = useState({
    result_type: 'participated',
    position: '',
    award_name: '',
    prize_details: '',
    prize_amount: '',
    what_happened: '',
    achievement_description: '',
    learning_outcomes: '',
    team_reflection: '',
    feedback: '',
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [reqRes, resRes, pendingRes] = await Promise.all([
        studentAPI.getRequests({ status: 'approved' }),
        trackingAPI.getMyResults(),
        trackingAPI.getPendingResults().catch(() => ({ data: { data: [] } }))
      ])
      setRequests(reqRes.data.data || [])
      setSubmittedResults(resRes.data.data || [])
      setPendingResults(pendingRes.data.data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    setPhotoFiles(prev => [...prev, ...files])
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setPhotoPreviews(prev => [...prev, { url: ev.target.result, name: f.name }])
      reader.readAsDataURL(f)
    })
  }

  const removePhoto = (i) => {
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    if (!selectedRequest) return toast.error('Please select an event')
    if (!form.what_happened?.trim()) return toast.error('Please describe what happened at the event')
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('od_request_id', selectedRequest.id)
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (certFile)  fd.append('certificate', certFile)
      photoFiles.forEach(f => fd.append('photos', f))
      await trackingAPI.submitResult(fd)
      toast.success('🎉 Post-event report submitted!')
      setSelectedRequest(null); setStep(1)
      setForm({ result_type: 'participated', position: '', award_name: '', prize_details: '',
        prize_amount: '', what_happened: '', achievement_description: '', learning_outcomes: '',
        team_reflection: '', feedback: '' })
      setCertFile(null); setPhotoFiles([]); setPhotoPreviews([])
      fetchData(); setActiveTab('history')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report')
    } finally { setSubmitting(false) }
  }

  const selectedType = RESULT_TYPES.find(r => r.value === form.result_type) || RESULT_TYPES[3]
  const isWinner = ['winner', 'runner_up', 'finalist', 'special_mention'].includes(form.result_type)

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600" />
        <SparklesIcon className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
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
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span>🏅</span> Post-Event Report
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Document your hackathon journey, achievements & upload proof
          </p>
        </div>
        <div className="flex gap-2">
          {['submit','history'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                activeTab === t
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t === 'submit' ? '📝 Submit New' : `📋 My Reports (${submittedResults.length})`}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ═══════════════ HISTORY TAB ═══════════════ */}
        {activeTab === 'history' ? (
          <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {submittedResults.length === 0 ? (
              <div className={`rounded-2xl p-16 text-center ${isDark ? 'bg-gray-800' : 'bg-white shadow'}`}>
                <div className="text-6xl mb-4">🏅</div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Reports Yet</h3>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Submit your post-event report to see it here</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {submittedResults.map((r, i) => {
                  const rt    = RESULT_TYPES.find(x => x.value === r.result_type) || RESULT_TYPES[3]
                  const expanded = expandedResult === r.id
                  return (
                    <motion.div key={r.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className={`rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                      onClick={() => setExpandedResult(expanded ? null : r.id)}
                    >
                      <div className={`h-1.5 bg-gradient-to-r ${rt.color}`} />
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-3xl leading-none mt-0.5">{rt.label.split(' ')[0]}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.event_name}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? rt.darkBadge : rt.badge}`}>
                                {rt.label.slice(3)}
                              </span>
                              {(r.is_verified || r.verified_by_staff) && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                                  <CheckBadgeIcon className="w-3 h-3" /> Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {r.award_name && (
                          <p className={`text-sm flex items-center gap-1.5 mb-1.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            <GiftIcon className="w-4 h-4 flex-shrink-0" /> {r.award_name}
                          </p>
                        )}
                        {r.prize_amount && (
                          <p className={`text-sm flex items-center gap-1.5 mb-1.5 font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            <CurrencyRupeeIcon className="w-4 h-4 flex-shrink-0" /> ₹{Number(r.prize_amount).toLocaleString('en-IN')} prize money
                          </p>
                        )}

                        <AnimatePresence>
                          {expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className={`mt-3 pt-3 border-t space-y-3 text-sm ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                {r.what_happened && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>What Happened</p>
                                    <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{r.what_happened}</p>
                                  </div>
                                )}
                                {r.achievement_description && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Achievement</p>
                                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.achievement_description}</p>
                                  </div>
                                )}
                                {r.prize_details && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prize Details</p>
                                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.prize_details}</p>
                                  </div>
                                )}
                                {r.learning_outcomes && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Key Learnings</p>
                                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.learning_outcomes}</p>
                                  </div>
                                )}
                                {r.team_reflection && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Team Reflection</p>
                                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.team_reflection}</p>
                                  </div>
                                )}
                                {r.certificate_path && (
                                  <a href={r.certificate_path} target="_blank" rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 text-indigo-500 hover:text-indigo-700 font-medium"
                                  >
                                    <DocumentTextIcon className="w-4 h-4" /> View Certificate
                                  </a>
                                )}
                                {(r.photo_urls?.length > 0) && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Event Photos ({r.photo_urls.length})
                                    </p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {r.photo_urls.slice(0,6).map((p, pi) => (
                                        <a key={pi} href={p.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                                          <img src={p.url} alt="" className="w-full h-14 object-cover rounded-lg" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className={`flex items-center gap-2 mt-3 pt-3 border-t text-xs ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                          <ClockIcon className="w-3.5 h-3.5" />
                          {new Date(r.submitted_at || r.created_at).toLocaleDateString('en-IN', { day:'numeric',month:'short',year:'numeric' })}
                          <span className="ml-auto opacity-60">{expanded ? '▲ collapse' : '▼ details'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

        ) : (

          /* ═══════════════ SUBMIT TAB ═══════════════ */
          <motion.div key="submit" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

            {/* Progress stepper */}
            <div className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white shadow'}`}>
              <div className="flex items-center">
                {STEPS.map((s, i) => {
                  const done   = step > s.id
                  const active = step === s.id
                  return (
                    <div key={s.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => selectedRequest && step > s.id && setStep(s.id)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            done   ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30' :
                            active ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30' :
                                     isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {done ? <CheckCircleIcon className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                        </button>
                        <span className={`text-[10px] mt-1 font-medium text-center leading-tight w-16 ${
                          active ? isDark ? 'text-purple-400' : 'text-purple-600' : isDark ? 'text-gray-500' : 'text-gray-400'
                        }`}>{s.label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-gradient-to-r from-green-400 to-emerald-400' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* ── Event selector (left col) ── */}
              <div className={`rounded-2xl shadow p-5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <AcademicCapIcon className="w-5 h-5 text-purple-500" /> Select Event
                </h3>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📭</div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No approved events</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {requests.map(req => (
                      <button key={req.id} onClick={() => { setSelectedRequest(req); if (step === 1) setStep(2) }}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          selectedRequest?.id === req.id
                            ? isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50'
                            : isDark ? 'border-gray-700 hover:border-gray-600 bg-gray-700/50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                        }`}
                      >
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{req.event_name}</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {req.event_type} · {new Date(req.event_start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                        </p>
                        {req.venue && <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>📍 {req.venue}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Right col: step forms ── */}
              <div className="lg:col-span-2">
                {!selectedRequest ? (
                  <div className={`rounded-2xl shadow p-16 text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="text-6xl mb-4">👈</div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Select an Event First</h3>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Choose from your approved events on the left</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">

                    {/* ── Step 2: Result & Awards ── */}
                    {step === 2 && (
                      <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className={`rounded-2xl shadow p-6 space-y-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                      >
                        <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-purple-50'}`}>
                          <span className="text-3xl">🎯</span>
                          <div>
                            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRequest.event_name}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedRequest.venue}</p>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>How did it go? *</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {RESULT_TYPES.map(rt => (
                              <button key={rt.value} type="button"
                                onClick={() => set('result_type', rt.value)}
                                className={`relative px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all text-center ${
                                  form.result_type === rt.value
                                    ? 'border-transparent text-white shadow-lg scale-[1.03]'
                                    : isDark ? 'border-gray-700 hover:border-gray-600 text-gray-300' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                }`}
                                style={form.result_type === rt.value ? {
                                  backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                                  background: rt.value==='winner'?'linear-gradient(135deg,#f59e0b,#d97706)':rt.value==='runner_up'?'linear-gradient(135deg,#9ca3af,#6b7280)':rt.value==='finalist'?'linear-gradient(135deg,#f97316,#d97706)':rt.value==='participated'?'linear-gradient(135deg,#60a5fa,#6366f1)':rt.value==='special_mention'?'linear-gradient(135deg,#a78bfa,#7c3aed)':'linear-gradient(135deg,#2dd4bf,#06b6d4)'
                                } : {}}
                              >
                                {rt.label}
                                {form.result_type === rt.value && <CheckCircleIcon className="w-4 h-4 absolute top-1.5 right-1.5" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Position / Rank</label>
                            <input type="text" value={form.position} onChange={e => set('position', e.target.value)}
                              placeholder="1st Place, Top 10, Best AI Project..."
                              className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Achievement Summary</label>
                            <input type="text" value={form.achievement_description} onChange={e => set('achievement_description', e.target.value)}
                              placeholder="One-line achievement..."
                              className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                            />
                          </div>
                        </div>

                        <AnimatePresence>
                          {isWinner && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-yellow-900/10 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                                <p className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                  <GiftIcon className="w-4 h-4" /> Prize & Award Details
                                </p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Trophy / Award Name</label>
                                    <input type="text" value={form.award_name} onChange={e => set('award_name', e.target.value)}
                                      placeholder="Best Innovation Award, Smart India Winner..."
                                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-yellow-200'} focus:outline-none`}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Cash Amount (₹)</label>
                                    <div className="relative">
                                      <CurrencyRupeeIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <input type="number" value={form.prize_amount} onChange={e => set('prize_amount', e.target.value)}
                                        placeholder="0"
                                        className={`w-full pl-8 pr-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-yellow-200'} focus:outline-none`}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Other Prizes / Gifts</label>
                                  <input type="text" value={form.prize_details} onChange={e => set('prize_details', e.target.value)}
                                    placeholder="Internship offer, funded trip, vouchers, goodies..."
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-yellow-200'} focus:outline-none`}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex justify-end">
                          <button onClick={() => setStep(3)}
                            className="btn btn-primary px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30"
                          >Continue →</button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 3: Story & Learnings ── */}
                    {step === 3 && (
                      <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className={`rounded-2xl shadow p-6 space-y-5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                      >
                        {[
                          { key: 'what_happened', label: 'What Happened at the Event?', placeholder: 'Describe the event — how many teams participated, problem statement you worked on, your approach, interesting moments, what made it memorable...', icon: ChatBubbleLeftRightIcon, color: 'text-purple-500', rows: 5, required: true },
                          { key: 'learning_outcomes', label: 'Key Learnings & Takeaways', placeholder: 'Tech stack explored, new skills gained, insights about the domain, what you would improve next time...', icon: LightBulbIcon, color: 'text-yellow-500', rows: 3 },
                          { key: 'team_reflection', label: 'Team Collaboration Reflection', placeholder: 'How the team worked together, individual strengths, challenges faced as a group, coordination strategies...', icon: UserGroupIcon, color: 'text-blue-500', rows: 3 },
                          { key: 'feedback', label: 'Additional Feedback (optional)', placeholder: 'Anything else you want to share with your HOD or staff...', icon: StarIcon, color: 'text-orange-500', rows: 2 },
                        ].map(field => (
                          <div key={field.key}>
                            <label className={`block text-sm font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              <field.icon className={`w-4 h-4 ${field.color}`} />
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <textarea value={form[field.key]} onChange={e => set(field.key, e.target.value)}
                              placeholder={field.placeholder} rows={field.rows}
                              className={`w-full px-4 py-3 rounded-xl border text-sm resize-none ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                            />
                          </div>
                        ))}
                        <div className="flex justify-between">
                          <button onClick={() => setStep(2)} className={`px-5 py-2 rounded-xl font-medium text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>← Back</button>
                          <button onClick={() => { if (!form.what_happened?.trim()) return toast.error('Please describe what happened'); setStep(4) }}
                            className="btn btn-primary px-8 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30"
                          >Continue →</button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 4: Files & Submit ── */}
                    {step === 4 && (
                      <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className={`rounded-2xl shadow p-6 space-y-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                      >
                        {/* Certificate */}
                        <div>
                          <label className={`block text-sm font-semibold mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            <DocumentTextIcon className="w-4 h-4 text-indigo-500" /> Certificate Upload
                          </label>
                          {certFile ? (
                            <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}`}>
                              <DocumentTextIcon className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{certFile.name}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{(certFile.size/1024).toFixed(0)} KB</p>
                              </div>
                              <button onClick={() => setCertFile(null)} className="text-red-400 hover:text-red-500 p-1"><XMarkIcon className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => certRef.current?.click()}
                              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all hover:border-indigo-400 ${isDark ? 'border-gray-600 hover:bg-indigo-900/10' : 'border-gray-200 hover:bg-indigo-50'}`}
                            >
                              <ArrowUpTrayIcon className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} />
                              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Click to upload certificate</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>PDF, JPG, PNG — max 10 MB</p>
                            </button>
                          )}
                          <input ref={certRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                            onChange={e => e.target.files?.[0] && setCertFile(e.target.files[0])} />
                        </div>

                        {/* Photos */}
                        <div>
                          <label className={`block text-sm font-semibold mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            <CameraIcon className="w-4 h-4 text-pink-500" /> Event Photos (up to 10)
                          </label>
                          <button type="button" onClick={() => photoRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-xl p-5 text-center transition-all hover:border-pink-400 mb-3 ${isDark ? 'border-gray-600 hover:bg-pink-900/10' : 'border-gray-200 hover:bg-pink-50'}`}
                          >
                            <CameraIcon className={`w-7 h-7 mx-auto mb-1 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} />
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Click to add hackathon photos</p>
                          </button>
                          <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                          {photoPreviews.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {photoPreviews.map((p, i) => (
                                <div key={i} className="relative group aspect-square">
                                  <img src={p.url} alt="" className="w-full h-full object-cover rounded-xl" />
                                  <button onClick={() => removePhoto(i)}
                                    className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  ><XMarkIcon className="w-3.5 h-3.5" /></button>
                                </div>
                              ))}
                              {photoFiles.length < 10 && (
                                <button onClick={() => photoRef.current?.click()}
                                  className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center ${isDark ? 'border-gray-600 text-gray-500' : 'border-gray-200 text-gray-400'}`}
                                ><span className="text-2xl">+</span></button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Summary */}
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Submission Summary</p>
                          <div className="space-y-2 text-sm">
                            {[
                              ['Event', selectedRequest.event_name, isDark ? 'text-white' : 'text-gray-900'],
                              ['Result', selectedType.label, isDark ? 'text-purple-400' : 'text-purple-600'],
                              form.award_name ? ['Award', form.award_name, isDark ? 'text-yellow-400' : 'text-yellow-600'] : null,
                              form.prize_amount ? ['Prize Money', `₹${Number(form.prize_amount).toLocaleString('en-IN')}`, 'text-green-500'] : null,
                              ['Certificate', certFile ? `✅ ${certFile.name}` : '—', certFile ? 'text-green-500' : isDark ? 'text-gray-500' : 'text-gray-400'],
                              ['Photos', photoFiles.length ? `✅ ${photoFiles.length} photo${photoFiles.length>1?'s':''}` : '—', photoFiles.length ? 'text-green-500' : isDark ? 'text-gray-500' : 'text-gray-400'],
                            ].filter(Boolean).map(([label, value, cls]) => (
                              <div key={label} className="flex justify-between items-start gap-2">
                                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
                                <span className={`font-medium text-right truncate max-w-[55%] ${cls}`}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between gap-3">
                          <button onClick={() => setStep(3)} className={`px-5 py-2 rounded-xl font-medium text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>← Back</button>
                          <button onClick={handleSubmit} disabled={submitting}
                            className="flex-1 btn btn-primary py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 disabled:opacity-60"
                          >
                            {submitting
                              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                              : <><SparklesIcon className="w-5 h-5" /> Submit Post-Event Report</>}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
