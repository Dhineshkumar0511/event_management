import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import { whatsappAPI } from '../../services/api'
import {
  ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserGroupIcon, UserIcon,
  ArrowPathIcon, CheckCircleIcon, QrCodeIcon, Cog6ToothIcon,
  BellIcon, WifiIcon, XCircleIcon, LinkIcon, ChevronRightIcon,
  CalendarDaysIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid, SignalIcon as SignalSolid } from '@heroicons/react/24/solid'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'
const fmtDateFull = d => d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''

const Initials = ({ name, cls }) => (
  <div className={`rounded-xl flex items-center justify-center font-black flex-shrink-0 ${cls}`}>
    {name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
  </div>
)

/* ── component ────────────────────────────────────────────────────────────── */
export default function WhatsAppReport() {
  const { isDark } = useTheme()
  const { user } = useAuthStore()
  const isHOD = user?.role === 'hod'

  const [tab, setTab] = useState('connect')

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
  const [fetchError, setFetchError] = useState(null)

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
    try { setGroups((await whatsappAPI.getGroups()).data.data || []) }
    catch {} finally { setLoadingGroups(false) }
  }

  const fetchStaffContacts = async () => {
    try { setStaffList((await whatsappAPI.getStaffContacts()).data.data || []) } catch {}
  }

  const fetchConfig = async () => {
    try {
      const cfg = (await whatsappAPI.getConfig()).data.data
      setAutoEnabled(!!cfg.auto_enabled)
      setNotifyGroupId(cfg.notify_group_id || '')
    } catch {}
  }

  /* ── connect ────────────────────────────────────────────────────────────── */
  const handleConnect = async (force = false) => {
    setConnecting(true); setElapsed(0)
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
        const s = (await whatsappAPI.getStatus()).data.data
        setWaStatus(s)
        if (s.status === 'ready') {
          clearInterval(pollRef.current); clearInterval(timerRef.current)
          setConnecting(false); fetchGroups()
        } else if (s.status === 'qr') {
          setConnecting(false); clearInterval(timerRef.current)
        } else if (s.status === 'error') {
          clearInterval(pollRef.current); clearInterval(timerRef.current); setConnecting(false)
        }
      } catch {}
      if (count > 50) { clearInterval(pollRef.current); clearInterval(timerRef.current); setConnecting(false) }
    }, 3000)
  }

  /* ── report ─────────────────────────────────────────────────────────────── */
  const fetchReport = async () => {
    setLoadingReport(true); setSendResult(null); setFetchError(null)
    try {
      const res = await whatsappAPI.getDailyReport(date)
      setReportData(res.data.data)
    } catch (e) {
      const msg = e.response?.data?.message
        || (e.code === 'ERR_NETWORK' || !e.response ? 'Cannot reach server — make sure the backend is running' : null)
        || e.message
        || 'Failed to fetch report'
      setFetchError(msg)
    } finally { setLoadingReport(false) }
  }

  const buildMessage = () => {
    if (!reportData) return ''
    const ods = reportData.odStudents || [], lvs = reportData.leaveStudents || []
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
      msg += `  ${i + 1}. ${s.name}${loc ? ` (${loc})` : ''} → ${(s.leave_type || 'Leave').replace(/_/g, ' ')} [${fmtDate(s.from_date)}–${fmtDate(s.to_date)}, ${s.days_count}d]\n`
    })
    msg += `\n_Sent via EventPass portal_`
    return msg
  }

  const getRecipient = () => {
    if (sendMode === 'group') return selectedGroup ? selectedGroup.id : customTo.trim()
    if (selectedStaff) {
      const d = (selectedStaff.phone || '').replace(/\D/g, '')
      return d.length === 10 ? `91${d}` : d
    }
    const d = customTo.replace(/\D/g, '')
    return d.length === 10 ? `91${d}` : customTo.trim()
  }

  const handleSend = async () => {
    const to = getRecipient()
    if (!to) { setSendResult({ ok: false, msg: 'Select a recipient first' }); return }
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

  /* ── derived ────────────────────────────────────────────────────────────── */
  const waOK = waStatus?.status === 'ready'
  const hasUM = !!waStatus?.ultramsgAvailable
  const canSend = waOK || hasUM
  const hasErr = waStatus?.status === 'error'
  const isQR = waStatus?.status === 'qr'
  const isBusy = connecting || waStatus?.status === 'connecting'
  const message = buildMessage()
  const recipient = getRecipient()

  /* ── style tokens ───────────────────────────────────────────────────────── */
  const card = isDark
    ? 'bg-gray-800/60 border border-gray-700/40 rounded-2xl'
    : 'bg-white border border-gray-200/80 rounded-2xl shadow-sm'
  const input = `w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200 border ${
    isDark
      ? 'bg-gray-900/60 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500/30'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500/30'
  }`
  const lbl = `block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`
  const muted = isDark ? 'text-gray-400' : 'text-gray-500'
  const heading = `text-[15px] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`
  const subtext = `text-xs ${muted}`

  const tabs = [
    { key: 'connect', label: 'Connect', Icon: LinkIcon },
    { key: 'send', label: 'Send Report', Icon: PaperAirplaneIcon },
    ...(isHOD ? [{ key: 'settings', label: 'Settings', Icon: Cog6ToothIcon }] : []),
  ]

  /* ── status label ───────────────────────────────────────────────────────── */
  const statusLabel = !waStatus ? 'Checking…'
    : waOK ? 'Connected' : isQR ? 'Scan QR'
    : isBusy ? 'Connecting…' : hasErr ? 'Error' : hasUM ? 'UltraMsg' : 'Offline'
  const statusDot = waOK ? 'bg-green-400' : isQR || isBusy ? 'bg-amber-400 animate-pulse' : hasErr ? 'bg-red-400' : hasUM ? 'bg-amber-400' : 'bg-gray-400'

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* ═══════════════ HEADER ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [.22, 1, .36, 1] }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700" />
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/[.06]" />
        <div className="absolute left-1/2 -bottom-10 w-36 h-36 rounded-full bg-teal-400/10" />

        <div className="relative z-10 px-6 py-5 sm:px-8">
          {/* Title row */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white leading-tight">WhatsApp Center</h1>
                <p className="text-white/40 text-xs font-medium mt-0.5">Connect &middot; Send &middot; Configure</p>
              </div>
            </div>

            {/* live status pill */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[11px] font-bold backdrop-blur-md ${
              waOK ? 'bg-green-400/15 text-green-200 ring-1 ring-green-400/20'
                : hasUM ? 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/20'
                  : 'bg-white/10 text-white/60 ring-1 ring-white/10'
            }`}>
              <span className={`w-2 h-2 rounded-full ${statusDot}`} />
              {statusLabel}
            </div>
          </div>

          {/* tab bar */}
          <div className="flex gap-1.5">
            {tabs.map(({ key, label, Icon }) => {
              const active = tab === key
              return (
                <button key={key} onClick={() => setTab(key)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    active ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}>
                  {active && (
                    <motion.div layoutId="tab-pill"
                      className="absolute inset-0 rounded-xl bg-white/15 ring-1 ring-white/10"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }} />
                  )}
                  <span className="relative flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ TAB CONTENT ═══════════════ */}
      <AnimatePresence mode="wait">

        {/* ─────────────── CONNECT TAB ─────────────── */}
        {tab === 'connect' && (
          <motion.div key="t-connect"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* CONNECTED */}
            {waOK && (
              <div className={card}>
                <div className="p-7 text-center space-y-4">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-green-900/25' : 'bg-green-50'}`}>
                    <CheckSolid className="w-9 h-9 text-green-500" />
                  </div>
                  <div>
                    <p className={heading}>WhatsApp Web Connected</p>
                    <p className={`text-xs mt-1 ${muted}`}>Ready to send messages via WhatsApp Web</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold ${isDark ? 'bg-green-900/25 text-green-400' : 'bg-green-50 text-green-600'}`}>
                      <SignalSolid className="w-3 h-3" /> WhatsApp Web
                    </span>
                    {hasUM && (
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold ${isDark ? 'bg-amber-900/25 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <WifiIcon className="w-3 h-3" /> UltraMsg Backup
                      </span>
                    )}
                  </div>
                  <button onClick={() => setTab('send')}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-500 transition-colors">
                    Send Report <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* QR */}
            {isQR && (
              <div className={card}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className={heading}>Scan QR Code</p>
                      <p className={subtext}>Open WhatsApp on your phone to link</p>
                    </div>
                    <button onClick={fetchStatus}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${isDark ? 'bg-gray-700 text-green-400 hover:bg-gray-600' : 'bg-gray-100 text-green-600 hover:bg-gray-200'}`}>
                      <ArrowPathIcon className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="p-3 bg-white rounded-2xl shadow-lg flex-shrink-0">
                      <img src={waStatus.qr} alt="QR" className="w-52 h-52" />
                    </div>
                    <div className="space-y-3 flex-1">
                      {['Open WhatsApp on your phone', 'Tap Menu → Linked Devices', 'Tap "Link a Device" and scan'].map((txt, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'}`}>{i + 1}</span>
                          <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{txt}</span>
                        </div>
                      ))}
                      <p className={`text-[11px] pl-1 ${muted}`}>QR refreshes automatically. Click Refresh if expired.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONNECTING */}
            {isBusy && !isQR && (
              <div className={card}>
                <div className="p-7 space-y-5 text-center">
                  <p className={heading}>Connecting WhatsApp…</p>
                  <p className={subtext}>
                    {elapsed < 15 ? 'Starting client…' : elapsed < 45 ? 'Launching browser…' : elapsed < 90 ? 'Waiting for QR…' : 'Still working…'}
                  </p>
                  <div className="flex justify-center">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border-4 border-green-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="absolute inset-2 rounded-full border-[3px] border-t-green-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                      <span className={`absolute inset-0 flex items-center justify-center text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{elapsed}s</span>
                    </div>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-500"
                      animate={{ width: `${Math.min(2 + elapsed * 1.2, 95)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ERROR */}
            {hasErr && (
              <div className={card}>
                <div className="p-7 text-center space-y-4">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <XCircleIcon className="w-9 h-9 text-red-500" />
                  </div>
                  <p className={heading}>Connection Failed</p>
                  {/* Detect hosted environment (Chrome/Puppeteer not available) */}
                  {/chrome|puppeteer/i.test(waStatus?.error || '') ? (
                    <div className="space-y-3 max-w-md mx-auto">
                      <div className={`flex items-start gap-3 p-4 rounded-xl text-left ${isDark ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-amber-50 ring-1 ring-amber-200'}`}>
                        <WifiIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        <div>
                          <p className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Cloud Hosting Detected</p>
                          <p className={`text-[11px] mt-1 leading-relaxed ${isDark ? 'text-amber-400/70' : 'text-amber-600/80'}`}>
                            WhatsApp Web requires a Chrome browser which isn't available on cloud platforms like Render.
                            Use <strong>UltraMsg API</strong> to send messages from hosted environments, or connect locally.
                          </p>
                        </div>
                      </div>
                      {hasUM && (
                        <button onClick={() => setTab('send')}
                          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-400 transition-colors">
                          <PaperAirplaneIcon className="w-3.5 h-3.5" /> Send via UltraMsg <ChevronRightIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className={`text-xs max-w-sm mx-auto ${muted}`}>{waStatus?.error || 'Could not connect. Try again.'}</p>
                      <button onClick={() => handleConnect(true)}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-500 transition-colors">
                        <ArrowPathIcon className="w-3.5 h-3.5" /> Reconnect
                      </button>
                    </>
                  )}
                  {hasUM && !/chrome|puppeteer/i.test(waStatus?.error || '') && <p className={`text-[11px] ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>UltraMsg is still available for sending.</p>}
                </div>
              </div>
            )}

            {/* NOT STARTED */}
            {!waOK && !isQR && !isBusy && !hasErr && (
              <div className={card}>
                <div className="p-7 text-center space-y-5">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                    className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <QrCodeIcon className={`w-9 h-9 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                  </motion.div>
                  <div>
                    <p className={heading}>Connect WhatsApp Web</p>
                    <p className={`text-xs mt-1 ${muted}`}>Link your WhatsApp to send messages and see groups</p>
                  </div>
                  <button onClick={() => handleConnect(false)} disabled={connecting}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-500 active:scale-[.97] transition-all disabled:opacity-50">
                    <QrCodeIcon className="w-4 h-4" /> Connect WhatsApp
                  </button>
                  {hasUM && (
                    <div className={`flex items-start gap-2.5 p-4 rounded-xl text-left max-w-md mx-auto ${isDark ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-amber-50 ring-1 ring-amber-100'}`}>
                      <WifiIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <div>
                        <p className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>UltraMsg Available</p>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-amber-400/60' : 'text-amber-600/70'}`}>
                          Send messages via UltraMsg API even without WA Web. Group list requires WA Web.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────── SEND REPORT TAB ─────────────── */}
        {tab === 'send' && (
          <motion.div key="t-send"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* channel banner */}
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold ${
              canSend
                ? waOK
                  ? isDark ? 'bg-green-900/20 text-green-400 ring-1 ring-green-800/30' : 'bg-green-50 text-green-700 ring-1 ring-green-100'
                  : isDark ? 'bg-amber-900/20 text-amber-400 ring-1 ring-amber-800/30' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                : isDark ? 'bg-red-900/15 text-red-400 ring-1 ring-red-800/30' : 'bg-red-50 text-red-600 ring-1 ring-red-100'
            }`}>
              {canSend
                ? <>{waOK ? <SignalSolid className="w-4 h-4" /> : <WifiIcon className="w-4 h-4" />} Sending via {waOK ? 'WhatsApp Web' : 'UltraMsg'}</>
                : <><XCircleIcon className="w-4 h-4" /> No channel available</>}
              {!canSend && (
                <button onClick={() => setTab('connect')} className="ml-auto underline underline-offset-2">Connect →</button>
              )}
              {waOK && hasUM && <span className={`ml-auto font-medium opacity-60`}>+ UltraMsg backup</span>}
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* LEFT: Date + Report */}
              <div className="space-y-4">

                {/* Date card */}
                <div className={card}>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                        <CalendarDaysIcon className={`w-4.5 h-4.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <p className={heading}>Report Date</p>
                    </div>

                    <input type="date" value={date} onChange={e => { setDate(e.target.value); setFetchError(null); setReportData(null) }} className={input} />
                    <button onClick={fetchReport} disabled={loadingReport}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 active:scale-[.97] transition-all disabled:opacity-50">
                      {loadingReport
                        ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        : <DocumentTextIcon className="w-4 h-4" />}
                      {loadingReport ? 'Loading…' : 'Fetch Report'}
                    </button>
                  </div>
                </div>

                {/* Report results */}
                {reportData ? (
                  <div className={`${card} overflow-hidden`}>
                    {/* summary header */}
                    <div className={`px-5 py-3 flex items-center gap-2 flex-wrap border-b ${isDark ? 'border-gray-700/50 bg-gray-800/40' : 'border-gray-100 bg-gray-50/60'}`}>
                      <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{fmtDateFull(date)}</span>
                      <div className="flex gap-1.5 ml-auto">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'}`}>
                          📚 {reportData.odStudents?.length || 0} OD
                        </span>
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${isDark ? 'bg-violet-900/20 text-violet-400' : 'bg-violet-50 text-violet-700'}`}>
                          🏥 {reportData.leaveStudents?.length || 0} Leave
                        </span>
                      </div>
                    </div>

                    {/* OD students */}
                    {(reportData.odStudents?.length || 0) > 0 && (
                      <>
                        <div className={`px-5 py-2 ${isDark ? 'bg-green-900/10' : 'bg-green-50/60'}`}>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
                            On Duty — {reportData.odStudents.length}
                          </span>
                        </div>
                        <div className={`divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-50'}`}>
                          {reportData.odStudents.map((s, i) => (
                            <div key={i} className={`px-5 py-3 flex items-center gap-3 ${isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'} transition-colors`}>
                              <Initials name={s.name} cls={`w-8 h-8 text-[10px] ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{s.name}</p>
                                <p className={`text-[11px] truncate ${muted}`}>{s.event_name}</p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md flex-shrink-0 ${isDark ? 'bg-gray-700/40 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                {fmtDate(s.event_start_date)} – {fmtDate(s.event_end_date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Leave students */}
                    {(reportData.leaveStudents?.length || 0) > 0 && (
                      <>
                        <div className={`px-5 py-2 border-t ${isDark ? 'border-gray-700/50 bg-violet-900/10' : 'border-gray-100 bg-violet-50/60'}`}>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                            On Leave — {reportData.leaveStudents.length}
                          </span>
                        </div>
                        <div className={`divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-50'}`}>
                          {reportData.leaveStudents.map((s, i) => (
                            <div key={i} className={`px-5 py-3 flex items-center gap-3 ${isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'} transition-colors`}>
                              <Initials name={s.name} cls={`w-8 h-8 text-[10px] ${isDark ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-100 text-violet-700'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{s.name}</p>
                                <p className={`text-[11px] capitalize ${muted}`}>{(s.leave_type || '').replace(/_/g, ' ')} — {s.days_count}d</p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md flex-shrink-0 ${isDark ? 'bg-gray-700/40 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                {fmtDate(s.from_date)} – {fmtDate(s.to_date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* empty */}
                    {(!reportData.odStudents?.length && !reportData.leaveStudents?.length) && (
                      <div className={`py-12 text-center ${muted}`}>
                        <p className="text-3xl mb-2">🎉</p>
                        <p className="text-sm font-semibold">No one is on OD or leave today!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Error or empty state */
                  fetchError ? (
                    <div className={`${card} flex-1`}>
                      <div className="py-16 px-6 text-center space-y-3">
                        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                          <XCircleIcon className="w-7 h-7 text-red-500" />
                        </div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>Failed to load report</p>
                        <p className={`text-[11px] max-w-xs mx-auto ${muted}`}>{fetchError}</p>
                        <button onClick={fetchReport}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                          <ArrowPathIcon className="w-3.5 h-3.5" /> Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`${card} flex-1`}>
                      <div className={`py-20 text-center ${muted}`}>
                        <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-gray-700/40' : 'bg-gray-100'}`}>
                          <DocumentTextIcon className="w-7 h-7 opacity-40" />
                        </div>
                        <p className="text-sm font-semibold">No report loaded</p>
                        <p className="text-[11px] mt-1.5 opacity-60">Pick a date above and click Fetch Report</p>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* RIGHT: Recipient + Send */}
              <div className="space-y-4">

                {/* Recipient card */}
                <div className={card}>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                        <PaperAirplaneIcon className={`w-4.5 h-4.5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className={heading}>Recipient</p>
                        <p className={`text-[11px] ${muted}`}>Who gets the report?</p>
                      </div>
                    </div>

                    {/* mode toggle */}
                    <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
                      {[{ k: 'group', I: UserGroupIcon, l: 'Group' }, { k: 'individual', I: UserIcon, l: 'Person' }].map(({ k, I, l }) => (
                        <button key={k}
                          onClick={() => { setSendMode(k); setSelectedGroup(null); setSelectedStaff(null); setCustomTo('') }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                            sendMode === k
                              ? isDark ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow-sm'
                              : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                          }`}>
                          <I className="w-3.5 h-3.5" /> {l}
                        </button>
                      ))}
                    </div>

                    {/* GROUP CHOICES */}
                    {sendMode === 'group' && (
                      <div className="space-y-3">
                        {waOK && groups.length > 0 && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className={lbl}>Groups</span>
                              <button onClick={fetchGroups} disabled={loadingGroups}
                                className={`text-[11px] font-bold ${isDark ? 'text-green-400' : 'text-green-600'} disabled:opacity-40`}>
                                <ArrowPathIcon className={`inline w-3 h-3 mr-0.5 ${loadingGroups ? 'animate-spin' : ''}`} />Refresh
                              </button>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {groups.map(g => {
                                const sel = selectedGroup?.id === g.id
                                return (
                                  <button key={g.id} onClick={() => { setSelectedGroup(g); setCustomTo('') }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-all ${
                                      sel
                                        ? 'bg-green-600 text-white shadow'
                                        : isDark ? 'bg-gray-900/40 text-gray-300 hover:bg-gray-700/40 ring-1 ring-gray-700/40' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 ring-1 ring-gray-100'
                                    }`}>
                                    <UserGroupIcon className={`w-4 h-4 flex-shrink-0 ${sel ? 'text-white/70' : 'opacity-40'}`} />
                                    <span className="font-bold truncate">{g.name}</span>
                                    {sel && <CheckSolid className="w-4 h-4 ml-auto flex-shrink-0" />}
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                        {!waOK && (
                          <p className={`text-[11px] p-3 rounded-lg ${isDark ? 'bg-gray-900/30 text-gray-400 ring-1 ring-gray-700/40' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-100'}`}>
                            {hasUM ? 'Group list needs WA Web. Enter ID manually.' : 'Connect WA Web to see groups.'}
                          </p>
                        )}
                        <div>
                          <label className={lbl}>{groups.length ? 'Or enter ID' : 'Group ID'}</label>
                          <input type="text" value={selectedGroup ? '' : customTo}
                            onChange={e => { setCustomTo(e.target.value); setSelectedGroup(null) }}
                            placeholder="120363xxxx@g.us" className={input} />
                        </div>
                      </div>
                    )}

                    {/* INDIVIDUAL CHOICES */}
                    {sendMode === 'individual' && (
                      <div className="space-y-3">
                        {staffList.length > 0 && (
                          <>
                            <span className={lbl}>Staff & HOD</span>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {staffList.map(s => {
                                const sel = selectedStaff?.id === s.id
                                return (
                                  <button key={s.id} onClick={() => { setSelectedStaff(s); setCustomTo('') }}
                                    disabled={!s.phone}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-all disabled:opacity-25 ${
                                      sel
                                        ? 'bg-green-600 text-white shadow'
                                        : isDark ? 'bg-gray-900/40 text-gray-300 hover:bg-gray-700/40 ring-1 ring-gray-700/40' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 ring-1 ring-gray-100'
                                    }`}>
                                    <Initials name={s.name} cls={`w-7 h-7 text-[9px] ${sel ? 'bg-white/20 text-white' : isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold truncate">{s.name} <span className={`font-medium ${sel ? 'text-white/50' : 'opacity-40'}`}>{s.role === 'hod' ? 'HOD' : 'Staff'}</span></p>
                                      <p className={`text-[10px] ${sel ? 'text-white/50' : 'opacity-50'}`}>{s.phone || 'No phone'}</p>
                                    </div>
                                    {sel && <CheckSolid className="w-4 h-4 ml-auto flex-shrink-0" />}
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                        <div>
                          <label className={lbl}>{staffList.length ? 'Or enter phone' : 'Phone'}</label>
                          <input type="text" value={selectedStaff ? '' : customTo}
                            onChange={e => { setCustomTo(e.target.value); setSelectedStaff(null) }}
                            placeholder="91XXXXXXXXXX" className={input} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message preview */}
                {message && (
                  <div className={card}>
                    <div className="p-5 space-y-2">
                      <span className={lbl}>Message Preview</span>
                      <div className={`rounded-xl rounded-tl-sm p-4 text-[11px] leading-relaxed font-mono whitespace-pre-wrap max-h-44 overflow-y-auto ${
                        isDark ? 'bg-green-950/25 ring-1 ring-green-800/20 text-green-200' : 'bg-green-50 ring-1 ring-green-100 text-green-900'
                      }`}>
                        {message}
                      </div>
                    </div>
                  </div>
                )}

                {/* Send button */}
                <div className="space-y-2.5">
                  <button onClick={handleSend}
                    disabled={sending || !recipient || !canSend || !reportData}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-500 active:scale-[.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-green-600">
                    {sending
                      ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Sending…</>
                      : <><PaperAirplaneIcon className="w-4 h-4" /> Send WhatsApp Message</>}
                  </button>
                  {!canSend && <p className={`text-[11px] text-center font-medium ${isDark ? 'text-red-400/80' : 'text-red-500'}`}>Connect WhatsApp first</p>}
                  {canSend && !reportData && <p className={`text-[11px] text-center ${muted}`}>Fetch a report first</p>}
                  {canSend && reportData && !recipient && <p className={`text-[11px] text-center ${muted}`}>Select a recipient above</p>}
                </div>

                {/* send result */}
                <AnimatePresence>
                  {sendResult && (
                    <motion.div key="sr"
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className={`rounded-xl px-4 py-3 text-xs font-bold text-center ${
                        sendResult.ok
                          ? isDark ? 'bg-green-900/20 text-green-400 ring-1 ring-green-800/30' : 'bg-green-50 text-green-700 ring-1 ring-green-100'
                          : isDark ? 'bg-red-900/20 text-red-400 ring-1 ring-red-800/30' : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                      }`}>
                      {sendResult.ok ? '✅ ' : '❌ '}{sendResult.msg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────── SETTINGS TAB ─────────────── */}
        {tab === 'settings' && isHOD && (
          <motion.div key="t-settings"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Settings grid - side by side on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Auto-notifications card */}
              <div className={card}>
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                      <BellIcon className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div>
                      <p className={heading}>Auto Notifications</p>
                      <p className={`text-[11px] ${muted}`}>Alerts for OD & leave actions</p>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between gap-4 p-4 rounded-xl ${isDark ? 'bg-gray-900/40 ring-1 ring-gray-700/40' : 'bg-gray-50 ring-1 ring-gray-100'}`}>
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Auto WhatsApp Alerts</p>
                      <p className={`text-[11px] mt-0.5 ${muted}`}>Notify when OD / leave is approved or rejected</p>
                    </div>
                    <button onClick={() => setAutoEnabled(v => !v)}
                      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${autoEnabled ? 'bg-purple-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <motion.div
                        animate={{ x: autoEnabled ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow"
                      />
                    </button>
                  </div>

                  {/* WA & UltraMsg status summary */}
                  <div className={`p-4 rounded-xl space-y-2 ${isDark ? 'bg-gray-900/40 ring-1 ring-gray-700/40' : 'bg-gray-50 ring-1 ring-gray-100'}`}>
                    <p className={lbl}>Channel Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${waOK ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>WhatsApp Web — {waOK ? 'Connected' : 'Not connected'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${hasUM ? 'bg-amber-400' : 'bg-gray-400'}`} />
                      <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>UltraMsg API — {hasUM ? 'Available' : 'Not configured'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily summary group card */}
              <div className={card}>
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                      <UserGroupIcon className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={heading}>Daily Summary Group</p>
                      <p className={`text-[11px] ${muted}`}>Auto-send attendance report</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${isDark ? 'bg-purple-900/25 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>⏰ 8:30 AM</span>
                  </div>

                  {groups.length > 0 && (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {groups.map(g => {
                        const sel = notifyGroupId === g.id
                        return (
                          <button key={g.id} onClick={() => setNotifyGroupId(g.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-all ${
                              sel
                                ? 'bg-purple-600 text-white shadow'
                                : isDark ? 'bg-gray-900/40 text-gray-300 hover:bg-gray-700/40 ring-1 ring-gray-700/40' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 ring-1 ring-gray-100'
                            }`}>
                            <UserGroupIcon className={`w-4 h-4 flex-shrink-0 ${sel ? 'text-white/70' : 'opacity-40'}`} />
                            <span className="font-bold truncate">{g.name}</span>
                            {sel && <CheckSolid className="w-4 h-4 ml-auto flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {!groups.length && (
                    <p className={`text-[11px] p-3 rounded-lg ${isDark ? 'bg-gray-900/30 text-gray-400 ring-1 ring-gray-700/40' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-100'}`}>
                      {waOK ? 'No groups found.' : 'Connect WhatsApp Web in the Connect tab to see your groups.'}
                    </p>
                  )}

                  <div>
                    <label className={lbl}>{groups.length ? 'Or enter Group ID' : 'Group ID'}</label>
                    <input type="text"
                      value={groups.find(g => g.id === notifyGroupId) ? '' : notifyGroupId}
                      onChange={e => setNotifyGroupId(e.target.value)}
                      placeholder="120363xxxx@g.us" className={input} />
                  </div>
                </div>
              </div>
            </div>

            {/* Save button - full width */}
            <div className="space-y-2.5">
              <button onClick={handleSaveConfig} disabled={savingConfig}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 active:scale-[.98] transition-all disabled:opacity-50">
                {savingConfig
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Saving…</>
                  : <><CheckCircleIcon className="w-4 h-4" /> Save Settings</>}
              </button>
              <AnimatePresence>
                {configMsg && (
                  <motion.div key="cm"
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className={`rounded-xl px-4 py-3 text-xs font-bold text-center ${
                      configMsg.ok
                        ? isDark ? 'bg-green-900/20 text-green-400 ring-1 ring-green-800/30' : 'bg-green-50 text-green-700 ring-1 ring-green-100'
                        : isDark ? 'bg-red-900/20 text-red-400 ring-1 ring-red-800/30' : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                    }`}>
                    {configMsg.ok ? '✅ ' : '❌ '}{configMsg.msg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
