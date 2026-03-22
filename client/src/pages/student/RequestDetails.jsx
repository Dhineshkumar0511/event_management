import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentAPI } from '../../services/api'
import toast from 'react-hot-toast'
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
  pending:        { icon: ClockIcon,       bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Staff Review' },
  staff_review:   { icon: ClockIcon,       bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Under Staff Review' },
  hod_review:     { icon: ClockIcon,       bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Awaiting HOD Review' },
  approved:       { icon: CheckCircleIcon, bg: 'bg-green-100',  text: 'text-green-800',  label: 'Approved by HOD' },
  rejected:       { icon: XCircleIcon,     bg: 'bg-red-100',    text: 'text-red-800',    label: 'Rejected by HOD' },
  staff_rejected: { icon: XCircleIcon,     bg: 'bg-red-100',    text: 'text-red-800',    label: 'Rejected by Staff' },
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

  const handleDownloadIcal = () => {
    try {
      const fmt = (d) => {
        const date = new Date(d)
        return `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
      }
      const startStr = fmt(request.event_start_date)
      const endDate = new Date(request.event_end_date)
      endDate.setDate(endDate.getDate() + 1)
      const endStr = `${endDate.getFullYear()}${String(endDate.getMonth()+1).padStart(2,'0')}${String(endDate.getDate()).padStart(2,'0')}`
      const uid = `eventpass-${request.id}-${Date.now()}@eventpass`
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EventPass//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${startStr}`,
        `DTEND;VALUE=DATE:${endStr}`,
        `SUMMARY:${request.event_name}`,
        `DESCRIPTION:${request.event_type?.replace(/\b\w/g, c => c.toUpperCase())} at ${request.venue}`,
        `LOCATION:${request.venue}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n')
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${request.event_name.replace(/[^a-z0-9]/gi, '_')}.ics`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Calendar file downloaded!')
    } catch {
      toast.error('Failed to generate calendar file')
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-gray-500">Name</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500">Year</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500">Section</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500">Reg. Number</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500">Phone</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500">Parent Contact</th>
                      <th className="pb-2 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.team_members.map((member, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{member.name || member.member_name}</td>
                        <td className="py-2 pr-4 text-gray-600">{member.year_of_study || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{member.section || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{member.register_number || member.member_roll_number}</td>
                        <td className="py-2 pr-4 text-gray-600">{member.phone || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{member.parent_contact || '—'}</td>
                        <td className="py-2">
                          {member.is_team_lead
                            ? <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Team Lead</span>
                            : <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Member</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <button onClick={handleDownloadLetter} className="btn btn-primary w-full mb-2">
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download Letter
              </button>
              <button onClick={handleDownloadIcal} className="btn btn-outline w-full flex items-center justify-center gap-2">
                📅 Add to Calendar (.ics)
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

          {request.supporting_documents && request.supporting_documents.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DocumentIcon className="w-5 h-5" />
                Supporting Documents
              </h2>
              <div className="space-y-2">
                {request.supporting_documents.map((doc, index) => {
                  const docUrl = typeof doc === 'string' ? doc : doc.path || doc.url || doc.secure_url;
                  const fileName = (typeof doc === 'object' && doc.name) || docUrl?.split('/').pop()?.split('?')[0] || `Document ${index + 1}`;
                  // Resolve relative /uploads paths to absolute API server URL
                  const absoluteUrl = docUrl?.startsWith('/')
                    ? `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || '3000'}${docUrl}`
                    : docUrl;
                  return (
                    <a
                      key={index}
                      href={absoluteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm text-blue-600 hover:text-blue-700 truncate">{decodeURIComponent(fileName)}</span>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
