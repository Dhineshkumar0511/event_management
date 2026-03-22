import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staffAPI, aiAPI, featuresAPI } from '../../services/api'
import toast from 'react-hot-toast'
import RequestComments from '../../components/RequestComments'
import { 
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export default function Review() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [comments, setComments] = useState('')
  const [action, setAction] = useState(null)
  const [rejectionTemplates, setRejectionTemplates] = useState([])

  useEffect(() => {
    fetchRequest()
    featuresAPI.getRejectionTemplates().then(r => setRejectionTemplates(r.data.data || [])).catch(() => {})
  }, [id])

  const fetchRequest = async () => {
    try {
      const response = await staffAPI.getRequestById(id)
      setRequest(response.data.data)
      if (response.data.data.ai_verification_result) {
        setAiResult(response.data.data.ai_verification_result)
      }
    } catch (error) {
      console.error('Failed to fetch request:', error)
      toast.error('Request not found')
      navigate('/staff/requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAIVerify = async () => {
    setVerifying(true)
    try {
      const response = await staffAPI.aiVerify(id)
      setAiResult(response.data.data)
      toast.success('AI verification complete!')
    } catch (error) {
      toast.error('AI verification failed')
      console.error('AI verify error:', error)
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async (actionType) => {
    setAction(actionType)
    setSubmitting(true)
    try {
      if (actionType === 'approve') {
        await staffAPI.approveRequest(id, { comments })
        toast.success('Request approved! Sign the OD letter now.')
        navigate('/staff/requests')
      } else if (actionType === 'reject') {
        await staffAPI.rejectRequest(id, { comments })
        toast.success('Request rejected')
        navigate('/staff/requests')
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
        <Link to="/staff/requests" className="btn btn-outline btn-sm">
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Review Request</h1>
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

              {request.event_url && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Event URL</p>
                  <a 
                    href={request.event_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:underline flex items-center gap-1"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {request.event_url}
                  </a>
                </div>
              )}

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
          {/* AI Verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
              AI Verification
            </h2>
            
            {!aiResult ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Use AI to verify the event authenticity by analyzing the event URL and details.
                </p>
                <button
                  onClick={handleAIVerify}
                  disabled={verifying}
                  className="btn btn-outline w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {verifying ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      Run AI Verification
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  aiResult.aiUnavailable 
                    ? 'bg-yellow-50 border border-yellow-200'
                    : aiResult.isReal 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {aiResult.aiUnavailable ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    ) : aiResult.isReal ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${
                      aiResult.aiUnavailable 
                        ? 'text-yellow-800'
                        : aiResult.isReal ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {aiResult.aiUnavailable 
                        ? 'AI Service Unavailable' 
                        : aiResult.isReal ? 'Event Verified' : 'Review Needed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {aiResult.aiUnavailable 
                      ? 'AI verification service temporarily unavailable. Manual review required.'
                      : `Confidence: ${aiResult.score || 'N/A'}%`
                    }
                  </p>
                  {aiResult.verdict && (
                    <p className="text-xs text-gray-500 mt-2">Verdict: <strong>{aiResult.verdict}</strong></p>
                  )}
                </div>
                {aiResult.summary && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">AI Summary</p>
                    <p className="text-sm text-gray-700">{aiResult.summary}</p>
                  </div>
                )}
                {aiResult.observations && aiResult.observations.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Key Observations</p>
                    <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                      {aiResult.observations.map((obs, i) => (
                        <li key={i}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiResult.redFlags && aiResult.redFlags.length > 0 && (
                  <div>
                    <p className="text-sm text-red-600 font-medium mb-1">⚠️ Red Flags</p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      {aiResult.redFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm text-blue-600 font-medium mb-1">📋 Recommendations</p>
                    <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                      {aiResult.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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

          {/* Review Actions - only show when request is still actionable */}
          {['pending', 'staff_review'].includes(request.status) ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Your Review</h2>
            <div className="space-y-4">
              {/* Sign OD Letter — must do before forwarding */}
              <Link
                to={`/staff/od-letter/${id}`}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                  request.staff_signature
                    ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                📄 {request.staff_signature ? '✅ OD Letter Signed — View Again' : 'View & Sign OD Letter'}
              </Link>
              {!request.staff_signature && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                  ⚠️ Sign the OD letter above before forwarding to HOD
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
                  placeholder="Add your review comments..."
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
                  disabled={submitting || !request.staff_signature}
                  title={!request.staff_signature ? 'Sign the OD letter first to enable forwarding' : ''}
                  className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && action === 'approve' ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <ArrowRightIcon className="w-5 h-5" />
                  )}
                  Forward to HOD
                </button>
              </div>
              <p className="text-xs text-center mt-1">
                {request.staff_signature
                  ? <span className="text-green-600">✓ Signed — ready to forward</span>
                  : <span className="text-gray-400">Sign the OD letter above to enable forwarding</span>
                }
              </p>
            </div>
          </motion.div>
          ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Already Reviewed</p>
                <p className="text-sm text-green-700 capitalize">
                  Status: <strong>{request.status.replace(/_/g, ' ')}</strong>
                </p>
              </div>
            </div>
          </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
