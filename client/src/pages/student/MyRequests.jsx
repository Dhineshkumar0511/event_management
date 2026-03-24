import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { exportToCSV, formatRequestForExport } from '../../utils/export'
import {
  CalendarIcon, MapPinIcon, EyeIcon, TrashIcon, ArrowDownTrayIcon,
  DocumentPlusIcon, DocumentTextIcon, ClockIcon, BuildingOffice2Icon,
} from '@heroicons/react/24/outline'

const EVENT_EMOJI = {
  hackathon: '💻', symposium: '🎤', sports: '🏅',
  workshop: '🔧', conference: '🎯', cultural: '🎭', other: '📌',
}

const statusMap = {
  pending:        { dot: 'bg-accent-amber',   label: 'Awaiting Staff', badge: 'badge-amber' },
  draft:          { dot: 'bg-white/20',        label: 'Draft',          badge: 'badge-purple' },
  staff_review:   { dot: 'bg-accent-cyan',     label: 'Staff Review',   badge: 'badge-cyan' },
  hod_review:     { dot: 'bg-accent-purple',   label: 'HOD Review',     badge: 'badge-purple' },
  approved:       { dot: 'bg-accent-green',    label: 'Approved',       badge: 'badge-green' },
  rejected:       { dot: 'bg-accent-magenta',  label: 'Rejected',       badge: 'badge-magenta' },
  staff_rejected: { dot: 'bg-accent-magenta',  label: 'Staff Rejected', badge: 'badge-magenta' },
}

const canDelete = (status) => ['draft', 'rejected', 'staff_rejected'].includes(status)
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchRequests() }, [filter])

  const fetchRequests = async () => {
    try {
      const params = filter ? { status: filter } : {}
      const response = await studentAPI.getRequests(params)
      setRequests(response.data.data)
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally { setLoading(false) }
  }

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(new Set(requests.filter(r => canDelete(r.status)).map(r => r.id)))
    else setSelectedIds(new Set())
  }
  const handleSelectOne = (id, checked) => { const n = new Set(selectedIds); checked ? n.add(id) : n.delete(id); setSelectedIds(n) }
  const handleDeleteClick = (id) => { setDeleteTarget({ type: 'single', id }); setShowDeleteModal(true) }
  const handleBulkDeleteClick = () => { setDeleteTarget({ type: 'bulk', ids: Array.from(selectedIds) }); setShowDeleteModal(true) }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'single') {
        await studentAPI.deleteRequest(deleteTarget.id)
        setRequests(requests.filter(r => r.id !== deleteTarget.id))
      } else {
        await studentAPI.deleteRequests(deleteTarget.ids)
        setRequests(requests.filter(r => !deleteTarget.ids.includes(r.id)))
        setSelectedIds(new Set())
      }
      setShowDeleteModal(false); setDeleteTarget(null)
    } catch {} finally { setDeleting(false) }
  }

  const deletableCount = requests.filter(r => canDelete(r.status)).length

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">

      {/* ── Page Header ── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="page-header-icon bg-gradient-to-br from-accent-purple to-accent-cyan shadow-accent-purple/30">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="page-header-title">My OD Requests</h1>
            <p className="page-header-sub">{requests.length} request{requests.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {requests.length > 0 && (
            <button onClick={() => exportToCSV(requests.map(formatRequestForExport), 'my_od_requests')}
              className="btn btn-secondary text-xs">
              <ArrowDownTrayIcon className="w-4 h-4" /> Export
            </button>
          )}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="input !w-auto !py-2 text-xs font-medium min-w-[120px]">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Link to="/student/new-request" className="btn btn-primary text-xs">
            <DocumentPlusIcon className="w-4 h-4" /> New Request
          </Link>
        </div>
      </motion.div>

      {/* ── Bulk Delete Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="alert alert-danger justify-between">
            <span className="font-bold">{selectedIds.size} selected for deletion</span>
            <button onClick={handleBulkDeleteClick} className="btn btn-danger text-xs py-1.5">
              <TrashIcon className="w-4 h-4" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton" />)}</div>
      ) : requests.length === 0 ? (
        <motion.div variants={fadeUp} className="empty-state card">
          <div className="empty-state-icon"><DocumentPlusIcon className="w-8 h-8 text-white/15" /></div>
          <p className="empty-state-title">No requests found</p>
          <p className="empty-state-sub">Create your first OD request to get started</p>
          <Link to="/student/new-request" className="btn btn-primary mt-5 text-sm">
            <DocumentPlusIcon className="w-4 h-4" /> Create OD Request
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {deletableCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
              <input type="checkbox" checked={selectedIds.size === deletableCount} onChange={e => handleSelectAll(e.target.checked)} className="w-4 h-4 accent-accent-magenta" />
              <span className="text-xs text-white/30">Select all deletable ({deletableCount})</span>
            </div>
          )}

          {requests.map((request, index) => {
            const s = statusMap[request.status] || statusMap.pending
            const emoji = EVENT_EMOJI[request.event_type] || EVENT_EMOJI.other
            return (
              <motion.div key={request.id} variants={fadeUp}
                className="card overflow-hidden hover:border-accent-cyan/12 group">
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  {canDelete(request.status) && (
                    <input type="checkbox" checked={selectedIds.has(request.id)} onChange={e => handleSelectOne(request.id, e.target.checked)} className="w-4 h-4 flex-shrink-0 accent-accent-magenta" />
                  )}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-white/[0.04] border border-white/[0.06]">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold truncate text-white/85">{request.event_name}</h3>
                      <span className={`badge text-[10px] ${s.badge}`}>{s.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs mt-1.5 text-white/30">
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(request.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {request.venue && <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{request.venue}</span>}
                      {request.event_type && <span className="flex items-center gap-1 capitalize"><BuildingOffice2Icon className="w-3.5 h-3.5" />{request.event_type}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {['approved', 'hod_review', 'staff_review', 'staff_approved'].includes(request.status) && (
                      <Link to={`/student/od-letter/${request.id}`} className="btn btn-primary text-[11px] py-1.5 px-3">
                        <DocumentTextIcon className="w-3.5 h-3.5" /> OD Letter
                      </Link>
                    )}
                    <Link to={`/student/request/${request.id}`} className="btn btn-secondary text-[11px] py-1.5 px-3">
                      <EyeIcon className="w-3.5 h-3.5" /> View
                    </Link>
                    {canDelete(request.status) && (
                      <button onClick={() => handleDeleteClick(request.id)} className="btn btn-danger text-[11px] py-1.5 px-2.5">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="card max-w-sm w-full p-6">
              <div className="w-12 h-12 rounded-xl bg-accent-magenta/15 flex items-center justify-center mb-4">
                <TrashIcon className="w-6 h-6 text-accent-magenta" />
              </div>
              <h3 className="text-lg font-bold text-white/90 mb-2">Delete Request{deleteTarget?.type === 'bulk' ? 's' : ''}?</h3>
              <p className="text-sm text-white/35 mb-6">
                {deleteTarget?.type === 'bulk' ? `Delete ${deleteTarget.ids.length} selected? This cannot be undone.` : 'Permanently deleted. Cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="btn btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={handleConfirmDelete} disabled={deleting} className="btn btn-danger flex-1 text-sm">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
