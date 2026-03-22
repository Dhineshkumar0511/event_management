import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hodAPI, featuresAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import {
  ClipboardDocumentListIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UserMinusIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

const ACTION_META = {
  HOD_APPROVE:        { label: 'Approved OD',       color: 'bg-green-100 text-green-800',   darkColor: 'bg-green-900/30 text-green-300',  icon: CheckCircleIcon },
  HOD_REJECT:         { label: 'Rejected OD',        color: 'bg-red-100 text-red-800',       darkColor: 'bg-red-900/30 text-red-300',      icon: XCircleIcon },
  STAFF_APPROVE:      { label: 'Staff Approved',     color: 'bg-blue-100 text-blue-800',     darkColor: 'bg-blue-900/30 text-blue-300',    icon: CheckCircleIcon },
  STAFF_REJECT:       { label: 'Staff Rejected',     color: 'bg-orange-100 text-orange-800', darkColor: 'bg-orange-900/30 text-orange-300',icon: XCircleIcon },
  HOD_CREATE_USER:    { label: 'Created User',       color: 'bg-purple-100 text-purple-800', darkColor: 'bg-purple-900/30 text-purple-300',icon: UserPlusIcon },
  HOD_UPDATE_USER:    { label: 'Updated User',       color: 'bg-indigo-100 text-indigo-800', darkColor: 'bg-indigo-900/30 text-indigo-300',icon: PencilSquareIcon },
  HOD_DELETE_USER:    { label: 'Deleted User',       color: 'bg-red-100 text-red-800',       darkColor: 'bg-red-900/30 text-red-300',      icon: UserMinusIcon },
  HOD_DELETE:         { label: 'Deleted OD',         color: 'bg-gray-100 text-gray-700',     darkColor: 'bg-gray-700 text-gray-300',       icon: TrashIcon },
  HOD_BULK_DELETE:    { label: 'Bulk Deleted',       color: 'bg-gray-100 text-gray-700',     darkColor: 'bg-gray-700 text-gray-300',       icon: TrashIcon },
  HOD_BULK_IMPORT:    { label: 'Bulk Imported',      color: 'bg-teal-100 text-teal-800',     darkColor: 'bg-teal-900/30 text-teal-300',    icon: ArrowDownTrayIcon },
  RESULT_VERIFIED:    { label: 'Result Verified',    color: 'bg-cyan-100 text-cyan-800',     darkColor: 'bg-cyan-900/30 text-cyan-300',    icon: ShieldCheckIcon },
}

const getMeta = (action) => ACTION_META[action] || {
  label: action?.replace(/_/g, ' '),
  color: 'bg-gray-100 text-gray-700',
  darkColor: 'bg-gray-700 text-gray-300',
  icon: ClipboardDocumentListIcon
}

const formatTime = (ts) => {
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const formatDetails = (details) => {
  if (!details) return null
  try {
    const obj = typeof details === 'string' ? JSON.parse(details) : details
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(' · ')
  } catch {
    return String(details)
  }
}

export default function AuditTrail() {
  const { isDark } = useTheme()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({ action: '', search: '' })
  const [expandedId, setExpandedId] = useState(null)

  const PAGE_SIZE = 25

  const fetchLogs = useCallback(async (p = 0, f = filters) => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: p * PAGE_SIZE }
      if (f.action) params.action = f.action
      const res = await hodAPI.getAuditLogs(params)
      setLogs(res.data.data.logs)
      setTotal(res.data.data.total)
      if (res.data.data.actions?.length) setActions(res.data.data.actions)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchLogs(0) }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchLogs(page), 60000)
    return () => clearInterval(interval)
  }, [page, fetchLogs])

  const handleFilter = (key, val) => {
    const f = { ...filters, [key]: val }
    setFilters(f)
    setPage(0)
    fetchLogs(0, f)
  }

  const handleRefresh = () => { setPage(0); fetchLogs(0) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filteredLogs = filters.search
    ? logs.filter(l =>
        l.actor_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        l.action?.toLowerCase().includes(filters.search.toLowerCase()) ||
        String(l.entity_id || '').includes(filters.search)
      )
    : logs

  const roleColor = (role) => {
    if (role === 'hod') return 'bg-purple-100 text-purple-800'
    if (role === 'staff') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Audit Trail</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Complete timeline of all system actions — {total} events total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const res = await featuresAPI.exportAuditLogs({ format: 'csv' })
                const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`; a.click()
                URL.revokeObjectURL(url)
              } catch {}
            }}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium transition-colors ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleRefresh}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium transition-colors ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-xl p-4 flex flex-wrap gap-3 ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        <div className={`flex items-center gap-2 flex-1 min-w-48 rounded-lg px-3 py-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <MagnifyingGlassIcon className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Search by actor, action, ID..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className={`bg-transparent flex-1 text-sm outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
        </div>
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select
            value={filters.action}
            onChange={e => handleFilter('action', e.target.value)}
            className={`bg-transparent text-sm outline-none cursor-pointer ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            <option value="">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{getMeta(a).label}</option>
            ))}
          </select>
          <ChevronDownIcon className="w-3 h-3 text-gray-400" />
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="spinner" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className={`rounded-xl p-16 text-center ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <ClipboardDocumentListIcon className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No audit logs found</p>
        </div>
      ) : (
        <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className={`absolute left-[52px] top-0 bottom-0 w-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />

            <AnimatePresence initial={false}>
              {filteredLogs.map((log, i) => {
                const meta = getMeta(log.action)
                const Icon = meta.icon
                const isExpanded = expandedId === log.id
                const details = formatDetails(log.details)

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className={`relative flex gap-4 p-4 cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                    } ${i < filteredLogs.length - 1 ? (isDark ? 'border-b border-gray-700/50' : 'border-b border-gray-50') : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    {/* Icon bubble */}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? meta.darkColor : meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {log.actor_name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(log.actor_role)}`}>
                          {log.actor_role}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? meta.darkColor : meta.color}`}>
                          {meta.label}
                        </span>
                        {log.entity_id && (
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            #{log.entity_id}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTime(log.created_at)}
                        </span>
                      </div>

                      {isExpanded && details && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`mt-2 text-xs px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}
                        >
                          {details}
                        </motion.div>
                      )}
                    </div>

                    {details && (
                      <ChevronDownIcon
                        className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        } ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pr-20">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Page {page + 1} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { const p = page - 1; setPage(p); fetchLogs(p) }}
              disabled={page === 0}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => { const p = page + 1; setPage(p); fetchLogs(p) }}
              disabled={page >= totalPages - 1}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
