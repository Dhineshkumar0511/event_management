import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { hodAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  SparklesIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'

export default function HODReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [comments, setComments] = useState('')
  const [action, setAction] = useState(null)

  useEffect(() => {
    fetchRequest()
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
        toast.success('Request approved! Sign the OD letter now.')
        navigate(`/hod/od-letter/${id}`)
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
        <Link to={`/hod/od-letter/${id}`}
          className="btn btn-outline btn-sm flex items-center gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          📄 View OD Letter
        </Link>
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

          {/* HOD Decision */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Your Decision</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments (optional)
                </label>
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
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting && action === 'approve' ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5" />
                  )}
                  Approve
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Approved requests will receive an official OD letter
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
