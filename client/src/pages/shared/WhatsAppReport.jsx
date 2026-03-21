import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import { whatsappAPI } from '../../services/api'
import {
  ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserGroupIcon, UserIcon,
  ArrowPathIcon, CheckCircleIcon, SignalIcon, QrCodeIcon, Cog6ToothIcon,
  BellIcon, WifiIcon, XCircleIcon, LinkIcon, ChevronRightIcon,
  CalendarDaysIcon, DocumentTextIcon, PhoneIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid, SignalIcon as SignalSolid } from '@heroicons/react/24/solid'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmtDate = d => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
const fmtDateFull = d => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const DEPT_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
]
const deptColor = (dept = '') => DEPT_COLORS[dept.charCodeAt(0) % DEPT_COLORS.length]

const Avatar = ({ name, color, size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-9 h-9 text-[11px]' : 'w-11 h-11 text-xs'
  return (
    <div className={`${sz} rounded-xl flex items-center justify-center font-black flex-shrink-0 ${color}`}>
      {name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
    </div>
  )
}

/* ── animations ───────────────────────────────────────────────────────────── */
const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [.22, 1, .36, 1] } }
const stagger = { animate: { transition: { staggerChildren: 0.08 } } }
const scaleIn = { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.3 } }

/* ── component ────────────────────────────────────────────────────────────── */
export default function WhatsAppReport() {
  const { isDark } = useTheme()
  const { user } = useAuthStore()
  const isHOD = user?.role === 'hod'

  // Section nav
  const [activeSection, setActiveSection] = useState('connect')

  // WA status
  const [waStatus, setWaStatus] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const pollRef = useRef(null)
  const timerRef = useRef(null)

  // Report
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Groups & contacts
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [staffList, setStaffList] = useState([])

  // Send
  const [sendMode, setSendMode] = useState('group')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [customTo, setCustomTo] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  // Settings
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [notifyGroupId, setNotifyGroupId] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configMsg, setConfigMsg] = useState(null)

  /* ── data fetching ──────────────────────────────────────────────────────── */
  useEffect(() => {
    fetchStatus()
    fetchStaffContacts()
    if (isHOD) fetchConfig()
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }
  }, [])

  const fetchStatus = async () => {
    try {
      const r = await whatsappAPI.getStatus()
      const s = r.data.data
      setWaStatus(s)
      if (s.status === 'ready') fetchGroups()
    } catch {}
  }

  const fetchGroups = async () => {
    setLoadingGroups(true)
    try {
      const r = await whatsappAPI.getGroups()
      setGroups(r.data.data || [])
    } catch {}
    finally { setLoadingGroups(false) }
  }

  const fetchStaffContacts = async () => {
    try {
      const r = await whatsappAPI.getStaffContacts()
      setStaffList(r.data.data || [])
    } catch {}
  }

  const fetchConfig = async () => {
    try {
      const r = await whatsappAPI.getConfig()
      const cfg = r.data.data
      setAutoEnabled(!!cfg.auto_enabled)
      setNotifyGroupId(cfg.notify_group_id || '')
    } catch {}
  }

  /* ── connect WA ─────────────────────────────────────────────────────────── */
  const handleConnect = async (force = false) => {
    setConnecting(true)
    setElapsed(0)
    try {
      await whatsappAPI.connect(force)
      setWaStatus(prev => ({ ...prev, status: 'connecting', error: null }))
    } catch {}

    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    let count = 0
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      count++
      try {
        const r = await whatsappAPI.getStatus()
        const s = r.data.data
        setWaStatus(s)
        if (s.status === 'ready') {
          clearInterval(pollRef.current)
          clearInterval(timerRef.current)
          setConnecting(false)
          fetchGroups()
        } else if (s.status === 'qr') {
          setConnecting(false)
          clearInterval(timerRef.current)
        } else if (s.status === 'error') {
          clearInterval(pollRef.current)
          clearInterval(timerRef.current)
          setConnecting(false)
        }
      } catch {}
      if (count > 50) {
        clearInterval(pollRef.current)
        clearInterval(timerRef.current)
        setConnecting(false)
      }
    }, 3000)
  }

  /* ── report ─────────────────────────────────────────────────────────────── */
  const fetchReport = async () => {
    setLoadingReport(true)
    setSendResult(null)
    try {
      const r = await whatsappAPI.getDailyReport(date)
      setReportData(r.data.data)
    } catch {}
    finally { setLoadingReport(false) }
  }

  const buildMessage = () => {
    if (!reportData) return ''
    const ods = reportData.odStudents || []
    const lvs = reportData.leaveStudents || []
    let msg = `📅 *EventPass Report — ${fmtDateFull(date)}*\n`
    msg += `\n📚 *OD Students (${ods.length}):*\n`
    if (!ods.length) msg += '  None\n'
    else ods.forEach((s, i) => {
      const loc = [s.year_of_study ? `Yr${s.year_of_study}` : '', s.section].filter(Boolean).join('-')
      msg += `  ${i + 1}. ${s.name}${loc ? ` (${loc})` : ''} → ${s.event_name} [${fmtDate(s.event_start_date)}–${fmtDate(s.event_end_date)}]\n`
    })
    msg += `\n🏥 *Leave Students (${lvs.length}):*\n`
    if (!lvs.length) msg += '  None\n'
    else lvs.forEach((s, i) => {
      const loc = [s.year_of_study ? `Yr${s.year_of_study}` : '', s.section].filter(Boolean).join('-')
      const type = s.leave_type?.replace(/_/g, ' ') || 'Leave'
      msg += `  ${i + 1}. ${s.name}${loc ? ` (${loc})` : ''} → ${type} [${fmtDate(s.from_date)}–${fmtDate(s.to_date)}, ${s.days_count}d]\n`
    })
    msg += `\n_Sent via EventPass portal_`
    return msg
  }

  /* ── recipient ──────────────────────────────────────────────────────────── */
  const getRecipient = () => {
    if (sendMode === 'group') {
      if (selectedGroup) return selectedGroup.id
      return customTo.trim()
    }
    if (selectedStaff) {
      const d = (selectedStaff.phone || '').replace(/\D/g, '')
      if (d.length === 10) return `91${d}`
      if (d.length === 12 && d.startsWith('91')) return d
      return d
    }
    const d = customTo.replace(/\D/g, '')
    if (d.length === 10) return `91${d}`
    if (d.length === 12) return d
    return customTo.trim()
  }

  /* ── send ───────────────────────────────────────────────────────────────── */
  const handleSend = async () => {
    const to = getRecipient()
    if (!to) { setSendResult({ ok: false, msg: 'Please select a recipient' }); return }
    setSending(true); setSendResult(null)
    try {
      await whatsappAPI.send(to, buildMessage())
      setSendResult({ ok: true, msg: 'Message sent successfully!' })
    } catch (e) {
      setSendResult({ ok: false, msg: 'Failed: ' + (e.response?.data?.message || e.message) })
    } finally { setSending(false) }
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true); setConfigMsg(null)
    try {
      await whatsappAPI.saveConfig({ auto_enabled: autoEnabled, notify_group_id: notifyGroupId, saved_contacts: [] })
      setConfigMsg({ ok: true, msg: 'Settings saved!' })
    } catch { setConfigMsg({ ok: false, msg: 'Failed to save' }) }
    finally { setSavingConfig(false) }
  }

  /* ── derived state ──────────────────────────────────────────────────────── */
  const waWebConnected = waStatus?.status === 'ready'
  const hasUltraMsg = !!waStatus?.ultramsgAvailable
  const canSend = waWebConnected || hasUltraMsg
  const message = buildMessage()
  const recipient = getRecipient()
  const hasError = waStatus?.status === 'error'
  const isQR = waStatus?.status === 'qr'
  const isConnecting = connecting || waStatus?.status === 'connecting'

  /* ── style tokens ───────────────────────────────────────────────────────── */
  const glass = isDark
    ? 'bg-gray-800/70 backdrop-blur-xl border border-gray-700/50'
    : 'bg-white/80 backdrop-blur-xl border border-gray-200/60'
  const cardClass = `rounded-3xl shadow-xl ${glass}`
  const inputClass = `w-full rounded-xl border-2 px-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 ${
    isDark
      ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:bg-gray-900/80'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:bg-white'
  }`
  const labelClass = `block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`
  const sectionTitle = `text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`
  const sectionDesc = `text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`

  /* ── section nav items ──────────────────────────────────────────────────── */
  const sections = [
    { key: 'connect', label: 'Connect', icon: LinkIcon, color: 'emerald' },
    { key: 'send', label: 'Send Report', icon: PaperAirplaneIcon, color: 'blue' },
    ...(isHOD ? [{ key: 'settings', label: 'Settings', icon: Cog6ToothIcon, color: 'purple' }] : []),
  ]

  const colorMap = {
    emerald: { active: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
    blue: { active: 'from-blue-500 to-indigo-500', badge: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', ring: 'ring-blue-500/20' },
    purple: { active: 'from-purple-500 to-pink-500', badge: 'bg-purple-500', light: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', ring: 'ring-purple-500/20' },
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8">

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600" />
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.07]" />
        <div className="absolute right-24 bottom-0 w-40 h-40 rounded-full bg-white/[0.04]" />
        <div className="absolute left-1/3 -bottom-8 w-24 h-24 rounded-full bg-teal-400/20" />

        <div className="relative z-10 px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">WhatsApp Center</h1>
                <p className="text-white/50 text-sm font-medium mt-0.5">Manage connections, send reports & configure</p>
              </div>
            </div>

            {/* Status badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl backdrop-blur-md ring-1 ${
                waWebConnected ? 'bg-emerald-400/15 ring-emerald-300/30 text-white'
                  : hasUltraMsg ? 'bg-amber-400/15 ring-amber-300/30 text-white'
                    : hasError ? 'bg-red-400/15 ring-red-300/30 text-white'
                      : 'bg-white/10 ring-white/10 text-white/60'
              }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                waWebConnected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                  : isQR || isConnecting ? 'bg-amber-400 animate-pulse'
                    : hasError ? 'bg-red-400'
                      : hasUltraMsg ? 'bg-amber-400'
                        : 'bg-gray-400'
              }`} />
              <span className="text-xs font-bold">
                {!waStatus ? 'Checking...'
                  : waWebConnected ? 'WA Web Connected'
                    : isQR ? 'Scan QR Code'
                      : isConnecting ? 'Connecting...'
                        : hasError ? 'Error'
                          : hasUltraMsg ? 'UltraMsg Ready'
                            : 'Disconnected'}
              </span>
            </motion.div>
          </div>

          {/* Section Navigation */}
          <div className="flex gap-2">
            {sections.map(({ key, label, icon: Icon, color }) => {
              const isActive = activeSection === key
              return (
                <button key={key} onClick={() => setActiveSection(key)}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'text-white shadow-lg'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}>
                  {isActive && (
                    <motion.div layoutId="activeSection"
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colorMap[color].active} shadow-lg`}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: CONNECT
         ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeSection === 'connect' && (
          <motion.div key="connect" {...fadeUp} className="space-y-6">

            {/* Connected state */}
            {waWebConnected && (
              <motion.div {...scaleIn} className={cardClass}>
                <div className="p-8 text-center space-y-5">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.4, delay: 0.2 }}
                    className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                    <CheckSolid className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <div>
                    <h2 className={sectionTitle}>WhatsApp Web Connected!</h2>
                    <p className={sectionDesc}>Your WhatsApp is linked and ready to send messages.</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <SignalSolid className="w-3.5 h-3.5" /> WA Web Active
                    </span>
                    {hasUltraMsg && (
                      <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <WifiIcon className="w-3.5 h-3.5" /> UltraMsg Backup
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveSection('send')}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Go to Send Report <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* QR Code state */}
            {isQR && (
              <motion.div {...scaleIn} className={cardClass}>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className={sectionTitle}>Scan QR Code</h2>
                      <p className={sectionDesc}>Link your WhatsApp to send messages</p>
                    </div>
                    <button onClick={fetchStatus}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-gray-700 text-emerald-400 hover:bg-gray-600' : 'bg-gray-100 text-emerald-600 hover:bg-gray-200'}`}>
                      <ArrowPathIcon className="w-3.5 h-3.5" /> Refresh QR
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* QR image */}
                    <motion.div
                      initial={{ rotate: -5, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="flex-shrink-0 p-4 bg-white rounded-3xl shadow-2xl shadow-emerald-500/10 ring-1 ring-gray-100">
                      <img src={waStatus.qr} alt="WhatsApp QR" className="w-60 h-60 object-contain" />
                    </motion.div>

                    {/* Steps */}
                    <div className="space-y-4 flex-1">
                      {[
                        { n: 1, text: 'Open WhatsApp on your phone' },
                        { n: 2, text: 'Tap Menu > Linked Devices' },
                        { n: 3, text: 'Tap Link a Device & scan this QR' },
                      ].map(({ n, text }, i) => (
                        <motion.div key={n}
                          initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 * (i + 1) }}
                          className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                            {n}
                          </div>
                          <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{text}</span>
                        </motion.div>
                      ))}
                      <p className={`text-xs pl-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        QR expires in ~60s. Click "Refresh QR" if it disappears.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Connecting state */}
            {isConnecting && !isQR && (
              <motion.div {...scaleIn} className={cardClass}>
                <div className="p-8 space-y-6">
                  <div className="text-center">
                    <h2 className={sectionTitle}>Connecting WhatsApp...</h2>
                    <p className={sectionDesc}>
                      {elapsed < 15 ? 'Starting WhatsApp client...'
                        : elapsed < 45 ? 'Launching browser (first run takes longer)...'
                          : elapsed < 90 ? 'Almost ready — waiting for QR code...'
                            : 'Still working... please wait'}
                    </p>
                  </div>

                  {/* Animated loader */}
                  <div className="flex justify-center">
                    <div className="relative w-24 h-24">
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-emerald-500/20"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                      <div className="absolute inset-2 rounded-full border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{elapsed}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-full"
                      initial={{ width: '2%' }}
                      animate={{ width: elapsed < 30 ? `${Math.min(elapsed * 2, 50)}%` : elapsed < 90 ? '75%' : '92%' }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                  </div>
                  <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    QR code will appear automatically. Do not close this page.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {hasError && (
              <motion.div {...scaleIn} className={cardClass}>
                <div className="p-8 text-center space-y-5">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <XCircleIcon className="w-10 h-10 text-red-500" />
                  </motion.div>
                  <div>
                    <h2 className={sectionTitle}>Connection Failed</h2>
                    <p className={`text-sm mt-1.5 max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {waStatus?.error || 'Could not start WhatsApp client. Try reconnecting.'}
                    </p>
                  </div>
                  <button onClick={() => handleConnect(true)}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    <ArrowPathIcon className="w-4 h-4" /> Reconnect
                  </button>
                  {hasUltraMsg && (
                    <p className={`text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>
                      You can still send via UltraMsg while WA Web is unavailable.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Not started state */}
            {!waWebConnected && !isQR && !isConnecting && !hasError && (
              <motion.div {...scaleIn} className={cardClass}>
                <div className="p-8 text-center space-y-6">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <QrCodeIcon className={`w-10 h-10 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                  </motion.div>
                  <div>
                    <h2 className={sectionTitle}>Connect WhatsApp Web</h2>
                    <p className={sectionDesc}>
                      Link your WhatsApp to send messages and see your groups.
                    </p>
                  </div>
                  <button onClick={() => handleConnect(false)} disabled={connecting}
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50">
                    <QrCodeIcon className="w-5 h-5" /> Connect WhatsApp Web
                  </button>

                  {hasUltraMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={`flex items-start gap-3 p-5 rounded-2xl text-left max-w-lg mx-auto ${isDark ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-amber-50 ring-1 ring-amber-100'}`}>
                      <WifiIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <div>
                        <p className={`text-sm font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>UltraMsg API Available</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-amber-400/60' : 'text-amber-600/80'}`}>
                          You can send messages via UltraMsg even without WA Web. Groups list requires WA Web.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: SEND REPORT
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'send' && (
          <motion.div key="send" {...fadeUp} {...stagger} className="space-y-6">

            {/* Channel indicator */}
            {canSend && (
              <motion.div {...fadeUp}
                className={`flex items-center gap-3 p-4 rounded-2xl ${
                  waWebConnected
                    ? isDark ? 'bg-emerald-900/20 ring-1 ring-emerald-800/30' : 'bg-emerald-50 ring-1 ring-emerald-100'
                    : isDark ? 'bg-amber-900/20 ring-1 ring-amber-800/30' : 'bg-amber-50 ring-1 ring-amber-100'
                }`}>
                {waWebConnected
                  ? <SignalSolid className="w-5 h-5 text-emerald-500" />
                  : <WifiIcon className="w-5 h-5 text-amber-500" />}
                <span className={`text-sm font-bold ${
                  waWebConnected
                    ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                    : isDark ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  Sending via {waWebConnected ? 'WhatsApp Web' : 'UltraMsg API'}
                </span>
                {waWebConnected && hasUltraMsg && (
                  <span className={`ml-auto text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+ UltraMsg backup</span>
                )}
              </motion.div>
            )}

            {!canSend && (
              <motion.div {...fadeUp}
                className={`flex items-center gap-3 p-4 rounded-2xl ${isDark ? 'bg-red-900/15 ring-1 ring-red-800/30' : 'bg-red-50 ring-1 ring-red-100'}`}>
                <XCircleIcon className="w-5 h-5 text-red-500" />
                <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                  No WhatsApp channel available.
                </span>
                <button onClick={() => setActiveSection('connect')}
                  className={`ml-auto text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Go to Connect →
                </button>
              </motion.div>
            )}

            {/* ── Date Picker Card ── */}
            <motion.div {...fadeUp} className={cardClass}>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    <CalendarDaysIcon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Select Report Date</h3>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Choose the date to generate attendance report</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                  </div>
                  <button onClick={fetchReport} disabled={loadingReport}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100">
                    {loadingReport
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> Fetching...</>
                      : <><DocumentTextIcon className="w-5 h-5" /> Fetch Report</>}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Report Results ── */}
            <AnimatePresence>
              {reportData && (
                <motion.div key="results" {...scaleIn} className={`${cardClass} overflow-hidden`}>
                  {/* Summary bar */}
                  <div className={`px-6 py-4 flex items-center gap-3 flex-wrap border-b ${isDark ? 'border-gray-700/50 bg-gray-800/50' : 'border-gray-100 bg-gray-50/60'}`}>
                    <CalendarDaysIcon className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{fmtDateFull(date)}</span>
                    <div className="flex gap-2 ml-auto">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                        📚 {reportData.odStudents.length} OD
                      </span>
                      <span className="px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-bold">
                        🏥 {reportData.leaveStudents.length} Leave
                      </span>
                    </div>
                  </div>

                  {/* OD list */}
                  {reportData.odStudents.length > 0 && (
                    <>
                      <div className={`px-6 py-2.5 ${isDark ? 'bg-emerald-900/10' : 'bg-emerald-50/50'}`}>
                        <span className={`text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400`}>On OD — {reportData.odStudents.length}</span>
                      </div>
                      <div className={`divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-100'}`}>
                        {reportData.odStudents.map((s, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`px-6 py-3.5 flex items-center gap-3 ${isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'} transition-colors`}>
                            <Avatar name={s.name} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{s.name}</p>
                                {s.department && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deptColor(s.department)}`}>{s.department}</span>}
                              </div>
                              <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.event_name}</p>
                            </div>
                            <span className={`text-[11px] font-semibold flex-shrink-0 px-3 py-1.5 rounded-lg ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                              {fmtDate(s.event_start_date)} – {fmtDate(s.event_end_date)}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Leave list */}
                  {reportData.leaveStudents.length > 0 && (
                    <>
                      <div className={`px-6 py-2.5 border-t ${isDark ? 'border-gray-700/50 bg-violet-900/10' : 'border-gray-100 bg-violet-50/50'}`}>
                        <span className={`text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400`}>On Leave — {reportData.leaveStudents.length}</span>
                      </div>
                      <div className={`divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-100'}`}>
                        {reportData.leaveStudents.map((s, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`px-6 py-3.5 flex items-center gap-3 ${isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'} transition-colors`}>
                            <Avatar name={s.name} color="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{s.name}</p>
                                {s.department && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deptColor(s.department)}`}>{s.department}</span>}
                              </div>
                              <p className={`text-xs mt-0.5 capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {s.leave_type?.replace(/_/g, ' ')} — {s.days_count} days
                              </p>
                            </div>
                            <span className={`text-[11px] font-semibold flex-shrink-0 px-3 py-1.5 rounded-lg ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                              {fmtDate(s.from_date)} – {fmtDate(s.to_date)}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Empty state */}
                  {reportData.odStudents.length === 0 && reportData.leaveStudents.length === 0 && (
                    <div className={`py-16 px-6 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p className="text-4xl mb-3">🎉</p>
                      <p className="text-sm font-bold">No students on OD or leave for this date!</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Recipient + Send Card ── */}
            <motion.div {...fadeUp} className={cardClass}>
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                    <PaperAirplaneIcon className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Choose Recipient & Send</h3>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Select who should receive the report</p>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className={`flex gap-1.5 p-1.5 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
                  {[{ key: 'group', Icon: UserGroupIcon, label: 'Group' }, { key: 'individual', Icon: UserIcon, label: 'Individual' }].map(({ key, Icon, label }) => (
                    <button key={key}
                      onClick={() => { setSendMode(key); setSelectedGroup(null); setSelectedStaff(null); setCustomTo('') }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                        sendMode === key
                          ? isDark ? 'bg-gray-700 text-white shadow-lg' : 'bg-white text-gray-900 shadow-lg shadow-gray-200/50'
                          : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      }`}>
                      <Icon className="w-4.5 h-4.5" /> {label}
                    </button>
                  ))}
                </div>

                {/* GROUP mode */}
                {sendMode === 'group' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {waWebConnected && groups.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <label className={labelClass}>Your WhatsApp Groups</label>
                          <button onClick={fetchGroups} disabled={loadingGroups}
                            className={`flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-40 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            <ArrowPathIcon className={`w-3.5 h-3.5 ${loadingGroups ? 'animate-spin' : ''}`} /> Refresh
                          </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {groups.map(g => (
                            <button key={g.id} onClick={() => { setSelectedGroup(g); setCustomTo('') }}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm text-left transition-all duration-200 ${
                                selectedGroup?.id === g.id
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                                  : isDark ? 'bg-gray-900/40 text-gray-300 hover:bg-gray-700/40 ring-1 ring-gray-700/50' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 ring-1 ring-gray-100'
                              }`}>
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                selectedGroup?.id === g.id ? 'bg-white/20' : isDark ? 'bg-gray-700' : 'bg-gray-200'
                              }`}>
                                {selectedGroup?.id === g.id ? <CheckCircleIcon className="w-5 h-5" /> : <UserGroupIcon className="w-4 h-4 opacity-60" />}
                              </div>
                              <span className="font-bold truncate">{g.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {!waWebConnected && (
                      <div className={`flex items-start gap-3 p-4 rounded-2xl text-xs ${isDark ? 'bg-gray-900/30 text-gray-400 ring-1 ring-gray-700/50' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-100'}`}>
                        <QrCodeIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                        <span>{hasUltraMsg
                          ? 'Group list requires WA Web. Enter group ID manually below, or connect WA Web first.'
                          : 'Connect WhatsApp Web first to see your groups.'}</span>
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>{groups.length > 0 ? 'Or enter Group ID manually' : 'Group ID'}</label>
                      <input type="text" value={selectedGroup ? '' : customTo}
                        onChange={e => { setCustomTo(e.target.value); setSelectedGroup(null) }}
                        placeholder="120363xxxxxxxx@g.us" className={inputClass} />
                    </div>
                  </motion.div>
                )}

                {/* INDIVIDUAL mode */}
                {sendMode === 'individual' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {staffList.length > 0 && (
                      <>
                        <label className={labelClass}>Staff & HOD</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {staffList.map(s => (
                            <button key={s.id} onClick={() => { setSelectedStaff(s); setCustomTo('') }}
                              disabled={!s.phone}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm text-left transition-all duration-200 disabled:opacity-25 ${
                                selectedStaff?.id === s.id
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                                  : isDark ? 'bg-gray-900/40 text-gray-300 hover:bg-gray-700/40 ring-1 ring-gray-700/50' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 ring-1 ring-gray-100'
                              }`}>
                              <Avatar name={s.name}
                                color={selectedStaff?.id === s.id ? 'bg-white/20 text-white' : (s.role === 'hod' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300')} />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold leading-tight truncate">
                                  {s.name}
                                  <span className={`ml-2 text-[10px] font-bold ${selectedStaff?.id === s.id ? 'text-white/60' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {s.role === 'hod' ? 'HOD' : 'Staff'}
                                  </span>
                                </p>
                                <p className={`text-xs mt-0.5 ${selectedStaff?.id === s.id ? 'text-white/50' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {s.phone ? `📱 ${s.phone}` : '⚠ No phone on file'}
                                </p>
                              </div>
                              {selectedStaff?.id === s.id && <CheckSolid className="w-5 h-5 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <div>
                      <label className={labelClass}>{staffList.length > 0 ? 'Or enter phone manually' : 'Phone Number'}</label>
                      <input type="text" value={selectedStaff ? '' : customTo}
                        onChange={e => { setCustomTo(e.target.value); setSelectedStaff(null) }}
                        placeholder="91XXXXXXXXXX" className={inputClass} />
                    </div>
                  </motion.div>
                )}

                {/* Message preview */}
                <AnimatePresence>
                  {message && (
                    <motion.div {...scaleIn}>
                      <label className={labelClass}>Message Preview</label>
                      <div className={`mt-2 rounded-2xl rounded-tl-md p-5 text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-52 overflow-y-auto ${
                        isDark ? 'bg-emerald-950/30 ring-1 ring-emerald-800/30 text-emerald-100' : 'bg-emerald-50 ring-1 ring-emerald-100 text-emerald-900'
                      }`}>
                        {message}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Send button */}
                <div className="space-y-3 pt-2">
                  <button onClick={handleSend}
                    disabled={sending || !recipient || !canSend || !reportData}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none">
                    {sending
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> Sending...</>
                      : <><PaperAirplaneIcon className="w-5 h-5" /> Send WhatsApp Message</>}
                  </button>
                  {!canSend && (
                    <p className={`text-xs text-center font-medium ${isDark ? 'text-red-400/80' : 'text-red-500'}`}>
                      No WhatsApp channel available — go to Connect section first
                    </p>
                  )}
                  {canSend && !reportData && (
                    <p className={`text-xs text-center font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      ↑ Fetch a report first before sending
                    </p>
                  )}
                  {canSend && reportData && !recipient && (
                    <p className={`text-xs text-center font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      ↑ Select a group or enter a number above
                    </p>
                  )}
                </div>

                {/* Send result toast */}
                <AnimatePresence>
                  {sendResult && (
                    <motion.div key="res" initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className={`rounded-2xl px-5 py-4 text-sm font-bold text-center ${
                        sendResult.ok
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
                      }`}>
                      {sendResult.ok ? '✅ ' : '❌ '}{sendResult.msg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3: SETTINGS (HOD only)
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'settings' && isHOD && (
          <motion.div key="settings" {...fadeUp} className="space-y-6">

            {/* Auto Notifications Card */}
            <motion.div {...fadeUp} className={cardClass}>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                    <BellIcon className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Auto Notifications</h3>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Configure automatic WhatsApp alerts</p>
                  </div>
                </div>

                <div className={`flex items-center justify-between gap-4 p-5 rounded-2xl ${isDark ? 'bg-gray-900/40 ring-1 ring-gray-700/50' : 'bg-gray-50 ring-1 ring-gray-100'}`}>
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Automatic WhatsApp Alerts</p>
                    <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Auto-notify staff & HOD when OD / leave is approved or rejected.
                    </p>
                  </div>
                  <button onClick={() => setAutoEnabled(v => !v)}
                    className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${autoEnabled ? 'bg-gradient-to-r from-purple-500 to-pink-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                    <motion.span
                      animate={{ x: autoEnabled ? 24 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="inline-block h-7 w-7 mt-0.5 ml-0.5 rounded-full bg-white shadow-lg"
                    />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Daily Summary Group Card */}
            <motion.div {...fadeUp} className={cardClass}>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                    <UserGroupIcon className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Daily Summary Group</h3>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Auto-send attendance report to a group</p>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl ${isDark ? 'bg-purple-900/30 text-purple-400 ring-1 ring-purple-800/30' : 'bg-purple-50 text-purple-600 ring-1 ring-purple-100'}`}>
                    ⏰ 8:30 AM
                  </span>
                </div>

                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  A daily attendance report is sent to this group at 8:30 AM when auto-notifications are enabled.
                </p>

                {groups.length > 0 && (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {groups.map(g => (
                      <button key={g.id} onClick={() => setNotifyGroupId(g.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm text-left transition-all duration-200 ${
                          notifyGroupId === g.id
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : isDark ? 'bg-gray-900/40 text-gray-300 hover:bg-gray-700/40 ring-1 ring-gray-700/50' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 ring-1 ring-gray-100'
                        }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notifyGroupId === g.id ? 'bg-white/20' : isDark ? 'bg-gray-700' : 'bg-gray-200'
                        }`}>
                          {notifyGroupId === g.id ? <CheckCircleIcon className="w-5 h-5" /> : <UserGroupIcon className="w-4 h-4 opacity-60" />}
                        </div>
                        <span className="font-bold truncate">{g.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className={labelClass}>{groups.length > 0 ? 'Or enter Group ID manually' : 'Group ID'}</label>
                  <input type="text" value={groups.find(g => g.id === notifyGroupId) ? '' : notifyGroupId}
                    onChange={e => setNotifyGroupId(e.target.value)}
                    placeholder="120363xxxxxxxx@g.us"
                    className={inputClass} />
                </div>
              </div>
            </motion.div>

            {/* Save Settings Card */}
            <motion.div {...fadeUp} className={cardClass}>
              <div className="p-6 space-y-4">
                <button onClick={handleSaveConfig} disabled={savingConfig}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100">
                  {savingConfig
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> Saving...</>
                    : <><CheckCircleIcon className="w-5 h-5" /> Save Settings</>}
                </button>
                <AnimatePresence>
                  {configMsg && (
                    <motion.div key="cfg" initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className={`rounded-2xl px-5 py-4 text-sm font-bold text-center ${
                        configMsg.ok
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
                      }`}>
                      {configMsg.ok ? '✅ ' : '❌ '}{configMsg.msg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
