import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { staffAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
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
  pending:        { dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-800',    label: 'Pending' },
  staff_review:   { dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-800',      label: 'In Review' },
  hod_review:     { dot: 'bg-indigo-400',  badge: 'bg-indigo-100 text-indigo-800',  label: 'HOD Review' },
  approved:       { dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-800',label: 'Approved' },
  rejected:       { dot: 'bg-red-400',     badge: 'bg-red-100 text-red-800',        label: 'Rejected' },
  staff_rejected: { dot: 'bg-red-400',     badge: 'bg-red-100 text-red-800',        label: 'Rejected' },
}

export default function StaffRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [quickActionId, setQuickActionId] = useState(null)
  const { isDark } = useTheme()
  const navigate = useNavigate()

  useEffect(() => { fetchRequests() }, [filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = filter === 'pending'
        ? await staffAPI.getPendingRequests()
        : await staffAPI.getReviewedRequests()
      setRequests(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      showToast('Failed to load requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(requests.filter(r => canDelete(r.status)).map(r => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id, checked) => {
    const n = new Set(selectedIds)
    checked ? n.add(id) : n.delete(id)
    setSelectedIds(n)
  }

  const handleDeleteClick = (id) => {
    setDeleteTarget({ type: 'single', id })
    setShowDeleteModal(true)
  }

  const handleQuickApprove = async (id) => {
    setQuickActionId(id)
    try {
      await staffAPI.approveRequest(id, { comments: 'Approved (quick action)' })
      showToast('Approved! Taking you to sign the OD letter...')
      navigate(`/staff/od-letter/${id}`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve', 'error')
      setQuickActionId(null)
    }
  }

  const handleQuickReject = async (id) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    setQuickActionId(id)
    try {
      await staffAPI.rejectRequest(id, { comments: reason })
      showToast('Request rejected')
      setRequests(requests.filter(r => r.id !== id))
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject', 'error')
    } finally { setQuickActionId(null) }
  }

  const handleBulkDeleteClick = () => {
    setDeleteTarget({ type: 'bulk', ids: Array.from(selectedIds) })
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'single') {
        await staffAPI.deleteRequest(deleteTarget.id)
        showToast('Request deleted')
        setRequests(requests.filter(r => r.id !== deleteTarget.id))
      } else {
        await staffAPI.deleteRequests(deleteTarget.ids)
        showToast(`${deleteTarget.ids.length} request(s) deleted`)
        setRequests(requests.filter(r => !deleteTarget.ids.includes(r.id)))
        setSelectedIds(new Set())
      }
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error')
    } finally { setDeleting(false) }
  }

  const deletableCount = requests.filter(r => canDelete(r.status)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>OD Requests</h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{requests.length} request{requests.length !== 1 ? 's' : ''} · Review & verify</p>
          </div>
        </div>
        <div className={`flex gap-1.5 p-1 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          {[
            { key: 'pending',  label: 'Pending',  icon: ClockIcon },
            { key: 'reviewed', label: 'Reviewed', icon: CheckCircleIcon },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === tab.key
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25"
        >
          <span className="font-bold">{selectedIds.size} request{selectedIds.size > 1 ? 's' : ''} selected for deletion</span>
          <button onClick={handleBulkDeleteClick} className="flex items-center gap-2 bg-white text-red-600 font-bold px-4 py-1.5 rounded-lg hover:scale-[1.02] transition-all text-sm">
            <TrashIcon className="w-4 h-4" /> Delete Selected
          </button>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
        </div>
      ) : requests.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className={`rounded-2xl p-16 text-center border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}
        >
          {filter === 'pending'
            ? <><CheckCircleIcon className="w-16 h-16 mx-auto text-emerald-400 mb-4" /><h3 className={`text-lg font-bold ${isDark?'text-white':'text-gray-900'}`}>All caught up!</h3><p className={`mt-1 text-sm ${isDark?'text-gray-400':'text-gray-500'}`}>No pending requests to review.</p></>
            : <><SparklesIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" /><h3 className={`text-lg font-bold ${isDark?'text-white':'text-gray-900'}`}>No reviewed requests</h3><p className={`mt-1 text-sm ${isDark?'text-gray-400':'text-gray-500'}`}>Review some requests to see them here.</p></>
          }
        </motion.div>
      ) : (
        <div className="space-y-3">
          {deletableCount > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
              <input type="checkbox"
                checked={selectedIds.size === deletableCount}
                onChange={e => handleSelectAll(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Select all rejected ({deletableCount})</span>
            </div>
          )}

          {requests.map((request, index) => {
            const s = STATUS_MAP[request.status] || STATUS_MAP.pending
            return (
              <motion.div key={request.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:index*0.04 }}
                className={`rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
              >
                <div className="flex items-start gap-4 p-5">
                  {canDelete(request.status) && (
                    <input type="checkbox" checked={selectedIds.has(request.id)}
                      onChange={e => handleSelectOne(request.id, e.target.checked)}
                      className="w-4 h-4 mt-1 flex-shrink-0 accent-red-500"
                    />
                  )}

                  {/* Student avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow text-white font-black text-lg">
                    {request.student_name?.charAt(0) || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-bold truncate ${isDark?'text-white':'text-gray-900'}`}>{request.event_name}</h3>
                      <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                      </span>
                      {request.ai_verified && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                          <SparklesIcon className="w-3 h-3" /> AI Verified
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs mt-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                      <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{request.student_name} · {request.student_roll_number}</span>
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(request.event_start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      {request.venue && <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{request.venue}</span>}
                      {request.event_type && <span className="flex items-center gap-1 capitalize">{EVENT_EMOJI[request.event_type] || '📌'} {request.event_type}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    {canQuickAction(request.status) && (
                      <>
                        <button onClick={() => handleQuickApprove(request.id)} disabled={quickActionId === request.id} title="Quick Approve"
                          className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors disabled:opacity-50"
                        ><CheckIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleQuickReject(request.id)} disabled={quickActionId === request.id} title="Quick Reject"
                          className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-50"
                        ><XMarkIcon className="w-4 h-4" /></button>
                      </>
                    )}
                    <Link to={`/staff/review/${request.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:scale-[1.03] transition-all shadow"
                    ><EyeIcon className="w-3.5 h-3.5" /> Review</Link>
                    {canDelete(request.status) && (
                      <button onClick={() => handleDeleteClick(request.id)}
                        className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                      ><TrashIcon className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
              className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Request{deleteTarget?.type === 'bulk' ? 's' : ''}?</h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {deleteTarget?.type === 'bulk'
                  ? `Delete ${deleteTarget.ids.length} selected request(s)? This cannot be undone.`
                  : 'This request will be permanently deleted. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >Cancel</button>
                <button onClick={handleConfirmDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] transition-all disabled:opacity-60"
                >{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:-20, x:'-50%' }} animate={{ opacity:1, y:0, x:'-50%' }} exit={{ opacity:0, y:-20, x:'-50%' }}
            className={`fixed top-4 left-1/2 px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-xl z-50 ${toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}
          >{toast.message}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
