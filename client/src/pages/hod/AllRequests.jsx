import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { hodAPI } from '../../services/api'
import { exportToCSV, formatRequestForExport } from '../../utils/export'
import { 
  FunnelIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

const statusConfig = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  staff_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Staff Review' },
  hod_review: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'HOD Review' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  staff_rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Staff Rejected' }
}

const canDelete = () => true

export default function AllRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const response = await hodAPI.getAllRequests(params)
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

  const filteredRequests = requests.filter(req => 
    search === '' || 
    req.event_name?.toLowerCase().includes(search.toLowerCase()) ||
    req.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    req.student_roll_number?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectAll = (checked) => {
    if (checked) {
      const deletableIds = new Set(
        filteredRequests
          .filter(r => canDelete(r.status))
          .map(r => r.id)
      )
      setSelectedIds(deletableIds)
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id, checked) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
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
        await hodAPI.deleteRequest(deleteTarget.id)
        showToast('Request deleted successfully')
        setRequests(requests.filter(r => r.id !== deleteTarget.id))
      } else if (deleteTarget.type === 'bulk') {
        await hodAPI.deleteRequests(deleteTarget.ids)
        showToast(`${deleteTarget.ids.length} request(s) deleted successfully`)
        setRequests(requests.filter(r => !deleteTarget.ids.includes(r.id)))
        setSelectedIds(new Set())
      }
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error('Delete error:', error)
      showToast(error.response?.data?.message || 'Failed to delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const deletableCount = filteredRequests.filter(r => canDelete(r.status)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Requests</h1>
          <p className="text-gray-500">Complete history of all OD requests</p>
        </div>
        {filteredRequests.length > 0 && (
          <button
            onClick={() => exportToCSV(filteredRequests.map(formatRequestForExport), 'all_od_requests')}
            className="btn btn-outline btn-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event, student name or roll number..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="hod_review">HOD Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between"
        >
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} request(s) selected
          </span>
          <button
            onClick={handleBulkDeleteClick}
            className="btn btn-sm bg-red-600 hover:bg-red-700 text-white"
          >
            <TrashIcon className="w-4 h-4" />
            Delete Selected
          </button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {deletableCount > 0 && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letter
                  </th>
                  {deletableCount > 0 && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request, index) => (
                  <motion.tr
                    key={request.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    {canDelete(request.status) && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(request.id)}
                          onChange={(e) => handleSelectOne(request.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{request.event_name}</p>
                        <p className="text-sm text-gray-500 capitalize">{request.event_type} • {request.venue}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{request.student_name}</p>
                        <p className="text-sm text-gray-500">{request.student_roll_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(request.event_start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${statusConfig[request.status]?.bg} ${statusConfig[request.status]?.text}`}>
                        {statusConfig[request.status]?.label || request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/hod/od-letter/${request.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                      >
                        <DocumentTextIcon className="w-3.5 h-3.5" /> Letter
                      </Link>
                    </td>
                    {canDelete(request.status) && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteClick(request.id)}
                          className="btn btn-sm bg-red-100 hover:bg-red-200 text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Request(s)?</h3>
              <p className="text-gray-600 mb-6">
                {deleteTarget?.type === 'single' 
                  ? 'This action cannot be undone. The request will be permanently deleted.'
                  : `Are you sure you want to delete ${deleteTarget?.ids.length} request(s)? This action cannot be undone.`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-white text-sm font-medium ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
