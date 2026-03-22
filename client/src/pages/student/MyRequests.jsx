import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { exportToCSV, formatRequestForExport } from '../../utils/export'
import { CalendarIcon, MapPinIcon, EyeIcon, TrashIcon, ArrowDownTrayIcon, DocumentPlusIcon, DocumentTextIcon, ClockIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'

const EVENT_EMOJI = {
  hackathon: '\u{1F4BB}', symposium: '\u{1F3A4}', sports: '\u{1F3C5}',
  workshop: '\u{1F527}', conference: '\u{1F3AF}', cultural: '\u{1F3AD}', other: '\u{1F4CC}',
}

const statusMap = {
  pending:        { dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-800',    label: 'Awaiting Staff Review' },
  draft:          { dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-700',      label: 'Draft' },
  staff_review:   { dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-800',      label: 'Under Staff Review' },
  hod_review:     { dot: 'bg-indigo-400',  badge: 'bg-indigo-100 text-indigo-800',  label: 'Awaiting HOD Review' },
  approved:       { dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-800',label: 'Approved by HOD' },
  rejected:       { dot: 'bg-red-400',     badge: 'bg-red-100 text-red-800',        label: 'Rejected by HOD' },
  staff_rejected: { dot: 'bg-red-400',     badge: 'bg-red-100 text-red-800',        label: 'Rejected by Staff' },
}

const canDelete = (status) => ['draft', 'rejected', 'staff_rejected'].includes(status)

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const { isDark } = useTheme()

  useEffect(() => { fetchRequests() }, [filter])

  const fetchRequests = async () => {
    try {
      const params = filter ? { status: filter } : {}
      const response = await studentAPI.getRequests(params)
      setRequests(response.data.data)
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
    if (checked) setSelectedIds(new Set(requests.filter(r => canDelete(r.status)).map(r => r.id)))
    else setSelectedIds(new Set())
  }

  const handleSelectOne = (id, checked) => {
    const n = new Set(selectedIds)
    checked ? n.add(id) : n.delete(id)
    setSelectedIds(n)
  }

  const handleDeleteClick = (id) => { setDeleteTarget({ type: 'single', id }); setShowDeleteModal(true) }
  const handleBulkDeleteClick = () => { setDeleteTarget({ type: 'bulk', ids: Array.from(selectedIds) }); setShowDeleteModal(true) }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'single') {
        await studentAPI.deleteRequest(deleteTarget.id)
        showToast('Request deleted')
        setRequests(requests.filter(r => r.id !== deleteTarget.id))
      } else {
        await studentAPI.deleteRequests(deleteTarget.ids)
        showToast(`${deleteTarget.ids.length} request(s) deleted`)
        setRequests(requests.filter(r => !deleteTarget.ids.includes(r.id)))
        setSelectedIds(new Set())
      }
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete', 'error')
    } finally { setDeleting(false) }
  }

  const deletableCount = requests.filter(r => canDelete(r.status)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <DocumentTextIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark?'text-white':'text-gray-900'}`}>My OD Requests</h1>
            <p className={`text-sm mt-0.5 ${isDark?'text-gray-400':'text-gray-500'}`}>{requests.length} request{requests.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {requests.length > 0 && (
            <button onClick={() => exportToCSV(requests.map(formatRequestForExport), 'my_od_requests')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${isDark?'border-gray-600 text-gray-300 hover:bg-gray-700':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            ><ArrowDownTrayIcon className="w-4 h-4" /> Export CSV</button>
          )}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500 ${isDark?'bg-gray-700 border-gray-600 text-white':'bg-white border-gray-200 text-gray-700'}`}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Link to="/student/new-request"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold hover:scale-[1.02] transition-all shadow"
          ><DocumentPlusIcon className="w-4 h-4" /> New Request</Link>
        </div>
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25"
        >
          <span className="font-bold">{selectedIds.size} selected for deletion</span>
          <button onClick={handleBulkDeleteClick} className="flex items-center gap-2 bg-white text-red-600 font-bold px-4 py-1.5 rounded-lg hover:scale-[1.02] transition-all text-sm">
            <TrashIcon className="w-4 h-4" /> Delete Selected
          </button>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}
        </div>
      ) : requests.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className={`rounded-2xl p-16 text-center border ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} shadow-sm`}
        >
          <DocumentPlusIcon className={`w-16 h-16 mx-auto mb-4 ${isDark?'text-gray-600':'text-gray-300'}`} />
          <h3 className={`text-lg font-bold ${isDark?'text-white':'text-gray-900'}`}>No requests found</h3>
          <p className={`mt-1 text-sm mb-6 ${isDark?'text-gray-400':'text-gray-500'}`}>Create your first OD request to get started</p>
          <Link to="/student/new-request" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:scale-[1.02] transition-all shadow-lg shadow-violet-500/25">
            <DocumentPlusIcon className="w-4 h-4" /> Create OD Request
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {deletableCount > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${isDark?'bg-gray-700/50':'bg-gray-100'}`}>
              <input type="checkbox" checked={selectedIds.size === deletableCount} onChange={e => handleSelectAll(e.target.checked)} className="w-4 h-4 accent-red-500" />
              <span className={`text-sm ${isDark?'text-gray-400':'text-gray-600'}`}>Select all deletable ({deletableCount})</span>
            </div>
          )}

          {requests.map((request, index) => {
            const s = statusMap[request.status] || statusMap.pending
            const emoji = EVENT_EMOJI[request.event_type] || EVENT_EMOJI.other
            return (
              <motion.div key={request.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:index*0.04 }}
                className={`rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
              >
                <div className="flex items-center gap-4 p-5">
                  {canDelete(request.status) && (
                    <input type="checkbox" checked={selectedIds.has(request.id)} onChange={e => handleSelectOne(request.id, e.target.checked)} className="w-4 h-4 flex-shrink-0 accent-red-500" />
                  )}

                  {/* Event type emoji avatar */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-bold truncate ${isDark?'text-white':'text-gray-900'}`}>{request.event_name}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.badge}`}>{s.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs mt-1.5" style={{color:isDark?'#9ca3af':'#6b7280'}}>
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(request.event_start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      {request.venue && <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{request.venue}</span>}
                      {request.event_type && <span className="flex items-center gap-1 capitalize"><BuildingOffice2Icon className="w-3.5 h-3.5" />{request.event_type}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {['approved','hod_review','staff_review','staff_approved'].includes(request.status) && (
                      <Link to={`/student/od-letter/${request.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:scale-[1.02] transition-all shadow"
                      ><DocumentTextIcon className="w-3.5 h-3.5" /> OD Letter</Link>
                    )}
                    <Link to={`/student/request/${request.id}`}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${isDark?'border-gray-600 text-gray-300 hover:bg-gray-700':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    ><EyeIcon className="w-3.5 h-3.5" /> View</Link>
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

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
              className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 ${isDark?'bg-gray-800':'bg-white'}`}
            >
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark?'text-white':'text-gray-900'}`}>Delete Request{deleteTarget?.type==='bulk'?'s':''}?</h3>
              <p className={`text-sm mb-6 ${isDark?'text-gray-400':'text-gray-500'}`}>
                {deleteTarget?.type === 'bulk' ? `Delete ${deleteTarget.ids.length} selected requests? This cannot be undone.` : 'This request will be permanently deleted. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${isDark?'border-gray-600 text-gray-300 hover:bg-gray-700':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
            className={`fixed top-4 left-1/2 px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-xl z-50 ${toast.type==='error'?'bg-gradient-to-r from-red-500 to-rose-600':'bg-gradient-to-r from-violet-500 to-indigo-600'}`}
          >{toast.message}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
