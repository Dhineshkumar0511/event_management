import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { hodAPI, featuresAPI } from '../../services/api'
import toast from 'react-hot-toast'
import RequestComments from '../../components/RequestComments'
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export default function HODReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [comments, setComments] = useState('')
  const [action, setAction] = useState(null)
  const [rejectionTemplates, setRejectionTemplates] = useState([])

  useEffect(() => {
    fetchRequest()
    featuresAPI.getRejectionTemplates().then(r => setRejectionTemplates(r.data.data || [])).catch(() => {})
  }, [id])

  const fetchRequest = async () => {
    try {
      const response = await hodAPI.getRequestById(id)
      setRequest(response.data.data)
    } catch (error) {
      console.error('Failed to fetch request:', error)
      toast.error('Request not found')
      navigate('/hod/requests')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (actionType) => {
    setAction(actionType)
    setSubmitting(true)
    try {
      if (actionType === 'approve') {
        await hodAPI.approveRequest(id, { comments })
        toast.success('Request approved successfully!')
        navigate('/hod/requests')
      } else {
        await hodAPI.rejectRequest(id, { comments })
        toast.success('Request rejected')
        navigate('/hod/requests')
      }
    } catch (error) {
      toast.error(`Failed to ${actionType} request`)
      console.error('Submit error:', error)
    } finally {
      setSubmitting(false)
      setAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/hod/requests" className="btn btn-outline btn-sm">
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Final Review</h1>
          <p className="text-gray-500">{request.event_name}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Student Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{request.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Roll Number</p>
                <p className="font-medium">{request.student_roll_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{request.student_department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Year</p>
                <p className="font-medium">{request.student_year}</p>
              </div>
              {request.parent_phone && (
                <div>
                  <p className="text-sm text-gray-500">Parent Contact</p>
                  <p className="font-medium">{request.parent_phone}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Event Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Event Details</h2>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Event Date</p>
                    <p className="font-medium">
                      {new Date(request.event_start_date).toLocaleDateString()}
                      {request.event_end_date !== request.event_start_date && 
                        ` - ${new Date(request.event_end_date).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Venue</p>
                    <p className="font-medium">{request.venue}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Event Type</p>
                <span className="badge bg-blue-100 text-blue-800 capitalize">{request.event_type}</span>
              </div>

              {request.event_description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{request.event_description}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Team Members */}
          {request.team_members && request.team_members.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5" />
                Team Members ({request.team_members.length})
              </h2>
              <div className="divide-y">
                {request.team_members.map((member, index) => (
                  <div key={index} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.member_name}</p>
                      <p className="text-sm text-gray-500">{member.member_email}</p>
                    </div>
                    <span className="text-sm text-gray-600">{member.member_roll_number}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Supporting Documents */}
          {request.supporting_documents && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowDownTrayIcon className="w-5 h-5" />
                Supporting Documents
              </h2>
              {Array.isArray(request.supporting_documents) && request.supporting_documents.length > 0 ? (
                <div className="space-y-2">
                  {request.supporting_documents.map((doc, index) => {
                    const docUrl = typeof doc === 'string' ? doc : doc.path || doc.url || doc.secure_url;
                    const fileName = (typeof doc === 'object' && doc.name) || docUrl?.split('/').pop()?.split('?')[0] || `Document ${index + 1}`;
                    return (
                      <a
                        key={index}
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600 hover:text-blue-700 truncate">{decodeURIComponent(fileName)}</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No supporting documents provided</p>
              )}
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          {/* Staff Review Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Staff Review</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Verified by Staff</span>
              </div>
              {request.staff_reviewed_at && (
                <p className="text-sm text-gray-500">
                  Reviewed on {new Date(request.staff_reviewed_at).toLocaleString()}
                </p>
              )}
              {request.staff_comments && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{request.staff_comments}</p>
                </div>
              )}
              {request.ai_verified && (
                <div className="flex items-center gap-2 text-purple-700">
                  <SparklesIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">AI Verified Event</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Request Discussion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-6"
          >
            <RequestComments entityType="od_request" entityId={id} />
          </motion.div>

          {/* HOD Decision */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Your Decision</h2>
            <div className="space-y-4">
              {/* Sign OD Letter — must do before approving */}
              <Link
                to={`/hod/od-letter/${id}`}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                  request.hod_signature
                    ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-purple-400 bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                {request.hod_signature ? '✅ OD Letter Signed — View Again' : '📄 View & Sign OD Letter'}
              </Link>
              {!request.hod_signature && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                  ⚠️ You must sign the OD letter before approving
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments (optional)
                </label>
                {rejectionTemplates.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Quick templates:</p>
                    <div className="flex flex-wrap gap-1">
                      {rejectionTemplates.map(t => (
                        <button key={t.id} type="button"
                          onClick={() => setComments(t.message)}
                          className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add your comments..."
                  className="input"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSubmit('reject')}
                  disabled={submitting}
                  className="btn bg-red-600 hover:bg-red-700 text-white"
                >
                  {submitting && action === 'reject' ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <XCircleIcon className="w-5 h-5" />
                  )}
                  Reject
                </button>
                <button
                  onClick={() => handleSubmit('approve')}
                  disabled={submitting || !request.hod_signature}
                  title={!request.hod_signature ? 'Sign the OD letter first to enable approval' : ''}
                  className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && action === 'approve' ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5" />
                  )}
                  Approve
                </button>
              </div>
              <p className="text-xs text-center mt-1">
                {request.hod_signature
                  ? <span className="text-green-600">✓ Signed — ready to approve</span>
                  : <span className="text-gray-400">Sign the OD letter above to enable approval</span>
                }
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
