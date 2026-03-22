import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staffAPI } from '../../services/api'
import { exportToCSV } from '../../utils/export'
import { 
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

const canDelete = (status) => status === 'staff_rejected'

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await staffAPI.getReviewedRequests()
      setHistory(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true
    if (filter === 'forwarded') return item.status === 'hod_review' || item.status === 'approved'
    if (filter === 'rejected') return item.status === 'staff_rejected'
    return true
  })

  const stats = useMemo(() => {
    const forwarded = history.filter(i => i.status !== 'staff_rejected').length
    const rejected = history.filter(i => i.status === 'staff_rejected').length
    const total = history.length
    const approvalRate = total > 0 ? Math.round((forwarded / total) * 100) : 0

    const thisWeek = history.filter(i => {
      if (!i.staff_reviewed_at) return false
      const d = new Date(i.staff_reviewed_at)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    }).length

    return { forwarded, rejected, total, approvalRate, thisWeek }
  }, [history])

  const handleExport = () => {
    const data = filteredHistory.map(item => ({
      'Event Name': item.event_name,
      'Event Type': item.event_type,
      'Student': item.student_name,
      'Roll Number': item.student_roll_number,
      'Decision': item.status === 'staff_rejected' ? 'Rejected' : 'Forwarded',
      'Reviewed Date': item.staff_reviewed_at ? new Date(item.staff_reviewed_at).toLocaleDateString() : 'N/A'
    }))
    exportToCSV(data, 'staff-review-history')
  }

  const showToast = (message, type = 'success') => {
    setToastMsg({ message, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  const deletableCount = filteredHistory.filter(r => canDelete(r.status)).length

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredHistory.filter(r => canDelete(r.status)).map(r => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id, checked) => {
    const s = new Set(selectedIds)
    checked ? s.add(id) : s.delete(id)
    setSelectedIds(s)
  }

  const handleDeleteClick = (id) => {
    setDeleteTarget({ type: 'single', id })
    setShowDeleteModal(true)
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
        setHistory(history.filter(r => r.id !== deleteTarget.id))
      } else {
        await staffAPI.deleteRequests(deleteTarget.ids)
        showToast(`${deleteTarget.ids.length} request(s) deleted`)
        setHistory(history.filter(r => !deleteTarget.ids.includes(r.id)))
        setSelectedIds(new Set())
      }
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    setDeletingAll(true)
    try {
      const res = await staffAPI.deleteAll()
      showToast(res.data.message || 'All requests deleted')
      setHistory([])
      setSelectedIds(new Set())
      setShowDeleteAllModal(false)
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete all', 'error')
    } finally {
      setDeletingAll(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review History</h1>
          <p className="text-gray-500">Your past review decisions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            Delete All
          </button>
          {filteredHistory.length > 0 && (
            <button onClick={handleExport} className="btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export CSV
            </button>
          )}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Reviews</option>
              <option value="forwarded">Forwarded to HOD</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Review Statistics */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Review Statistics</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total Reviews</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">{stats.forwarded}</p>
              <p className="text-xs text-gray-500 mt-1">Forwarded</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-gray-500 mt-1">Rejected</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{stats.approvalRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Forward Rate</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50">
              <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
              <p className="text-xs text-gray-500 mt-1">This Week</p>
            </div>
          </div>
          {/* Mini progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Forward Rate</span>
              <span>{stats.approvalRate}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${stats.approvalRate}%`,
                  background: stats.approvalRate >= 70 ? '#22c55e' : stats.approvalRate >= 40 ? '#eab308' : '#ef4444'
                }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between"
        >
          <span className="text-sm text-blue-700 font-medium">{selectedIds.size} request(s) selected</span>
          <button onClick={handleBulkDeleteClick} className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center gap-1">
            <TrashIcon className="w-4 h-4" /> Delete Selected
          </button>
        </motion.div>
      )}

      {filteredHistory.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No review history</h3>
          <p className="text-gray-500 mt-1">
            Your reviewed requests will appear here
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {deletableCount > 0 && (
                  <th className="px-6 py-3 text-left">
                    <input type="checkbox"
                      checked={selectedIds.size === deletableCount && deletableCount > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Decision
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                {deletableCount > 0 && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {canDelete(item.status) && deletableCount > 0 && (
                    <td className="px-6 py-4">
                      <input type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                  )}
                  {!canDelete(item.status) && deletableCount > 0 && <td className="px-6 py-4" />}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900">{item.event_name}</p>
                      <p className="text-sm text-gray-500 capitalize">{item.event_type}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-gray-900">{item.student_name}</p>
                      <p className="text-sm text-gray-500">{item.student_roll_number}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.status === 'staff_rejected' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircleIcon className="w-4 h-4" />
                        Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-4 h-4" />
                        Forwarded
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.staff_reviewed_at 
                      ? new Date(item.staff_reviewed_at).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  {canDelete(item.status) && deletableCount > 0 && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => handleDeleteClick(item.id)}
                        className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                  {!canDelete(item.status) && deletableCount > 0 && <td className="px-6 py-4" />}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !deletingAll && setShowDeleteAllModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <TrashIcon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete All Requests</h3>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                This will permanently delete <strong>all OD requests</strong> in your review history, including their data and any uploaded supporting documents from cloud storage. This action <strong>cannot be undone</strong>.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={deletingAll}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >Cancel</button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >{deletingAll ? 'Deleting…' : 'Delete All'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                {deleteTarget === 'bulk'
                  ? `Delete ${selectedIds.size} selected request(s)? This cannot be undone.`
                  : 'Delete this request? This cannot be undone.'}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >Cancel</button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >{deleting ? 'Deleting…' : 'Delete'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg z-50 text-sm"
          >{toastMsg}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
