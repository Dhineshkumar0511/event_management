import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XMarkIcon,
  PencilIcon,
  LanguageIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

const COLLEGE_NAME = 'Sri Manakula Vinayagar Engineering College'
const COLLEGE_PLACE = 'Madagadipet'

export default function ODLetterView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { user } = useAuthStore()
  const letterRef = useRef()
  const canvasRef = useRef()

  const [request, setRequest] = useState(null)
  const [student, setStudent] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSignPad, setShowSignPad] = useState(false)
  const [signing, setSigning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  // signature mode: 'draw' | 'type' | 'upload'
  const [signMode, setSignMode] = useState('draw')
  const [signText, setSignText] = useState('')
  const [signFont, setSignFont] = useState('Dancing Script')
  const [uploadedSig, setUploadedSig] = useState(null)

  useEffect(() => {
    fetchLetter()
  }, [id])

  const fetchLetter = async () => {
    try {
      const endpoint = user.role === 'student'
        ? `/student/od-request/${id}`
        : user.role === 'staff'
        ? `/staff/od-request/${id}`
        : `/hod/od-request/${id}`
      const res = await api.get(endpoint)
      const data = res.data.data
      setRequest(data)
      setStudent({
        name: data.student_name || data.name,
        register_number: data.register_number || data.employee_id,
        department: data.department,
        year_of_study: data.year_of_study,
        section: data.section,
        phone: data.student_phone || data.phone,
        email: data.student_email || data.email,
      })
      setTeamMembers(data.team_members || [])
    } catch (err) {
      console.error('Failed to fetch OD request:', err)
      toast.error('Failed to load OD letter')
    } finally {
      setLoading(false)
    }
  }

  // --- Canvas signature pad ---
  const startDraw = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  const endDraw = () => setIsDrawing(false)
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // ── Upload mode ─────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image too large (max 2MB)'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedSig(ev.target.result)
    reader.readAsDataURL(file)
  }

  // ── Get final signature data URL ───────────────────────────
  const getFinalSignature = useCallback(() => {
    if (signMode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return null
      const blank = document.createElement('canvas')
      blank.width = canvas.width; blank.height = canvas.height
      if (canvas.toDataURL() === blank.toDataURL()) return null
      return canvas.toDataURL('image/png')
    }
    if (signMode === 'type') {
      if (!signText.trim()) return null
      const c = document.createElement('canvas')
      c.width = 400; c.height = 120
      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.font = `52px "${signFont}", cursive`
      ctx.fillStyle = '#1e293b'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(signText.trim(), 200, 60)
      return c.toDataURL('image/png')
    }
    if (signMode === 'upload') {
      return uploadedSig || null
    }
    return null
  }, [signMode, signText, signFont, uploadedSig])

  const submitSignature = async () => {
    const sigData = getFinalSignature()
    if (!sigData) {
      toast.error(
        signMode === 'draw' ? 'Please draw your signature first' :
        signMode === 'type' ? 'Please type your name first' :
        'Please upload a signature image'
      )
      return
    }
    setSigning(true)
    try {
      await api.put(`/od-letter/${id}/sign`, {
        signature: sigData,
        role: user.role,
      })
      toast.success('Signature saved!')
      setShowSignPad(false)
      fetchLetter()
    } catch (err) {
      console.error('Failed to save signature:', err)
      toast.error('Failed to save signature')
    } finally {
      setSigning(false)
    }
  }

  const resetModal = () => {
    setSignMode('draw')
    setSignText('')
    setUploadedSig(null)
    clearCanvas()
    setShowSignPad(false)
  }

  const handlePrint = () => {
    const content = letterRef.current
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>OD Letter - ${request?.request_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; padding: 40px 60px; color: #111; }
        .letter-header { text-align: center; margin-bottom: 20px; }
        .college-name { font-size: 20px; font-weight: bold; text-transform: uppercase; }
        .dept-name { font-size: 14px; margin-top: 4px; }
        .place { font-size: 13px; color: #555; }
        hr { border: none; border-top: 2px solid #333; margin: 16px 0; }
        .date-line { text-align: right; font-size: 13px; margin-bottom: 16px; color: red; }
        .from-block, .to-block { font-size: 13px; line-height: 1.7; margin-bottom: 14px; }
        .subject { font-size: 13px; margin-bottom: 14px; }
        .subject b { text-decoration: underline; }
        .body-text { font-size: 13px; line-height: 1.8; text-indent: 40px; margin-bottom: 12px; }
        .closing { font-size: 13px; margin-top: 20px; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-block { text-align: center; min-width: 180px; }
        .sig-block img { max-height: 60px; margin-bottom: 4px; }
        .sig-label { font-size: 11px; color: #666; border-top: 1px solid #999; padding-top: 4px; margin-top: 4px; }
        .names-block { text-align: right; font-size: 13px; line-height: 1.7; margin-top: 12px; }
        .parent-note { font-size: 12px; font-style: italic; margin-top: 16px; }
        .forward-note { font-size: 12px; font-style: italic; margin-top: 8px; }
        @media print { body { padding: 20px 40px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const yearSuffix = (y) =>
    y === 1 ? 'I' : y === 2 ? 'II' : y === 3 ? 'III' : y === 4 ? 'IV' : y

  const fmtDate = (d) => {
    if (!d) return '___________'
    const dt = new Date(d)
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const canSign =
    (user.role === 'staff' && ['pending', 'staff_review', 'staff_approved', 'hod_review'].includes(request?.status) && !request?.staff_signature) ||
    (user.role === 'hod' && ['hod_review', 'approved'].includes(request?.status) && !request?.hod_signature)

  const canEdit =
    user.role === 'student' && ['draft', 'rejected', 'staff_rejected'].includes(request?.status)

  const goBack = () => {
    navigate(-1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>OD request not found.</p>
      </div>
    )
  }

  const studentNames = [student?.name, ...teamMembers.map(m => m.name)].filter(Boolean)
  const durationHours = (() => {
    if (!request.event_start_date || !request.event_end_date) return null
    const s = new Date(request.event_start_date)
    const e = new Date(request.event_end_date)
    const diff = Math.ceil((e - s) / (1000 * 60 * 60))
    return diff > 0 ? diff : null
  })()

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <button onClick={goBack}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'}`}
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          {canEdit && (
            <Link to={`/student/edit-request/${id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 transition-all"
            >
              <PencilSquareIcon className="w-4 h-4" /> Edit & Resubmit
            </Link>
          )}
          {canSign && (
            <button onClick={() => setShowSignPad(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all"
            >
              <PencilSquareIcon className="w-4 h-4" /> Sign Letter
            </button>
          )}
          <button onClick={handlePrint}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'}`}
          >
            <PrinterIcon className="w-4 h-4" /> Print
          </button>
        </div>
      </motion.div>

      {/* The Letter */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl shadow-xl overflow-hidden border-2" style={{ borderColor: isDark ? '#4b5563' : '#d1d5db' }}
      >
        <div ref={letterRef} className="p-8 sm:p-12" style={{ fontFamily: "'Times New Roman', 'Georgia', serif", color: '#111', backgroundColor: '#ffffff' }}>
          {/* Header */}
          <div className="letter-header text-center mb-4">
            <p className="college-name text-xl font-bold uppercase tracking-wide" style={{ color: '#111' }}>{COLLEGE_NAME}</p>
            <p className="dept-name text-sm mt-1" style={{ color: '#444' }}>
              Department of {request.department || 'Computer Science'}
            </p>
            <p className="place text-xs mt-0.5" style={{ color: '#888' }}>
              {COLLEGE_PLACE}
            </p>
          </div>

          <hr className="my-4" style={{ borderTop: '2px solid #222' }} />

          {/* Date */}
          <p className="date-line text-right text-sm mb-4" style={{ color: '#dc2626' }}>
            Date : {fmtDate(request.created_at || new Date())}
          </p>

          {/* From */}
          <div className="from-block text-sm leading-7 mb-4" style={{ color: '#111' }}>
            <p className="font-semibold">From,</p>
            {studentNames.map((n, i) => (
              <p key={i} className="ml-4">{n},</p>
            ))}
            <p className="ml-4">
              {yearSuffix(student?.year_of_study)}/{student?.section || '___'},
            </p>
            <p className="ml-4">{request.department || '___________'},</p>
            <p className="ml-4">{COLLEGE_NAME},</p>
            <p className="ml-4">{COLLEGE_PLACE}.</p>
          </div>

          {/* To */}
          <div className="to-block text-sm leading-7 mb-4" style={{ color: '#111' }}>
            <p className="font-semibold">To,</p>
            <p className="ml-4">The Head of Department,</p>
            <p className="ml-4">{request.department || '___________'},</p>
            <p className="ml-4">{COLLEGE_NAME},</p>
            <p className="ml-4">{COLLEGE_PLACE}.</p>
          </div>

          {/* Subject */}
          <div className="subject text-sm mb-4" style={{ color: '#111' }}>
            <p>
              <span className="font-semibold">Subject : </span>
              <span className="underline">
                Requesting On-Duty permission to attend {request.event_type || 'event'} — "{request.event_name || '___________'}"
              </span>
            </p>
          </div>

          {/* Respected Sir */}
          <p className="text-sm mb-3 font-semibold" style={{ color: '#111' }}>
            Respected Sir/Madam,
          </p>

          {/* Body */}
          <p className="body-text text-sm leading-8" style={{ textIndent: '40px', color: '#222' }}>
            With due respect, {studentNames.length > 1 ? 'we' : 'I'}, the undersigned student{studentNames.length > 1 ? 's' : ''} of{' '}
            <strong>{yearSuffix(student?.year_of_study)} Year</strong>, <strong>Section {student?.section || '___'}</strong>,{' '}
            Department of <strong>{request.department || '___________'}</strong>, hereby kindly request your permission to attend the{' '}
            {durationHours ? <><strong>{Math.round(durationHours / 24) + 1}-day </strong></> : null}
            <strong>{request.event_type || 'event'}</strong> titled{' '}
            "<strong>{request.event_name}</strong>"{' '}
            {request.organizer_name ? <>organized by <strong>{request.organizer_name}</strong>, </> : null}
            scheduled from <strong>{fmtDate(request.event_start_date)}</strong>
            {request.event_end_date && request.event_end_date !== request.event_start_date
              ? <> to <strong>{fmtDate(request.event_end_date)}</strong></>
              : null
            }{durationHours ? ` (${durationHours} hours)` : ''},{' '}
            to be held at <strong>{request.venue || '___________'}</strong>
            {request.location_city ? `, ${request.location_city}` : ''}
            {request.location_state ? `, ${request.location_state}` : ''}.
          </p>

          {request.event_description && (
            <p className="body-text text-sm leading-8 mt-3" style={{ textIndent: '40px', color: '#222' }}>
              {request.event_description}
            </p>
          )}

          <p className="body-text text-sm leading-8 mt-3" style={{ textIndent: '40px', color: '#222' }}>
            {studentNames.length > 1 ? 'We' : 'I'} have duly informed {studentNames.length > 1 ? 'our' : 'my'} parent{studentNames.length > 1 ? 's' : ''}/guardian(s) regarding {studentNames.length > 1 ? 'our' : 'my'} participation in this event and have obtained their consent. {studentNames.length > 1 ? 'We' : 'I'} assure you that {studentNames.length > 1 ? 'we' : 'I'} will make up for the classes missed during {studentNames.length > 1 ? 'our' : 'my'} absence and will submit any assignments or notes as required by the respective faculty members.
          </p>

          <p className="body-text text-sm leading-8 mt-3" style={{ textIndent: '40px', color: '#222' }}>
            {studentNames.length > 1 ? 'We' : 'I'} shall be grateful if you kindly consider {studentNames.length > 1 ? 'our' : 'my'} request and grant On-Duty permission for the above-mentioned date{request.event_end_date && request.event_end_date !== request.event_start_date ? 's' : ''}.
          </p>

          {/* Thanking you */}
          <p className="text-sm mt-6" style={{ color: '#111' }}>
            Thanking you,
          </p>

          {/* Parent info note */}
          <div className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-4">
            <div>
              <p className="parent-note text-xs italic" style={{ color: '#666' }}>
                Informed to {studentNames.length > 1 ? 'their' : 'my'} Parent(s)
              </p>
              {request.parent_name && (
                <p className="text-xs mt-1" style={{ color: '#888' }}>
                  {request.parent_name} — {request.parent_phone}
                </p>
              )}
              <p className="text-sm mt-3" style={{ color: '#555' }}>
                Place : {COLLEGE_PLACE}
              </p>
            </div>

            {/* Your faithfully + names */}
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: '#111' }}>
                Yours faithfully,
              </p>
              <div className="mt-2 space-y-0.5">
                {studentNames.map((n, i) => (
                  <p key={i} className="text-sm" style={{ color: '#333' }}>{n}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Signature section */}
          <div className="sig-section flex flex-col sm:flex-row justify-between items-end gap-8 mt-10 pt-6"
            style={{ borderTop: '1px solid #d1d5db' }}
          >
            {/* Staff forwards to HOD */}
            <div className="sig-block text-center min-w-[180px]">
              <p className="text-xs italic mb-2" style={{ color: '#888' }}>
                Forward to the HOD Sir
              </p>
              {request.staff_signature ? (
                <img src={request.staff_signature} alt="Staff signature" className="mx-auto max-h-16 mb-1" />
              ) : (
                <div className="w-48 h-16 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Staff Signature</span>
                </div>
              )}
              <p className="sig-label text-xs mt-1" style={{ color: '#666', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
                {request.staff_name || 'Class Advisor / Staff'}
              </p>
              {request.staff_reviewed_at && (
                <p className="text-[10px]" style={{ color: '#999' }}>
                  {fmtDate(request.staff_reviewed_at)}
                </p>
              )}
            </div>

            {/* HOD Signature */}
            <div className="sig-block text-center min-w-[180px]">
              <p className="text-xs italic mb-2" style={{ color: '#888' }}>
                Approved / Reviewed by HOD
              </p>
              {request.hod_signature ? (
                <img src={request.hod_signature} alt="HOD signature" className="mx-auto max-h-16 mb-1" />
              ) : (
                <div className="w-48 h-16 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>HOD Signature</span>
                </div>
              )}
              <p className="sig-label text-xs mt-1" style={{ color: '#666', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
                Head of Department
              </p>
              {request.hod_reviewed_at && (
                <p className="text-[10px]" style={{ color: '#999' }}>
                  {fmtDate(request.hod_reviewed_at)}
                </p>
              )}
            </div>
          </div>

          {/* Status banner */}
          {request.status === 'approved' && (
            <div className="mt-6 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">APPROVED</span>
            </div>
          )}
          {['rejected', 'staff_rejected'].includes(request.status) && (
            <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="flex items-center justify-center gap-2 py-2">
                <XMarkIcon className="w-5 h-5 text-red-600" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {request.status === 'staff_rejected' ? 'REJECTED BY STAFF' : 'REJECTED'}
                </span>
              </div>
              {canEdit && (
                <div className="border-t border-red-200 dark:border-red-800 px-4 py-2 text-center">
                  <Link to={`/student/edit-request/${id}`}
                    className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    ✏️ Edit details and resubmit →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-[10px]" style={{ color: '#bbb' }}>
            <p>This is a digitally generated OD permission letter.</p>
            <p>Request ID: {request.request_id} | Generated on: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </motion.div>

      {/* Signature Pad Modal — 3 modes: Draw / Type / Upload */}
      <AnimatePresence>
        {showSignPad && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl shadow-2xl w-full max-w-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <PencilSquareIcon className="w-5 h-5 text-indigo-500" />
                  Sign OD Letter
                </h3>
                <button onClick={resetModal}
                  className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className={`flex rounded-xl p-1 mb-5 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                {[
                  { id: 'draw',   label: 'Draw',   icon: PencilIcon },
                  { id: 'type',   label: 'Type',   icon: LanguageIcon },
                  { id: 'upload', label: 'Upload', icon: ArrowUpTrayIcon },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setSignMode(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      signMode === tab.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                        : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />{tab.label}
                  </button>
                ))}
              </div>

              {/* Draw Mode */}
              {signMode === 'draw' && (
                <div>
                  <div className="rounded-xl overflow-hidden border-2 border-dashed"
                    style={{ borderColor: isDark ? '#4b5563' : '#d1d5db', backgroundColor: '#f8f9fa' }}
                  >
                    <canvas
                      ref={canvasRef} width={460} height={160}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">Draw your signature above</p>
                  <button onClick={clearCanvas}
                    className={`mt-2 w-full py-2 rounded-xl text-sm font-medium border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >Clear</button>
                </div>
              )}

              {/* Type Mode */}
              {signMode === 'type' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={signText}
                    onChange={e => setSignText(e.target.value)}
                    placeholder="Type your name..."
                    maxLength={40}
                    className={`w-full px-4 py-3 rounded-xl border text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  />
                  <div>
                    <p className={`text-xs mb-2 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Choose Style</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'Dancing Script', label: 'Elegant' },
                        { id: 'Pacifico',       label: 'Bold' },
                        { id: 'Great Vibes',    label: 'Flowing' },
                        { id: 'Sacramento',     label: 'Classic' },
                      ].map(f => (
                        <button key={f.id} onClick={() => setSignFont(f.id)}
                          className={`py-2.5 px-3 rounded-xl border-2 text-sm transition-all ${
                            signFont === f.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                              : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ fontFamily: `"${f.id}", cursive` }}
                        >
                          <span className={`block text-lg leading-tight ${signFont === f.id ? 'text-indigo-600 dark:text-indigo-300' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {signText || 'Your Name'}
                          </span>
                          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <link rel="preconnect" href="https://fonts.googleapis.com" />
                  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Pacifico&family=Great+Vibes&family=Sacramento&display=swap" rel="stylesheet" />
                </div>
              )}

              {/* Upload Mode */}
              {signMode === 'upload' && (
                <div>
                  <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    uploadedSig ? 'border-indigo-400' :
                    isDark ? 'border-gray-600 hover:border-gray-500 bg-gray-900/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}>
                    {uploadedSig ? (
                      <img src={uploadedSig} alt="Uploaded signature" className="max-h-28 max-w-full object-contain p-2 rounded" />
                    ) : (
                      <div className="text-center">
                        <ArrowUpTrayIcon className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Click to upload signature image</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF · Max 2MB</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {uploadedSig && (
                    <button onClick={() => setUploadedSig(null)}
                      className="mt-2 w-full py-1.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Remove &amp; Upload Different
                    </button>
                  )}
                </div>
              )}

              {/* Save Button */}
              <button onClick={submitSignature} disabled={signing}
                className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all"
              >
                {signing ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>
                ) : (
                  <><CheckCircleIcon className="w-4 h-4" />Save Signature</>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
