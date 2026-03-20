import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentAPI } from '../../services/api'
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserGroupIcon,
  DocumentIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

const statusConfig = {
  pending: { icon: ClockIcon, bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
  staff_review: { icon: ClockIcon, bg: 'bg-blue-100', text: 'text-blue-800', label: 'Staff Reviewing' },
  hod_review: { icon: ClockIcon, bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'HOD Review' },
  approved: { icon: CheckCircleIcon, bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
  rejected: { icon: XCircleIcon, bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  staff_rejected: { icon: XCircleIcon, bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected by Staff' }
}

export default function RequestDetails() {
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequest()
  }, [id])

  const fetchRequest = async () => {
    try {
      const response = await studentAPI.getRequestById(id)
      setRequest(response.data.data)
    } catch (error) {
      console.error('Failed to fetch request:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadLetter = async () => {
    try {
      const response = await studentAPI.downloadLetter(id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `OD_Letter_${request.event_name}.pdf`
      a.click()
    } catch (error) {
      console.error('Failed to download letter:', error)
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
    return (
      <div className="card p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">Request not found</h3>
        <Link to="/student/requests" className="btn btn-primary mt-4">
          Back to Requests
        </Link>
      </div>
    )
  }

  const status = statusConfig[request.status]
  const StatusIcon = status?.icon || ClockIcon

  // Progress step calculation
  const progressSteps = [
    { label: 'Submitted', completed: true },
    { label: 'Staff Review', completed: ['staff_review', 'hod_review', 'approved', 'staff_rejected', 'rejected'].includes(request.status) },
    { label: 'HOD Review', completed: ['hod_review', 'approved', 'rejected'].includes(request.status) },
    { label: request.status === 'rejected' || request.status === 'staff_rejected' ? 'Rejected' : 'Approved', completed: ['approved', 'rejected', 'staff_rejected'].includes(request.status) },
  ]
  const isRejected = request.status === 'rejected' || request.status === 'staff_rejected'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/student/my-requests" className="btn btn-outline btn-sm">
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{request.event_name}</h1>
          <p className="text-gray-500 capitalize">{request.event_type}</p>
        </div>
        <span className={`badge ${status?.bg} ${status?.text} py-2 px-4`}>
          <StatusIcon className="w-4 h-4 mr-1" />
          {status?.label}
        </span>
      </div>

      {/* Progress Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between">
          {progressSteps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.completed
                    ? i === progressSteps.length - 1 && isRejected
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.completed ? (
                    i === progressSteps.length - 1 && isRejected
                      ? <XCircleIcon className="w-5 h-5" />
                      : <CheckCircleIcon className="w-5 h-5" />
                  ) : i + 1}
                </div>
                <span className="text-xs mt-1 text-gray-500 text-center">{step.label}</span>
              </div>
              {i < progressSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  progressSteps[i + 1].completed ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Event Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
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
            {request.event_url && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Event URL</p>
                <a href={request.event_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  {request.event_url}
                </a>
              </div>
            )}
            {request.event_description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">{request.event_description}</p>
              </div>
            )}
          </motion.div>

          {request.team_members && request.team_members.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
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

          {(request.staff_comments || request.hod_comments) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Review Comments</h2>
              <div className="space-y-4">
                {request.staff_comments && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Staff Comments</p>
                    <p className="text-gray-700">{request.staff_comments}</p>
                  </div>
                )}
                {request.hod_comments && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">HOD Comments</p>
                    <p className="text-gray-700">{request.hod_comments}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            <div className="relative">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                <div className="relative flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow z-10" />
                  <div>
                    <p className="text-sm font-medium">Submitted</p>
                    <p className="text-xs text-gray-500">{new Date(request.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {request.staff_reviewed_at && (
                  <div className="relative flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow z-10" />
                    <div>
                      <p className="text-sm font-medium">Staff Reviewed</p>
                      <p className="text-xs text-gray-500">{new Date(request.staff_reviewed_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {request.hod_reviewed_at && (
                  <div className="relative flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${request.status === 'approved' ? 'bg-green-500' : 'bg-red-500'} border-2 border-white shadow z-10`} />
                    <div>
                      <p className="text-sm font-medium">{request.status === 'approved' ? 'Approved' : 'Rejected'}</p>
                      <p className="text-xs text-gray-500">{new Date(request.hod_reviewed_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {request.status === 'approved' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4">OD Letter</h2>
              <Link to={`/student/od-letter/${id}`} className="btn btn-outline w-full mb-2 flex items-center justify-center gap-2">
                📄 View OD Letter
              </Link>
              <button onClick={handleDownloadLetter} className="btn btn-primary w-full">
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download Letter
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                PDF format with official seal
              </p>
            </motion.div>
          )}

          {['pending', 'staff_review', 'hod_review'].includes(request.status) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4">OD Letter Preview</h2>
              <Link to={`/student/od-letter/${id}`} className="btn btn-outline w-full flex items-center justify-center gap-2">
                📄 View OD Letter
              </Link>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Preview the formal OD permission letter
              </p>
            </motion.div>
          )}

          {request.supporting_documents && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DocumentIcon className="w-5 h-5" />
                Documents
              </h2>
              <p className="text-sm text-gray-500">Supporting documents attached</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
