import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { studentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  CalendarIcon, MapPinIcon, UserGroupIcon, DocumentIcon,
  ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

const statusConfig = {
  pending:        { icon: ClockIcon,       badge: 'badge-amber',    label: 'Awaiting Staff Review' },
  staff_review:   { icon: ClockIcon,       badge: 'badge-cyan',     label: 'Under Staff Review' },
  hod_review:     { icon: ClockIcon,       badge: 'badge-purple',   label: 'Awaiting HOD Review' },
  approved:       { icon: CheckCircleIcon, badge: 'badge-green',    label: 'Approved by HOD' },
  rejected:       { icon: XCircleIcon,     badge: 'badge-magenta',  label: 'Rejected by HOD' },
  staff_rejected: { icon: XCircleIcon,     badge: 'badge-magenta',  label: 'Rejected by Staff' },
}

const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } })

export default function RequestDetails() {
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentAPI.getRequestById(id)
      .then(r => setRequest(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleDownloadLetter = async () => {
    try {
      const response = await studentAPI.downloadLetter(id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `OD_Letter_${request.event_name}.pdf`; a.click()
    } catch { toast.error('Download failed') }
  }

  const handleDownloadIcal = () => {
    try {
      const fmt = (d) => { const dt = new Date(d); return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}` }
      const endDate = new Date(request.event_end_date); endDate.setDate(endDate.getDate() + 1)
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventPass//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        `UID:eventpass-${request.id}-${Date.now()}@eventpass`, `DTSTART;VALUE=DATE:${fmt(request.event_start_date)}`,
        `DTEND;VALUE=DATE:${fmt(endDate)}`, `SUMMARY:${request.event_name}`,
        `DESCRIPTION:${request.event_type?.replace(/\b\w/g, c => c.toUpperCase())} at ${request.venue}`,
        `LOCATION:${request.venue}`, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${request.event_name.replace(/[^a-z0-9]/gi, '_')}.ics`; a.click(); URL.revokeObjectURL(url)
      toast.success('Calendar file downloaded!')
    } catch { toast.error('Failed to generate calendar file') }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full" /></div>
  if (!request) return <div className="card p-12 text-center"><h3 className="text-lg font-medium text-white/60">Request not found</h3><Link to="/student/requests" className="btn btn-primary mt-4">Back</Link></div>

  const status = statusConfig[request.status]
  const StatusIcon = status?.icon || ClockIcon
  const isRejected = request.status === 'rejected' || request.status === 'staff_rejected'

  const progressSteps = [
    { label: 'Submitted', completed: true },
    { label: 'Staff Review', completed: ['staff_review', 'hod_review', 'approved', 'staff_rejected', 'rejected'].includes(request.status) },
    { label: 'HOD Review', completed: ['hod_review', 'approved', 'rejected'].includes(request.status) },
    { label: isRejected ? 'Rejected' : 'Approved', completed: ['approved', 'rejected', 'staff_rejected'].includes(request.status) },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeUp()} className="flex items-center gap-4">
        <Link to="/student/my-requests" className="btn btn-secondary">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white/90 font-display">{request.event_name}</h1>
          <p className="text-white/25 capitalize text-sm">{request.event_type}</p>
        </div>
        <span className={`badge py-2 px-4 ${status?.badge}`}>
          <StatusIcon className="w-4 h-4 mr-1" /> {status?.label}
        </span>
      </motion.div>

      {/* Progress Stepper */}
      <motion.div {...fadeUp(0.05)} className="card p-6">
        <div className="flex items-center justify-between">
          {progressSteps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step.completed
                    ? i === progressSteps.length - 1 && isRejected ? 'bg-accent-magenta text-white' : 'step-dot-complete'
                    : 'step-dot'
                }`}>
                  {step.completed ? (i === progressSteps.length - 1 && isRejected ? <XCircleIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />) : i + 1}
                </div>
                <span className="text-xs mt-1 text-white/25 text-center">{step.label}</span>
              </div>
              {i < progressSteps.length - 1 && (
                <div className={`step-connector ${progressSteps[i + 1].completed ? 'step-connector-active' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Event Details */}
          <motion.div {...fadeUp(0.1)} className="card p-6">
            <h2 className="text-lg font-bold text-white/80 mb-4 font-display">Event Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-accent-cyan mt-0.5" />
                <div>
                  <p className="text-xs text-white/25 uppercase tracking-wider font-bold">Date</p>
                  <p className="font-medium text-white/70">
                    {new Date(request.event_start_date).toLocaleDateString()}
                    {request.event_end_date !== request.event_start_date && ` - ${new Date(request.event_end_date).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-5 h-5 text-accent-magenta mt-0.5" />
                <div>
                  <p className="text-xs text-white/25 uppercase tracking-wider font-bold">Venue</p>
                  <p className="font-medium text-white/70">{request.venue}</p>
                </div>
              </div>
            </div>
            {request.event_url && (
              <div className="mt-4">
                <p className="text-xs text-white/25 uppercase tracking-wider font-bold mb-1">Event URL</p>
                <a href={request.event_url} target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline text-sm">{request.event_url}</a>
              </div>
            )}
            {request.event_description && (
              <div className="mt-4">
                <p className="text-xs text-white/25 uppercase tracking-wider font-bold mb-1">Description</p>
                <p className="text-white/50 text-sm">{request.event_description}</p>
              </div>
            )}
          </motion.div>

          {/* Team Members */}
          {request.team_members?.length > 0 && (
            <motion.div {...fadeUp(0.15)} className="card p-6">
              <h2 className="text-lg font-bold text-white/80 mb-4 font-display flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5" /> Team Members ({request.team_members.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="neural-table">
                  <thead><tr>
                    <th>Name</th><th>Year</th><th>Section</th><th>Reg. No.</th><th>Phone</th><th>Parent</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {request.team_members.map((m, i) => (
                      <tr key={i}>
                        <td className="font-medium text-white/70">{m.name || m.member_name}</td>
                        <td>{m.year_of_study || '—'}</td>
                        <td>{m.section || '—'}</td>
                        <td>{m.register_number || m.member_roll_number}</td>
                        <td>{m.phone || '—'}</td>
                        <td>{m.parent_contact || '—'}</td>
                        <td>{m.is_team_lead ? <span className="badge badge-cyan text-[10px]">Lead</span> : <span className="badge badge-purple text-[10px]">Member</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Comments */}
          {(request.staff_comments || request.hod_comments) && (
            <motion.div {...fadeUp(0.2)} className="card p-6">
              <h2 className="text-lg font-bold text-white/80 mb-4 font-display">Review Comments</h2>
              <div className="space-y-3">
                {request.staff_comments && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-xs text-white/25 uppercase tracking-wider font-bold mb-1">Staff Comments</p>
                    <p className="text-white/50 text-sm">{request.staff_comments}</p>
                  </div>
                )}
                {request.hod_comments && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-xs text-white/25 uppercase tracking-wider font-bold mb-1">HOD Comments</p>
                    <p className="text-white/50 text-sm">{request.hod_comments}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <motion.div {...fadeUp(0.1)} className="card p-6">
            <h2 className="text-lg font-bold text-white/80 mb-4 font-display">Timeline</h2>
            <div className="relative">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/[0.06]" />
              <div className="space-y-4">
                <div className="relative flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent-green border-2 border-[var(--bg-surface)] shadow z-10" />
                  <div><p className="text-sm font-medium text-white/70">Submitted</p><p className="text-xs text-white/20 font-mono">{new Date(request.created_at).toLocaleString()}</p></div>
                </div>
                {request.staff_reviewed_at && (
                  <div className="relative flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-accent-cyan border-2 border-[var(--bg-surface)] shadow z-10" />
                    <div><p className="text-sm font-medium text-white/70">Staff Reviewed</p><p className="text-xs text-white/20 font-mono">{new Date(request.staff_reviewed_at).toLocaleString()}</p></div>
                  </div>
                )}
                {request.hod_reviewed_at && (
                  <div className="relative flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${request.status === 'approved' ? 'bg-accent-green' : 'bg-accent-magenta'} border-2 border-[var(--bg-surface)] shadow z-10`} />
                    <div><p className="text-sm font-medium text-white/70">{request.status === 'approved' ? 'Approved' : 'Rejected'}</p><p className="text-xs text-white/20 font-mono">{new Date(request.hod_reviewed_at).toLocaleString()}</p></div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* OD Letter */}
          {request.status === 'approved' && (
            <motion.div {...fadeUp(0.2)} className="card p-6">
              <h2 className="text-lg font-bold text-white/80 mb-4 font-display">OD Letter</h2>
              <Link to={`/student/od-letter/${id}`} className="btn btn-outline w-full mb-2">📄 View OD Letter</Link>
              <button onClick={handleDownloadLetter} className="btn btn-primary w-full mb-2"><ArrowDownTrayIcon className="w-5 h-5" /> Download</button>
              <button onClick={handleDownloadIcal} className="btn btn-outline w-full">📅 Add to Calendar</button>
              <p className="text-xs text-white/15 mt-2 text-center font-mono">PDF format with official seal</p>
            </motion.div>
          )}

          {['pending', 'staff_review', 'hod_review'].includes(request.status) && (
            <motion.div {...fadeUp(0.2)} className="card p-6">
              <h2 className="text-lg font-bold text-white/80 mb-4 font-display">OD Letter Preview</h2>
              <Link to={`/student/od-letter/${id}`} className="btn btn-outline w-full">📄 View OD Letter</Link>
              <p className="text-xs text-white/15 mt-2 text-center font-mono">Preview the formal letter</p>
            </motion.div>
          )}

          {/* Documents */}
          {request.supporting_documents?.length > 0 && (
            <motion.div {...fadeUp(0.3)} className="card p-6">
              <h2 className="text-lg font-bold text-white/80 mb-4 font-display flex items-center gap-2">
                <DocumentIcon className="w-5 h-5" /> Documents
              </h2>
              <div className="space-y-2">
                {request.supporting_documents.map((doc, i) => {
                  const docUrl = typeof doc === 'string' ? doc : doc.path || doc.url || doc.secure_url
                  const fileName = (typeof doc === 'object' && doc.name) || docUrl?.split('/').pop()?.split('?')[0] || `Document ${i + 1}`
                  const absoluteUrl = docUrl?.startsWith('/') ? `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || '3000'}${docUrl}` : docUrl
                  return (
                    <a key={i} href={absoluteUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] hover:bg-accent-cyan/5 border border-white/[0.06] transition-colors">
                      <ArrowDownTrayIcon className="w-4 h-4 text-accent-cyan shrink-0" />
                      <span className="text-sm text-accent-cyan hover:text-accent-cyan truncate">{decodeURIComponent(fileName)}</span>
                    </a>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
