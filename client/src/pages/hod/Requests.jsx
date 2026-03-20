import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { hodAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useTheme } from '../../context/ThemeContext'
import { 
  CalendarIcon, MapPinIcon, EyeIcon, CheckBadgeIcon, UserIcon,
  ExclamationTriangleIcon, CheckIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

export default function HODRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await hodAPI.getPendingApproval()
      setRequests(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedRequests = [...requests].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'urgent') {
      const daysA = Math.ceil((new Date(a.event_start_date) - new Date()) / (1000 * 60 * 60 * 24))
      const daysB = Math.ceil((new Date(b.event_start_date) - new Date()) / (1000 * 60 * 60 * 24))
      return daysA - daysB
    }
    return 0
  })

  const getDaysUntilEvent = (date) => {
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    setBulkApproving(true)
    let successCount = 0
    for (const id of selectedIds) {
      try {
        await hodAPI.approveRequest(id, { comments: 'Bulk approved by HOD' })
        successCount++
      } catch {
        // continue with others
      }
    }
    toast.success(`${successCount} request(s) approved`)
    setSelectedIds(new Set())
    fetchRequests()
    setBulkApproving(false)
  }

  const handleQuickApprove = async (id) => {
    setActionId(id)
    try {
      await hodAPI.approveRequest(id, { comments: 'Approved' })
      toast.success('Request approved!')
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve')
    } finally {
      setActionId(null)
    }
  }

  const handleQuickReject = async (id) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    setActionId(id)
    try {
      await hodAPI.rejectRequest(id, { comments: reason })
      toast.success('Request rejected')
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject')
    } finally {
      setActionId(null)
    }
  }

  const { isDark } = useTheme()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-56 rounded-xl skeleton" />
        {[...Array(3)].map((_,i) => <div key={i} className="h-32 rounded-2xl skeleton" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark?'text-white':'text-gray-900'}`}>Pending Approvals</h1>
          <p className={`text-sm mt-0.5 ${isDark?'text-gray-400':'text-gray-500'}`}>
            {requests.length > 0 
              ? `${requests.length} request${requests.length !== 1 ? 's' : ''} awaiting your approval`
              : 'Requests forwarded by staff for your final approval'
            }
          </p>
        </div>
        {requests.length > 0 && (
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 ${isDark?'bg-gray-700 border-gray-600 text-white':'bg-white border-gray-200 text-gray-700'}`}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="urgent">Most Urgent</option>
          </select>
        )}
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25"
          >
            <span className="font-bold">{selectedIds.size} request{selectedIds.size>1?'s':''} selected for bulk approval</span>
            <button onClick={handleBulkApprove} disabled={bulkApproving}
              className="flex items-center gap-2 bg-white text-emerald-700 font-bold px-4 py-1.5 rounded-lg hover:scale-[1.02] transition-all text-sm disabled:opacity-60"
            >
              <CheckIcon className="w-4 h-4" />
              {bulkApproving ? 'Approving...' : `Approve All (${selectedIds.size})`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {requests.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className={`rounded-2xl p-16 text-center border ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} shadow-sm`}
        >
          <CheckBadgeIcon className="w-16 h-16 mx-auto text-purple-300 mb-4" />
          <h3 className={`text-lg font-bold ${isDark?'text-white':'text-gray-900'}`}>All caught up!</h3>
          <p className={`mt-1 text-sm ${isDark?'text-gray-400':'text-gray-500'}`}>No pending requests awaiting your approval.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${isDark?'bg-gray-700/50':'bg-gray-100'}`}>
            <input type="checkbox" checked={selectedIds.size === requests.length && requests.length > 0} onChange={toggleSelectAll} className="w-4 h-4 accent-purple-500" />
            <span className={`text-sm ${isDark?'text-gray-400':'text-gray-600'}`}>Select all ({requests.length})</span>
          </div>

          {sortedRequests.map((request, index) => {
            const daysUntil = getDaysUntilEvent(request.event_start_date)
            const isUrgent = daysUntil <= 2 && daysUntil >= 0
            return (
              <motion.div key={request.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:index*0.04 }}
                className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isUrgent?'ring-2 ring-orange-400/50':''} ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'}`}
              >
                <div className="flex items-start gap-4 p-5">
                  <input type="checkbox" checked={selectedIds.has(request.id)} onChange={() => toggleSelect(request.id)} className="w-4 h-4 mt-1 flex-shrink-0 accent-purple-500" />

                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow text-white font-black text-lg">
                    {request.student_name?.charAt(0) || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-bold truncate ${isDark?'text-white':'text-gray-900'}`}>{request.event_name}</h3>
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                        <CheckBadgeIcon className="w-3 h-3" /> Staff Verified
                      </span>
                      {isUrgent && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs mt-2" style={{color:isDark?'#9ca3af':'#6b7280'}}>
                      <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{request.student_name} · {request.student_roll_number}</span>
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(request.event_start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      {request.venue && <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{request.venue}</span>}
                    </div>
                    {request.staff_comments && (
                      <div className={`mt-3 p-2.5 rounded-xl text-xs ${isDark?'bg-gray-700 text-gray-300':'bg-gray-50 text-gray-600'}`}>
                        <span className="font-semibold opacity-60 mr-1">Staff note:</span>{request.staff_comments}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    <button onClick={() => handleQuickApprove(request.id)} disabled={actionId===request.id} title="Quick Approve"
                      className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors disabled:opacity-50"
                    ><CheckIcon className="w-4 h-4" /></button>
                    <button onClick={() => handleQuickReject(request.id)} disabled={actionId===request.id} title="Quick Reject"
                      className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-50"
                    ><XMarkIcon className="w-4 h-4" /></button>
                    <Link to={`/hod/review/${request.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white text-xs font-bold hover:scale-[1.03] transition-all shadow"
                    ><EyeIcon className="w-3.5 h-3.5" /> Review</Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
