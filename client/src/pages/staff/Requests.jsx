import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { staffAPI } from '../../services/api'
import {
  CalendarIcon, MapPinIcon, EyeIcon, SparklesIcon, UserIcon,
  TrashIcon, CheckIcon, XMarkIcon, ClockIcon, CheckCircleIcon, BuildingOffice2Icon,
} from '@heroicons/react/24/outline'

const EVENT_EMOJI = {
  hackathon: '💻', symposium: '🎤', sports: '🏅',
  workshop: '🔧', conference: '🎯', cultural: '🎭', other: '📌',
}

const canDelete = (status) => status === 'staff_rejected'
const canQuickAction = (status) => ['pending', 'staff_review'].includes(status)

const STATUS_MAP = {
  pending:        { label: 'Pending',      badge: 'badge-amber' },
  staff_review:   { label: 'In Review',    badge: 'badge-cyan' },
  hod_review:     { label: 'HOD Review',   badge: 'badge-purple' },
  approved:       { label: 'Approved',     badge: 'badge-green' },
  rejected:       { label: 'Rejected',     badge: 'badge-magenta' },
  staff_rejected: { label: 'Rejected',     badge: 'badge-magenta' },
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }

export default function StaffRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [quickActionId, setQuickActionId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { fetchRequests() }, [filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = filter === 'pending' ? await staffAPI.getPendingRequests() : await staffAPI.getReviewedRequests()
      setRequests(response.data.data || [])
    } catch (error) { console.error('Failed to fetch requests:', error) }
    finally { setLoading(false) }
  }

  const handleSelectAll = (checked) => { checked ? setSelectedIds(new Set(requests.filter(r => canDelete(r.status)).map(r => r.id))) : setSelectedIds(new Set()) }
  const handleSelectOne = (id, checked) => { const n = new Set(selectedIds); checked ? n.add(id) : n.delete(id); setSelectedIds(n) }
  const handleDeleteClick = (id) => { setDeleteTarget({ type: 'single', id }); setShowDeleteModal(true) }
  const handleBulkDeleteClick = () => { setDeleteTarget({ type: 'bulk', ids: Array.from(selectedIds) }); setShowDeleteModal(true) }

  const handleQuickApprove = async (id) => {
    setQuickActionId(id)
    try { await staffAPI.approveRequest(id, { comments: 'Approved (quick action)' }); navigate(`/staff/od-letter/${id}`) }
    catch { setQuickActionId(null) }
  }
  const handleQuickReject = async (id) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    setQuickActionId(id)
    try { await staffAPI.rejectRequest(id, { comments: reason }); setRequests(requests.filter(r => r.id !== id)) }
    catch {} finally { setQuickActionId(null) }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'single') { await staffAPI.deleteRequest(deleteTarget.id); setRequests(requests.filter(r => r.id !== deleteTarget.id)) }
      else { await staffAPI.deleteRequests(deleteTarget.ids); setRequests(requests.filter(r => !deleteTarget.ids.includes(r.id))); setSelectedIds(new Set()) }
      setShowDeleteModal(false); setDeleteTarget(null)
    } catch {} finally { setDeleting(false) }
  }

  const deletableCount = requests.filter(r => canDelete(r.status)).length

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">

      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <div className="page-header-icon bg-gradient-to-br from-accent-green to-accent-cyan shadow-accent-green/30">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-header-title">OD Requests</h1>
            <p className="page-header-sub">{requests.length} request{requests.length !== 1 ? 's' : ''} · Review & verify</p>
          </div>
        </div>
        <div className="tab-list">
          {[
            { key: 'pending', label: 'Pending', icon: ClockIcon },
            { key: 'reviewed', label: 'Reviewed', icon: CheckCircleIcon },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`tab-item flex items-center gap-1.5 ${filter === tab.key ? 'tab-item-active' : ''}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Bulk Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="alert alert-danger justify-between">
            <span className="font-bold">{selectedIds.size} selected for deletion</span>
            <button onClick={handleBulkDeleteClick} className="btn btn-danger text-xs py-1.5"><TrashIcon className="w-4 h-4" /> Delete</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}</div>
      ) : requests.length === 0 ? (
        <motion.div variants={fadeUp} className="empty-state card">
          <div className="empty-state-icon">
            {filter === 'pending' ? <CheckCircleIcon className="w-8 h-8 text-accent-green" /> : <SparklesIcon className="w-8 h-8 text-white/15" />}
          </div>
          <p className="empty-state-title">{filter === 'pending' ? 'All caught up!' : 'No reviewed requests'}</p>
          <p className="empty-state-sub">{filter === 'pending' ? 'No pending requests to review.' : 'Review some requests to see them here.'}</p>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {deletableCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
              <input type="checkbox" checked={selectedIds.size === deletableCount} onChange={e => handleSelectAll(e.target.checked)} className="w-4 h-4 accent-accent-magenta" />
              <span className="text-xs text-white/30">Select all rejected ({deletableCount})</span>
            </div>
          )}
          {requests.map((request, index) => {
            const s = STATUS_MAP[request.status] || STATUS_MAP.pending
            return (
              <motion.div key={request.id} variants={fadeUp}
                className="card overflow-hidden hover:border-accent-green/12 group">
                <div className="flex items-start gap-4 p-4 sm:p-5">
                  {canDelete(request.status) && (
                    <input type="checkbox" checked={selectedIds.has(request.id)} onChange={e => handleSelectOne(request.id, e.target.checked)} className="w-4 h-4 mt-1 flex-shrink-0 accent-accent-magenta" />
                  )}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-green to-accent-cyan flex items-center justify-center flex-shrink-0 shadow text-white font-black text-lg">
                    {request.student_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold truncate text-white/85">{request.event_name}</h3>
                      <span className={`badge text-[10px] ${s.badge}`}>{s.label}</span>
                      {request.ai_verified && <span className="badge badge-purple text-[10px]"><SparklesIcon className="w-3 h-3" /> AI Verified</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs mt-1.5 text-white/30">
                      <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{request.student_name} · {request.student_roll_number}</span>
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(request.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {request.venue && <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{request.venue}</span>}
                      {request.event_type && <span className="flex items-center gap-1 capitalize">{EVENT_EMOJI[request.event_type] || '📌'} {request.event_type}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    {canQuickAction(request.status) && (
                      <>
                        <button onClick={() => handleQuickApprove(request.id)} disabled={quickActionId === request.id} title="Quick Approve"
                          className="p-2 rounded-xl bg-accent-green/10 hover:bg-accent-green/20 text-accent-green transition-colors disabled:opacity-50"><CheckIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleQuickReject(request.id)} disabled={quickActionId === request.id} title="Quick Reject"
                          className="p-2 rounded-xl bg-accent-magenta/10 hover:bg-accent-magenta/20 text-accent-magenta transition-colors disabled:opacity-50"><XMarkIcon className="w-4 h-4" /></button>
                      </>
                    )}
                    {request.student_phone && (
                      <a href={`https://wa.me/${request.student_phone.replace(/\D/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91')}?text=${encodeURIComponent(`Hi ${request.student_name} 👋\n\n*OD Request* – ${request.event_name}\n🆔 ID: #${request.id}\n\nPlease check your EventPass portal for updates.`)}`}
                        target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        className="btn btn-secondary text-[11px] py-1.5 px-2.5 !border-accent-green/15 text-accent-green">💬 WA</a>
                    )}
                    <Link to={`/staff/review/${request.id}`} className="btn btn-primary text-[11px] py-1.5 px-3"><EyeIcon className="w-3.5 h-3.5" /> Review</Link>
                    {canDelete(request.status) && (
                      <button onClick={() => handleDeleteClick(request.id)} className="btn btn-danger text-[11px] py-1.5 px-2.5"><TrashIcon className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Delete Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card max-w-sm w-full p-6">
              <div className="w-12 h-12 rounded-xl bg-accent-magenta/15 flex items-center justify-center mb-4"><TrashIcon className="w-6 h-6 text-accent-magenta" /></div>
              <h3 className="text-lg font-bold text-white/90 mb-2">Delete Request{deleteTarget?.type === 'bulk' ? 's' : ''}?</h3>
              <p className="text-sm text-white/35 mb-6">{deleteTarget?.type === 'bulk' ? `Delete ${deleteTarget.ids.length} selected? Cannot be undone.` : 'Permanently deleted. Cannot be undone.'}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="btn btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={handleConfirmDelete} disabled={deleting} className="btn btn-danger flex-1 text-sm">{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
