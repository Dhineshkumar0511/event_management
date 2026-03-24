import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { hodAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  CalendarIcon, MapPinIcon, EyeIcon, CheckBadgeIcon, UserIcon,
  ExclamationTriangleIcon, CheckIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }

export default function HODRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)
  const [actionId, setActionId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    try { const response = await hodAPI.getPendingApproval(); setRequests(response.data.data || []) }
    catch (error) { console.error('Failed to fetch requests:', error) }
    finally { setLoading(false) }
  }

  const sortedRequests = [...requests].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'urgent') {
      const daysA = Math.ceil((new Date(a.event_start_date) - new Date()) / 86400000)
      const daysB = Math.ceil((new Date(b.event_start_date) - new Date()) / 86400000)
      return daysA - daysB
    }
    return 0
  })

  const getDaysUntilEvent = (date) => Math.ceil((new Date(date) - new Date()) / 86400000)
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => selectedIds.size === requests.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(requests.map(r => r.id)))

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    setBulkApproving(true)
    let success = 0
    for (const id of selectedIds) { try { await hodAPI.approveRequest(id, { comments: 'Bulk approved by HOD' }); success++ } catch {} }
    toast.success(`${success} request(s) approved`)
    setSelectedIds(new Set()); fetchRequests(); setBulkApproving(false)
  }

  const handleQuickApprove = async (id) => {
    setActionId(id)
    try { await hodAPI.approveRequest(id, { comments: 'Approved' }); toast.success('Approved!'); navigate(`/hod/od-letter/${id}`) }
    catch (error) { toast.error(error.response?.data?.message || 'Failed'); setActionId(null) }
  }

  const handleQuickReject = async (id) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    setActionId(id)
    try { await hodAPI.rejectRequest(id, { comments: reason }); toast.success('Rejected'); setRequests(prev => prev.filter(r => r.id !== id)) }
    catch (error) { toast.error(error.response?.data?.message || 'Failed') }
    finally { setActionId(null) }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-10 w-56 skeleton" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton" />)}
    </div>
  )

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">

      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <div className="page-header-icon bg-gradient-to-br from-accent-purple to-accent-magenta shadow-accent-purple/30">
            <CheckBadgeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-header-title">Pending Approvals</h1>
            <p className="page-header-sub">
              {requests.length > 0 ? `${requests.length} request${requests.length !== 1 ? 's' : ''} awaiting approval` : 'Requests forwarded by staff'}
            </p>
          </div>
        </div>
        {requests.length > 0 && (
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input !w-auto !py-2 text-xs font-medium min-w-[140px]">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="urgent">Most Urgent</option>
          </select>
        )}
      </motion.div>

      {/* ── Bulk Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="alert alert-success justify-between !text-white" style={{ background: 'linear-gradient(135deg, rgba(0,245,160,0.15), rgba(0,229,255,0.1))', borderColor: 'rgba(0,245,160,0.25)' }}>
            <span className="font-bold text-accent-green">{selectedIds.size} selected for bulk approval</span>
            <button onClick={handleBulkApprove} disabled={bulkApproving}
              className="btn text-sm py-1.5 bg-accent-green/20 text-accent-green border border-accent-green/25 hover:bg-accent-green/30 disabled:opacity-60">
              <CheckIcon className="w-4 h-4" /> {bulkApproving ? 'Approving...' : `Approve All (${selectedIds.size})`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty ── */}
      {requests.length === 0 ? (
        <motion.div variants={fadeUp} className="empty-state card">
          <div className="empty-state-icon"><CheckBadgeIcon className="w-8 h-8 text-accent-purple" /></div>
          <p className="empty-state-title">All caught up!</p>
          <p className="empty-state-sub">No pending requests awaiting approval.</p>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <input type="checkbox" checked={selectedIds.size === requests.length && requests.length > 0} onChange={toggleSelectAll} className="w-4 h-4 accent-accent-purple" />
            <span className="text-xs text-white/30">Select all ({requests.length})</span>
          </div>

          {sortedRequests.map((request, index) => {
            const daysUntil = getDaysUntilEvent(request.event_start_date)
            const isUrgent = daysUntil <= 2 && daysUntil >= 0
            return (
              <motion.div key={request.id} variants={fadeUp}
                className={`card overflow-hidden hover:border-accent-purple/12 group ${isUrgent ? 'ring-1 ring-accent-amber/30' : ''}`}>
                <div className="flex items-start gap-4 p-4 sm:p-5">
                  <input type="checkbox" checked={selectedIds.has(request.id)} onChange={() => toggleSelect(request.id)} className="w-4 h-4 mt-1 flex-shrink-0 accent-accent-purple" />
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-purple to-accent-magenta flex items-center justify-center flex-shrink-0 shadow text-white font-black text-lg">
                    {request.student_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold truncate text-white/85">{request.event_name}</h3>
                      <span className="badge badge-cyan text-[10px]"><CheckBadgeIcon className="w-3 h-3" /> Staff Verified</span>
                      {isUrgent && (
                        <span className="badge badge-amber text-[10px]"><ExclamationTriangleIcon className="w-3 h-3" />
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs mt-1.5 text-white/30">
                      <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{request.student_name} · {request.student_roll_number}</span>
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(request.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {request.venue && <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{request.venue}</span>}
                    </div>
                    {request.staff_comments && (
                      <div className="mt-3 p-2.5 rounded-xl text-xs bg-white/[0.03] border border-white/[0.05] text-white/40">
                        <span className="font-semibold text-white/25 mr-1">Staff note:</span>{request.staff_comments}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    <button onClick={() => handleQuickApprove(request.id)} disabled={actionId === request.id} title="Quick Approve"
                      className="p-2 rounded-xl bg-accent-green/10 hover:bg-accent-green/20 text-accent-green transition-colors disabled:opacity-50"><CheckIcon className="w-4 h-4" /></button>
                    <button onClick={() => handleQuickReject(request.id)} disabled={actionId === request.id} title="Quick Reject"
                      className="p-2 rounded-xl bg-accent-magenta/10 hover:bg-accent-magenta/20 text-accent-magenta transition-colors disabled:opacity-50"><XMarkIcon className="w-4 h-4" /></button>
                    {request.student_phone && (
                      <a href={`https://wa.me/${request.student_phone.replace(/\D/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91')}?text=${encodeURIComponent(`Hi ${request.student_name} 👋\n\n*OD Request* – ${request.event_name}\n🆔 ID: #${request.id}\n\nPlease check your EventPass portal.`)}`}
                        target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        className="btn btn-secondary text-[11px] py-1.5 px-2.5 !border-accent-green/15 text-accent-green">💬 WA</a>
                    )}
                    <Link to={`/hod/review/${request.id}`} className="btn btn-primary text-[11px] py-1.5 px-3"><EyeIcon className="w-3.5 h-3.5" /> Review</Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
