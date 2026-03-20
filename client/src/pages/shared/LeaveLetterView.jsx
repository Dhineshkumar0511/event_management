import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import { leaveAPI } from '../../services/api'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PrinterIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const COLLEGE_NAME = 'Sri Manakula Vinayagar Engineering College'
const COLLEGE_PLACE = 'Madagadipet'

const fmtDate = (d) => {
  if (!d) return '___________'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const yearSuffix = (y) =>
  y === 1 ? 'I' : y === 2 ? 'II' : y === 3 ? 'III' : y === 4 ? 'IV' : y

const LEAVE_TYPE_LABEL = {
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  emergency: 'Emergency Leave',
  medical: 'Medical Leave',
  family: 'Family Leave',
  other: 'Leave',
}

export default function LeaveLetterView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { user } = useAuthStore()
  const letterRef = useRef()
  const canvasRef = useRef()

  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSignPad, setShowSignPad] = useState(false)
  const [signing, setSigning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => { fetchLeave() }, [id])

  const fetchLeave = async () => {
    try {
      const res = await leaveAPI.getDetail(id)
      setLeave(res.data.data)
    } catch (err) {
      toast.error('Failed to load leave letter')
    } finally {
      setLoading(false)
    }
  }

  // ── Signature pad ──────────────────────────────────────────
  const startDraw = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath(); ctx.moveTo(x, y)
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
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    ctx.stroke()
  }
  const endDraw = () => setIsDrawing(false)
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }
  const submitSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const blank = document.createElement('canvas')
    blank.width = canvas.width; blank.height = canvas.height
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error('Please draw your signature first'); return
    }
    setSigning(true)
    try {
      await api.put(`/leave/${id}/sign`, { signature: canvas.toDataURL('image/png') })
      toast.success('Signature saved!')
      setShowSignPad(false)
      fetchLeave()
    } catch (err) {
      toast.error('Failed to save signature')
    } finally {
      setSigning(false)
    }
  }

  // ── Print ──────────────────────────────────────────────────
  const handlePrint = () => {
    const content = letterRef.current
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Leave Letter - ${leave?.leave_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; padding: 40px 60px; color: #111; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .underline { text-decoration: underline; }
        .italic { font-style: italic; }
        hr { border: none; border-top: 2px solid #333; margin: 16px 0; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 16px; }
        .sig-block { text-align: center; min-width: 180px; }
        .sig-block img { max-height: 60px; margin-bottom: 4px; display: block; margin: 0 auto 4px; }
        .sig-label { font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 4px; margin-top: 4px; }
        @media print { body { padding: 20px 40px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const canSign =
    (user.role === 'staff' && leave?.status === 'staff_approved' && !leave?.staff_signature) ||
    (user.role === 'hod' && leave?.status === 'approved' && !leave?.hod_signature)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!leave) {
    return (
      <div className="text-center py-20">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Leave request not found.</p>
      </div>
    )
  }

  const leaveTypeLabel = LEAVE_TYPE_LABEL[leave.leave_type] || 'Leave'
  const isPost = leave.leave_mode === 'post_leave'

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <button onClick={() => navigate(-1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'}`}
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
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

      {/* Status badge */}
      {leave.status !== 'approved' && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium text-center ${
          ['staff_rejected','rejected'].includes(leave.status) ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
          leave.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' :
          'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
        }`}>
          {leave.status === 'pending' ? '⏳ Awaiting Staff Review' :
           leave.status === 'staff_approved' ? '✓ Staff Approved — Awaiting HOD Decision' :
           leave.status === 'staff_rejected' ? '✗ Rejected by Staff' :
           leave.status === 'rejected' ? '✗ Rejected by HOD' : leave.status}
        </div>
      )}

      {/* The Letter */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl shadow-xl overflow-hidden border-2" style={{ borderColor: isDark ? '#4b5563' : '#d1d5db' }}
      >
        <div ref={letterRef} className="p-8 sm:p-12"
          style={{ fontFamily: "'Times New Roman', 'Georgia', serif", color: '#111', backgroundColor: '#ffffff' }}
        >
          {/* Header */}
          <div className="text-center mb-4">
            <p className="text-xl font-bold uppercase tracking-wide" style={{ color: '#111' }}>{COLLEGE_NAME}</p>
            <p className="text-sm mt-1" style={{ color: '#444' }}>Department of {leave.department || 'Computer Science'}</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>{COLLEGE_PLACE}</p>
          </div>

          <hr className="my-4" style={{ borderTop: '2px solid #222' }} />

          {/* Date */}
          <p className="text-right text-sm mb-4" style={{ color: '#dc2626' }}>
            Date : {fmtDate(leave.created_at)}
          </p>

          {/* From */}
          <div className="text-sm leading-7 mb-4" style={{ color: '#111' }}>
            <p className="font-semibold">From,</p>
            <p className="ml-4">{leave.student_name},</p>
            <p className="ml-4">{yearSuffix(leave.year_of_study)}/{leave.section || '___'},</p>
            <p className="ml-4">{leave.department},</p>
            <p className="ml-4">{COLLEGE_NAME},</p>
            <p className="ml-4">{COLLEGE_PLACE}.</p>
          </div>

          {/* To */}
          <div className="text-sm leading-7 mb-4" style={{ color: '#111' }}>
            <p className="font-semibold">To,</p>
            <p className="ml-4">The Head of Department,</p>
            <p className="ml-4">{leave.department},</p>
            <p className="ml-4">{COLLEGE_NAME},</p>
            <p className="ml-4">{COLLEGE_PLACE}.</p>
          </div>

          {/* Subject */}
          <div className="text-sm mb-4" style={{ color: '#111' }}>
            <p>
              <span className="font-semibold">Subject : </span>
              <span className="underline">
                {isPost
                  ? `Request for approval of ${leaveTypeLabel} taken from ${fmtDate(leave.from_date)} to ${fmtDate(leave.to_date)}`
                  : `Request for ${leaveTypeLabel} from ${fmtDate(leave.from_date)} to ${fmtDate(leave.to_date)}`
                }
              </span>
            </p>
          </div>

          <p className="text-sm mb-3 font-semibold" style={{ color: '#111' }}>Respected Sir/Madam,</p>

          {/* Body */}
          <p className="text-sm leading-8 mb-3" style={{ textIndent: '40px', color: '#222' }}>
            With due respect, I, <strong>{leave.student_name}</strong> ({leave.roll_number}), a student of{' '}
            <strong>{yearSuffix(leave.year_of_study)} Year</strong>, <strong>Section {leave.section || '___'}</strong>,{' '}
            Department of <strong>{leave.department}</strong>, {COLLEGE_NAME}, {COLLEGE_PLACE},
            {isPost
              ? <> hereby request your kind approval for the <strong>{leaveTypeLabel}</strong> I had to take from{' '}
                  <strong>{fmtDate(leave.from_date)}</strong> to <strong>{fmtDate(leave.to_date)}</strong>{' '}
                  (<strong>{leave.days_count} day{leave.days_count > 1 ? 's' : ''}</strong>) due to unavoidable circumstances.</>
              : <> would like to humbly request your permission to grant me <strong>{leaveTypeLabel}</strong> from{' '}
                  <strong>{fmtDate(leave.from_date)}</strong> to <strong>{fmtDate(leave.to_date)}</strong>{' '}
                  (<strong>{leave.days_count} day{leave.days_count > 1 ? 's' : ''}</strong>).</>
            }
          </p>

          <p className="text-sm leading-8 mb-3" style={{ textIndent: '40px', color: '#222' }}>
            The reason for this leave is: <strong>{leave.reason}</strong>.
          </p>

          <p className="text-sm leading-8 mb-3" style={{ textIndent: '40px', color: '#222' }}>
            I have duly informed my parent/guardian regarding my absence.
            I assure you that I will make up for the academic work missed during my absence and will submit
            any assignments or notes as required by the respective faculty members.
            {leave.contact_during_leave
              ? <> I can be reached at <strong>{leave.contact_during_leave}</strong> during this period.</>
              : null
            }
          </p>

          <p className="text-sm leading-8" style={{ textIndent: '40px', color: '#222' }}>
            I shall be grateful if you kindly {isPost ? 'approve my post-leave application' : 'consider my request and grant the leave'} for the above-mentioned period.
          </p>

          <p className="text-sm mt-6" style={{ color: '#111' }}>Thanking you,</p>

          {/* Parent + Yours faithfully */}
          <div className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-4">
            <div>
              {leave.parent_name && (
                <div>
                  <p className="text-xs italic" style={{ color: '#666' }}>Parent/Guardian Details:</p>
                  <p className="text-xs mt-1" style={{ color: '#888' }}>
                    {leave.parent_name}{leave.parent_phone ? ` — ${leave.parent_phone}` : ''}
                  </p>
                </div>
              )}
              <p className="text-sm mt-3" style={{ color: '#555' }}>Place : {COLLEGE_PLACE}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: '#111' }}>Yours faithfully,</p>
              <p className="text-sm mt-2" style={{ color: '#333' }}>{leave.student_name}</p>
              <p className="text-xs" style={{ color: '#888' }}>{leave.roll_number}</p>
            </div>
          </div>

          {/* Signature section */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-8 mt-10 pt-6"
            style={{ borderTop: '1px solid #d1d5db' }}
          >
            {/* Staff */}
            <div className="text-center" style={{ minWidth: '180px' }}>
              <p className="text-xs italic mb-2" style={{ color: '#888' }}>Forward to the HOD Sir</p>
              {leave.staff_signature ? (
                <img src={leave.staff_signature} alt="Staff signature" className="mx-auto max-h-16 mb-1" />
              ) : (
                <div className="w-48 h-16 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}
                >
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Staff Signature</span>
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: '#666', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
                {leave.staff_name || 'Class Advisor / Staff'}
              </p>
              {leave.staff_reviewed_at && (
                <p className="text-xs" style={{ color: '#999' }}>{fmtDate(leave.staff_reviewed_at)}</p>
              )}
            </div>

            {/* HOD */}
            <div className="text-center" style={{ minWidth: '180px' }}>
              <p className="text-xs italic mb-2" style={{ color: '#888' }}>Approved by HOD</p>
              {leave.hod_signature ? (
                <img src={leave.hod_signature} alt="HOD signature" className="mx-auto max-h-16 mb-1" />
              ) : (
                <div className="w-48 h-16 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}
                >
                  <span className="text-xs" style={{ color: '#9ca3af' }}>HOD Signature</span>
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: '#666', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
                Head of Department
              </p>
              {leave.hod_reviewed_at && (
                <p className="text-xs" style={{ color: '#999' }}>{fmtDate(leave.hod_reviewed_at)}</p>
              )}
            </div>
          </div>

          {/* Leave ID watermark */}
          <p className="text-center text-xs mt-6" style={{ color: '#bbb' }}>
            Leave Ref: {leave.leave_id} · Generated on {fmtDate(new Date())}
          </p>
        </div>
      </motion.div>

      {/* Signature pad modal */}
      <AnimatePresence>
        {showSignPad && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl shadow-2xl w-full max-w-md p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Draw Signature</h3>
                <button onClick={() => setShowSignPad(false)}
                  className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="border-2 border-dashed rounded-xl overflow-hidden"
                style={{ borderColor: isDark ? '#4b5563' : '#d1d5db', backgroundColor: '#f8f9fa' }}
              >
                <canvas
                  ref={canvasRef} width={400} height={160}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-center">Sign above with mouse or touch</p>
              <div className="flex gap-3 mt-4">
                <button onClick={clearCanvas}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Clear
                </button>
                <button onClick={submitSignature} disabled={signing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {signing ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>
                  ) : (
                    <><CheckCircleIcon className="w-4 h-4" />Save Signature</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
