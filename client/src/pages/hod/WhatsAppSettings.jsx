import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { whatsappAPI } from '../../services/api'
import {
  Cog6ToothIcon, UserGroupIcon, CheckCircleIcon,
  ArrowPathIcon, BellIcon, SignalIcon, QrCodeIcon,
} from '@heroicons/react/24/outline'

export default function WhatsAppSettings() {
  const { isDark } = useTheme()

  const [autoEnabled, setAutoEnabled] = useState(false)
  const [notifyGroupId, setNotifyGroupId] = useState('')
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [waStatus, setWaStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        whatsappAPI.getStatus(),
        whatsappAPI.getConfig(),
      ])
      const s = statusRes.data.data
      setWaStatus(s)
      const cfg = configRes.data.data
      setAutoEnabled(!!cfg.auto_enabled)
      setNotifyGroupId(cfg.notify_group_id || '')
      if (s.status === 'ready' || s.status === 'ultramsg') fetchGroups()
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

  const handleSave = async () => {
    setSaving(true); setMsg(null)
    try {
      await whatsappAPI.saveConfig({ auto_enabled: autoEnabled, notify_group_id: notifyGroupId, saved_contacts: [] })
      setMsg({ ok: true, text: '✅ Settings saved successfully!' })
    } catch { setMsg({ ok: false, text: '❌ Failed to save settings' }) }
    finally { setSaving(false) }
  }

  const isConnected = waStatus?.status === 'ready' || waStatus?.status === 'ultramsg'
  const isUltraMsg = waStatus?.status === 'ultramsg'

  const card = `rounded-2xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`
  const input = `w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700/60 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`
  const lbl = `text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 shadow-xl shadow-purple-500/20 p-6">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute right-16 bottom-0 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Cog6ToothIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">WhatsApp Settings</h1>
            </div>
            <p className="text-white/65 text-sm ml-[52px]">Configure auto-notifications and daily report groups</p>
          </div>
          {/* WA status pill */}
          <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            isConnected ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
          }`}>
            <SignalIcon className="w-3.5 h-3.5" />
            {!waStatus ? 'Checking…'
              : isUltraMsg ? 'UltraMsg ✓'
              : isConnected ? 'WA Connected ✓'
              : 'Not connected'}
          </div>
        </div>
      </motion.div>

      {/* ── Auto Notifications Toggle ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className={card}>
        <div className={`px-5 py-3.5 border-b flex items-center gap-2 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <BellIcon className="w-4 h-4 text-purple-500" />
          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Auto Notifications</span>
        </div>
        <div className="p-5">
          <div className={`flex items-center justify-between gap-4 p-4 rounded-xl ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                Automatic WhatsApp Notifications
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Automatically notify staff and HOD when an OD or leave request is approved or rejected.
              </p>
            </div>
            {/* Toggle switch */}
            <button onClick={() => setAutoEnabled(v => !v)}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                autoEnabled ? 'bg-purple-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}>
              <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg transform transition-transform ${autoEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <p className={`text-xs mt-3 pl-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            When enabled, WhatsApp messages are sent automatically on status changes. When disabled, only manual sends (from WA Report page) work.
          </p>
        </div>
      </motion.div>

      {/* ── Daily Summary Group ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={card}>
        <div className={`px-5 py-3.5 border-b flex items-center gap-2 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <UserGroupIcon className="w-4 h-4 text-purple-500" />
          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Daily Summary Group</span>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>8:30 AM auto-send</span>
        </div>
        <div className="p-5 space-y-4">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            A daily attendance summary will be sent to this group every morning at 8:30 AM (when auto-notifications are enabled).
          </p>

          {!isConnected && !isUltraMsg && (
            <div className={`flex items-center gap-2.5 p-3.5 rounded-xl text-sm ${isDark ? 'bg-amber-900/20 text-amber-400 border border-amber-800/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <QrCodeIcon className="w-4 h-4 flex-shrink-0" />
              <span>Connect WhatsApp Web (from the WA Report page) to pick from your groups.</span>
            </div>
          )}

          {/* Group picker */}
          {groups.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className={lbl}>Your WhatsApp Groups</p>
                <button onClick={fetchGroups} disabled={loadingGroups}
                  className={`flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-40 ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}>
                  <ArrowPathIcon className={`w-3.5 h-3.5 ${loadingGroups ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {groups.map(g => (
                  <button key={g.id} onClick={() => setNotifyGroupId(g.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-left transition-all ${
                      notifyGroupId === g.id
                        ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/30'
                        : isDark ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-700' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-100'
                    }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${notifyGroupId === g.id ? 'bg-white/20' : isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      {notifyGroupId === g.id ? <CheckCircleIcon className="w-4 h-4" /> : <UserGroupIcon className="w-4 h-4 opacity-70" />}
                    </div>
                    <span className="font-semibold truncate">{g.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div>
            <p className={`${lbl} mb-1.5`}>{groups.length > 0 ? 'Or enter group ID manually' : isUltraMsg ? 'UltraMsg Group ID' : 'Group ID (WhatsApp format)'}</p>
            <input type="text" value={groups.find(g => g.id === notifyGroupId) ? '' : notifyGroupId}
              onChange={e => setNotifyGroupId(e.target.value)}
              placeholder={isUltraMsg ? 'group_id_here' : '120363xxxxxxxx@g.us'}
              className={input} />
            {notifyGroupId && !groups.find(g => g.id === notifyGroupId) && (
              <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Manual ID: {notifyGroupId}</p>
            )}
            {notifyGroupId && groups.find(g => g.id === notifyGroupId) && (
              <p className={`text-xs mt-1.5 font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                ✓ Group selected: {groups.find(g => g.id === notifyGroupId)?.name}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Save ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className={card}>
        <div className="p-5 space-y-3">
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" /> Saving…</>
              : <><CheckCircleIcon className="w-5 h-5" /> Save Settings</>}
          </button>

          <AnimatePresence>
            {msg && (
              <motion.div key="msg"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                  msg.ok
                    ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                {msg.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
