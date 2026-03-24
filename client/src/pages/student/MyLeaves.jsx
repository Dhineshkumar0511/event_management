import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon, FunnelIcon, CalendarIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, DocumentTextIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { leaveAPI } from '../../services/api'

const STATUS_CONFIG = {
  pending:        { label: 'Pending',        badge: 'badge-amber',   icon: ClockIcon },
  staff_approved: { label: 'Staff Approved', badge: 'badge-cyan',    icon: CheckCircleIcon },
  staff_rejected: { label: 'Staff Rejected', badge: 'badge-magenta', icon: XCircleIcon },
  approved:       { label: 'Approved',       badge: 'badge-green',   icon: CheckCircleIcon },
  rejected:       { label: 'Rejected',       badge: 'badge-magenta', icon: XCircleIcon },
}

const TYPE_BADGE = {
  sick: 'badge-magenta', casual: 'badge-cyan', emergency: 'badge-amber',
  medical: 'badge-purple', family: 'badge-green', other: 'badge-purple',
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }

export default function MyLeaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [cancelId, setCancelId] = useState(null)
  const [filters, setFilters] = useState({ status: '', leave_type: '' })
  const [showFilters, setShowFilters] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.leave_type) params.leave_type = filters.leave_type
      const res = await leaveAPI.getMyLeaves(params)
      setLeaves(res.data.data)
    } catch { toast.error('Failed to load leave history') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])

  const handleCancel = async (id) => {
    try { await leaveAPI.cancelRequest(id); toast.success('Leave cancelled'); setCancelId(null); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel') }
  }

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => ['staff_rejected', 'rejected'].includes(l.status)).length,
  }

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-white/70', accent: 'from-accent-cyan/15 to-accent-purple/10', border: 'border-accent-cyan/10' },
    { label: 'Pending', value: stats.pending, color: 'text-accent-amber', accent: 'from-accent-amber/10 to-transparent', border: 'border-accent-amber/10' },
    { label: 'Approved', value: stats.approved, color: 'text-accent-green', accent: 'from-accent-green/10 to-transparent', border: 'border-accent-green/10' },
    { label: 'Rejected', value: stats.rejected, color: 'text-accent-magenta', accent: 'from-accent-magenta/10 to-transparent', border: 'border-accent-magenta/10' },
  ]

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">

      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="page-header">
          <div className="page-header-icon bg-gradient-to-br from-accent-cyan to-accent-purple shadow-accent-cyan/30">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-header-title">My Leaves</h1>
            <p className="page-header-sub">Track all your leave applications</p>
          </div>
        </div>
        <Link to="/student/leaves/new" className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> New Request
        </Link>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3">
        {statCards.map(s => (
          <div key={s.label} className={`stat-card bg-gradient-to-br ${s.accent} border ${s.border}`}>
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Filters ── */}
      <motion.div variants={fadeUp} className="card p-4">
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white/60 transition-colors">
          <FunnelIcon className="h-4 w-4" /> Filters {showFilters ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
        </button>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">Status</label>
                  <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="input">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="staff_approved">Staff Approved</option>
                    <option value="approved">Approved</option>
                    <option value="staff_rejected">Staff Rejected</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="label">Leave Type</label>
                  <select value={filters.leave_type} onChange={e => setFilters(p => ({ ...p, leave_type: e.target.value }))} className="input">
                    <option value="">All Types</option>
                    <option value="sick">Sick</option>
                    <option value="casual">Casual</option>
                    <option value="emergency">Emergency</option>
                    <option value="medical">Medical</option>
                    <option value="family">Family</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Leave List ── */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-accent-cyan border-t-transparent rounded-full" /></div>
      ) : leaves.length === 0 ? (
        <motion.div variants={fadeUp} className="empty-state card">
          <div className="empty-state-icon"><DocumentTextIcon className="w-8 h-8 text-white/15" /></div>
          <p className="empty-state-title">No leave requests found</p>
          <p className="empty-state-sub">Submit a leave application to get started</p>
          <Link to="/student/leaves/new" className="btn btn-primary mt-5 text-sm"><PlusIcon className="h-4 w-4" /> Submit Leave</Link>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {leaves.map((leave) => {
            const S = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending
            const SIcon = S.icon
            const isOpen = expanded === leave.id

            return (
              <motion.div key={leave.id} layout variants={fadeUp} className="card overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : leave.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-[10px] ${TYPE_BADGE[leave.leave_type] || TYPE_BADGE.other}`}>
                          {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                        </span>
                        <span className={`badge text-[10px] ${leave.leave_mode === 'post_leave' ? 'badge-amber' : 'badge-cyan'}`}>
                          {leave.leave_mode === 'post_leave' ? 'Post-Leave' : 'Pre-Leave'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/30">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}
                        <span className="font-bold text-white/50 font-mono">({leave.days_count}d)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`badge text-[10px] ${S.badge}`}><SIcon className="h-3 w-3" /> {S.label}</span>
                    {isOpen ? <ChevronUpIcon className="h-4 w-4 text-white/20" /> : <ChevronDownIcon className="h-4 w-4 text-white/20" />}
                  </div>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-4 pt-0 border-t border-white/[0.04] space-y-4 mt-0">
                        <div className="mt-4 space-y-1">
                          <p className="text-xs text-white/25 uppercase tracking-wider font-bold">Reason</p>
                          <p className="text-sm text-white/50">{leave.reason}</p>
                        </div>

                        {/* Timeline */}
                        <div>
                          <p className="text-xs text-white/25 uppercase tracking-wider font-bold mb-3">Approval Status</p>
                          <div className="space-y-2.5">
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-accent-cyan mt-1.5 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-white/50">Submitted</p>
                                <p className="text-xs text-white/20 font-mono">{fmtDate(leave.created_at)}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                ['staff_approved', 'approved'].includes(leave.status) ? 'bg-accent-cyan' :
                                leave.status === 'staff_rejected' ? 'bg-accent-magenta' : 'bg-white/10'
                              }`} />
                              <div>
                                <p className="text-xs font-bold text-white/50">
                                  Staff Review {leave.staff_name && <span className="font-normal text-white/25 ml-1">by {leave.staff_name}</span>}
                                </p>
                                {leave.staff_remarks && <p className="text-xs text-white/25 italic">"{leave.staff_remarks}"</p>}
                                {leave.staff_reviewed_at && <p className="text-xs text-white/15 font-mono">{fmtDate(leave.staff_reviewed_at)}</p>}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                leave.status === 'approved' ? 'bg-accent-green' :
                                leave.status === 'rejected' ? 'bg-accent-magenta' : 'bg-white/10'
                              }`} />
                              <div>
                                <p className="text-xs font-bold text-white/50">HOD Final Decision</p>
                                {leave.hod_remarks && <p className="text-xs text-white/25 italic">"{leave.hod_remarks}"</p>}
                                {leave.hod_reviewed_at && <p className="text-xs text-white/15 font-mono">{fmtDate(leave.hod_reviewed_at)}</p>}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Link to={`/student/leave-letter/${leave.id}`}
                            className="btn btn-outline text-xs py-1.5 px-3">
                            <DocumentTextIcon className="h-3.5 w-3.5" /> View Letter
                          </Link>
                          {leave.status === 'pending' && (
                            <div className="flex justify-end w-full">
                              {cancelId === leave.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white/30">Cancel this leave?</span>
                                  <button onClick={() => handleCancel(leave.id)} className="btn btn-danger text-xs py-1 px-3">Yes, cancel</button>
                                  <button onClick={() => setCancelId(null)} className="btn btn-secondary text-xs py-1 px-3">Keep</button>
                                </div>
                              ) : (
                                <button onClick={() => setCancelId(leave.id)} className="btn btn-outline !text-accent-magenta !border-accent-magenta/20 text-xs py-1.5 px-3">
                                  <TrashIcon className="h-3.5 w-3.5" /> Cancel Request
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
