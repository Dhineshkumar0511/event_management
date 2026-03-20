import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  DocumentIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  PhoneIcon,
  GlobeAltIcon,
  ClockIcon,
  BuildingOffice2Icon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

const COLLEGE_NAME = 'Sri Manakula Vinayagar Engineering College'
const COLLEGE_PLACE = 'Madagadipet'

const steps = [
  { id: 1, name: 'Event Details', shortName: 'Event', icon: CalendarIcon, color: 'from-violet-500 to-purple-600' },
  { id: 2, name: 'Team Members', shortName: 'Team', icon: UserGroupIcon, color: 'from-blue-500 to-cyan-500' },
  { id: 3, name: 'Parent Info', shortName: 'Parent', icon: PhoneIcon, color: 'from-emerald-500 to-teal-500' },
  { id: 4, name: 'Documents', shortName: 'Docs', icon: CloudArrowUpIcon, color: 'from-amber-500 to-orange-500' },
  { id: 5, name: 'OD Letter Preview', shortName: 'Letter', icon: DocumentTextIcon, color: 'from-rose-500 to-pink-600' },
]

const eventTypes = [
  { value: 'hackathon', label: 'Hackathon', emoji: '\u{1F4BB}' },
  { value: 'symposium', label: 'Symposium', emoji: '\u{1F3A4}' },
  { value: 'sports', label: 'Sports', emoji: '\u{1F3C5}' },
  { value: 'workshop', label: 'Workshop', emoji: '\u{1F527}' },
  { value: 'conference', label: 'Conference', emoji: '\u{1F3AF}' },
  { value: 'cultural', label: 'Cultural', emoji: '\u{1F3AD}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4CC}' },
]

const yearSuffix = (y) => y === 1 ? 'I' : y === 2 ? 'II' : y === 3 ? 'III' : y === 4 ? 'IV' : y
const fmtDate = (d) => {
  if (!d) return '___________'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function NewODRequest() {
  const { id: editId } = useParams()
  const isEditMode = Boolean(editId)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { isDark } = useTheme()

  const [formData, setFormData] = useState({
    event_name: '', event_type: 'hackathon', event_description: '',
    organizer_name: '', organizer_contact: '', event_website: '',
    venue: '', location_city: '', location_state: '',
    event_start_date: '', event_end_date: '', event_start_time: '', event_end_time: '',
    parent_name: '', parent_phone: '', parent_email: '', emergency_contact: ''
  })

  const [teamMembers, setTeamMembers] = useState([])
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (!editId) return
    setLoadingEdit(true)
    api.get('/student/od-request/' + editId)
      .then(res => {
        const d = res.data.data
        setFormData({
          event_name: d.event_name || '', event_type: d.event_type || 'hackathon',
          event_description: d.event_description || '', organizer_name: d.organizer_name || '',
          organizer_contact: d.organizer_contact || '', event_website: d.event_website || '',
          venue: d.venue || '', location_city: d.location_city || '', location_state: d.location_state || '',
          event_start_date: d.event_start_date ? d.event_start_date.split('T')[0] : '',
          event_end_date: d.event_end_date ? d.event_end_date.split('T')[0] : '',
          event_start_time: d.event_start_time || '', event_end_time: d.event_end_time || '',
          parent_name: d.parent_name || '', parent_phone: d.parent_phone || '',
          parent_email: d.parent_email || '', emergency_contact: d.emergency_contact || ''
        })
        if (d.team_members && d.team_members.length > 0) {
          setTeamMembers(d.team_members.map(m => ({
            name: m.name || m.member_name || '', email: m.email || m.member_email || '',
            register_number: m.register_number || m.member_roll_number || '',
            department: m.department || '', year_of_study: m.year_of_study || '',
            section: m.section || '', phone: m.phone || ''
          })))
        }
      })
      .catch(() => toast.error('Failed to load request for editing'))
      .finally(() => setLoadingEdit(false))
  }, [editId])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { name: '', email: '', register_number: '', department: '', year_of_study: '', section: '', phone: '' }])
  }
  const updateTeamMember = (index, field, value) => {
    const updated = [...teamMembers]; updated[index][field] = value; setTeamMembers(updated)
  }
  const removeTeamMember = (index) => setTeamMembers(teamMembers.filter((_, i) => i !== index))
  const handleFileChange = (e) => setDocuments([...documents, ...Array.from(e.target.files)])
  const removeDocument = (index) => setDocuments(documents.filter((_, i) => i !== index))

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.event_name || !formData.venue || !formData.event_start_date || !formData.event_end_date) {
          toast.error('Please fill all required fields'); return false
        }
        return true
      case 2: return true
      case 3:
        if (!formData.parent_name || !formData.parent_phone) {
          toast.error('Parent contact information is required'); return false
        }
        return true
      default: return true
    }
  }

  const handleNext = () => { if (validateStep()) setCurrentStep(currentStep + 1) }
  const handleBack = () => setCurrentStep(currentStep - 1)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const fd = new FormData()
      Object.keys(formData).forEach(key => { if (formData[key]) fd.append(key, formData[key]) })
      if (teamMembers.length > 0) fd.append('team_members', JSON.stringify(teamMembers))
      documents.forEach(doc => fd.append('documents', doc))

      if (isEditMode) {
        await api.put('/student/od-request/' + editId, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('OD request updated and resubmitted!')
      } else {
        await api.post('/student/od-request', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('OD request submitted successfully!')
      }
      navigate('/student/my-requests')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Styling helpers ---
  const cardCls = isDark
    ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700/60 rounded-2xl shadow-xl'
    : 'bg-white border border-gray-100 rounded-2xl shadow-lg shadow-gray-200/50'
  const inputCls = [
    'w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/30',
    isDark
      ? 'bg-gray-700/60 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-gray-300'
  ].join(' ')
  const labelCls = 'block text-sm font-semibold mb-1.5 ' + (isDark ? 'text-gray-300' : 'text-gray-700')
  const textMain = isDark ? 'text-white' : 'text-gray-900'
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500'
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400'

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <DocumentTextIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={'text-2xl font-bold ' + textMain}>
              {isEditMode ? 'Edit OD Request' : 'New OD Request'}
            </h1>
            <p className={textSub + ' text-sm'}>
              {isEditMode ? 'Update and resubmit your request' : 'Submit a request for On-Duty leave'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className={cardCls + ' p-4 sm:p-5 mb-6'}
      >
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isComplete = currentStep > step.id
            const isCurrent = currentStep === step.id
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => { if (isComplete || isCurrent) setCurrentStep(step.id) }}
                    className={[
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                      isComplete
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                        : isCurrent
                        ? 'bg-gradient-to-br ' + step.color + ' text-white shadow-lg shadow-purple-500/30 ring-4 ' + (isDark ? 'ring-purple-500/20' : 'ring-purple-200')
                        : isDark
                        ? 'bg-gray-700 text-gray-500'
                        : 'bg-gray-100 text-gray-400'
                    ].join(' ')}
                  >
                    {isComplete ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </button>
                  <span className={[
                    'text-[10px] sm:text-xs mt-1.5 font-medium text-center leading-tight w-14 sm:w-20',
                    isCurrent ? (isDark ? 'text-purple-400' : 'text-purple-600')
                    : isComplete ? (isDark ? 'text-green-400' : 'text-green-600')
                    : textMuted
                  ].join(' ')}>
                    <span className="hidden sm:inline">{step.name}</span>
                    <span className="sm:hidden">{step.shortName}</span>
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={[
                    'flex-1 h-0.5 mx-1.5 sm:mx-3 mb-5 rounded-full transition-all duration-500',
                    isComplete
                      ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                      : isDark ? 'bg-gray-700' : 'bg-gray-200'
                  ].join(' ')} />
                )}
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Form Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className={cardCls + ' p-6 sm:p-8'}
        >
          {/* Step 1: Event Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={'text-lg font-bold ' + textMain}>Event Details</h2>
                  <p className={'text-xs ' + textSub}>Tell us about the event you're attending</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Event Name <span className="text-red-400">*</span></label>
                  <input type="text" name="event_name" value={formData.event_name} onChange={handleChange}
                    className={inputCls} placeholder="e.g., Smart India Hackathon 2026" />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>Event Type <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {eventTypes.map(t => (
                      <button key={t.value} type="button"
                        onClick={() => setFormData({ ...formData, event_type: t.value })}
                        className={[
                          'px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center',
                          formData.event_type === t.value
                            ? 'border-purple-500 bg-purple-500/10 text-purple-500 shadow-sm'
                            : isDark
                            ? 'border-gray-700 text-gray-400 hover:border-gray-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        ].join(' ')}
                      >
                        <span className="text-lg block mb-0.5">{t.emoji}</span>
                        <span className="text-xs">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Organizer</label>
                  <div className="relative">
                    <BuildingOffice2Icon className={'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ' + textMuted} />
                    <input type="text" name="organizer_name" value={formData.organizer_name} onChange={handleChange}
                      className={inputCls + ' pl-10'} placeholder="e.g., AICTE" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Organizer Contact</label>
                  <div className="relative">
                    <PhoneIcon className={'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ' + textMuted} />
                    <input type="text" name="organizer_contact" value={formData.organizer_contact} onChange={handleChange}
                      className={inputCls + ' pl-10'} placeholder="Phone or email" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>Event Website</label>
                  <div className="relative">
                    <GlobeAltIcon className={'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ' + textMuted} />
                    <input type="url" name="event_website" value={formData.event_website} onChange={handleChange}
                      className={inputCls + ' pl-10'} placeholder="https://..." />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea name="event_description" value={formData.event_description} onChange={handleChange}
                    className={inputCls + ' resize-none'} rows={3} placeholder="Brief description of the event..." />
                </div>

                <div className="sm:col-span-2 pt-3" style={{ borderTop: isDark ? '1px solid #374151' : '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPinIcon className="w-4 h-4 text-rose-500" />
                    <span className={'text-sm font-semibold ' + textMain}>Venue & Location</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>Venue <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <MapPinIcon className={'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ' + textMuted} />
                    <input type="text" name="venue" value={formData.venue} onChange={handleChange}
                      className={inputCls + ' pl-10'} placeholder="e.g., IIT Madras Research Park" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" name="location_city" value={formData.location_city} onChange={handleChange}
                    className={inputCls} placeholder="e.g., Chennai" />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" name="location_state" value={formData.location_state} onChange={handleChange}
                    className={inputCls} placeholder="e.g., Tamil Nadu" />
                </div>

                <div className="sm:col-span-2 pt-3" style={{ borderTop: isDark ? '1px solid #374151' : '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <ClockIcon className="w-4 h-4 text-blue-500" />
                    <span className={'text-sm font-semibold ' + textMain}>Date & Time</span>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
                  <input type="date" name="event_start_date" value={formData.event_start_date} onChange={handleChange}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date <span className="text-red-400">*</span></label>
                  <input type="date" name="event_end_date" value={formData.event_end_date} onChange={handleChange}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Start Time</label>
                  <input type="time" name="event_start_time" value={formData.event_start_time} onChange={handleChange}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Time</label>
                  <input type="time" name="event_end_time" value={formData.event_end_time} onChange={handleChange}
                    className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Team Members */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={'text-lg font-bold ' + textMain}>Team Members</h2>
                    <p className={'text-xs ' + textSub}>Add your teammates (optional)</p>
                  </div>
                </div>
                <button type="button" onClick={addTeamMember}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlusIcon className="w-4 h-4" /> Add Member
                </button>
              </div>

              {teamMembers.length === 0 ? (
                <div className={'text-center py-12 border-2 border-dashed rounded-2xl ' + (isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50')}>
                  <div className={'w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 ' + (isDark ? 'bg-blue-900/30' : 'bg-blue-100')}>
                    <UserGroupIcon className={'w-8 h-8 ' + (isDark ? 'text-blue-400' : 'text-blue-500')} />
                  </div>
                  <p className={'font-semibold ' + textMain}>No team members added</p>
                  <p className={'text-sm mt-1 ' + textMuted}>Click "Add Member" if you're attending with a team</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={'rounded-xl border p-5 ' + (isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border-blue-100')}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-cyan-500">
                            {index + 1}
                          </div>
                          <span className={'font-semibold text-sm ' + textMain}>Member {index + 1}</span>
                        </div>
                        <button type="button" onClick={() => removeTeamMember(index)}
                          className={'p-1.5 rounded-lg text-red-400 hover:text-red-500 transition-colors ' + (isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50')}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input type="text" placeholder="Full Name *" value={member.name}
                          onChange={(e) => updateTeamMember(index, 'name', e.target.value)} className={inputCls} />
                        <input type="email" placeholder="Email" value={member.email}
                          onChange={(e) => updateTeamMember(index, 'email', e.target.value)} className={inputCls} />
                        <input type="text" placeholder="Register Number" value={member.register_number}
                          onChange={(e) => updateTeamMember(index, 'register_number', e.target.value)} className={inputCls} />
                        <input type="text" placeholder="Department" value={member.department}
                          onChange={(e) => updateTeamMember(index, 'department', e.target.value)} className={inputCls} />
                        <select value={member.year_of_study}
                          onChange={(e) => updateTeamMember(index, 'year_of_study', e.target.value)} className={inputCls}>
                          <option value="">Year</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                        <input type="tel" placeholder="Phone Number" value={member.phone}
                          onChange={(e) => updateTeamMember(index, 'phone', e.target.value)} className={inputCls} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Parent Info */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <PhoneIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={'text-lg font-bold ' + textMain}>Parent / Guardian Information</h2>
                  <p className={'text-xs ' + textSub}>Required for OD permission letter verification</p>
                </div>
              </div>

              <div className={'p-4 rounded-xl border ' + (isDark ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200')}>
                <p className={'text-xs flex items-center gap-1.5 ' + (isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Your parent/guardian will be noted as informed in the OD letter
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Parent/Guardian Name <span className="text-red-400">*</span></label>
                  <input type="text" name="parent_name" value={formData.parent_name} onChange={handleChange}
                    className={inputCls} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelCls}>Parent Phone <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <PhoneIcon className={'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ' + textMuted} />
                    <input type="tel" name="parent_phone" value={formData.parent_phone} onChange={handleChange}
                      className={inputCls + ' pl-10'} placeholder="10-digit phone number" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Parent Email</label>
                  <input type="email" name="parent_email" value={formData.parent_email} onChange={handleChange}
                    className={inputCls} placeholder="Email address" />
                </div>
                <div>
                  <label className={labelCls}>Emergency Contact</label>
                  <div className="relative">
                    <PhoneIcon className={'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ' + textMuted} />
                    <input type="tel" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange}
                      className={inputCls + ' pl-10'} placeholder="Alternative phone number" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <CloudArrowUpIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={'text-lg font-bold ' + textMain}>Supporting Documents</h2>
                  <p className={'text-xs ' + textSub}>Upload event registration proof, invitation letters, etc. (optional)</p>
                </div>
              </div>

              <div className={'border-2 border-dashed rounded-2xl p-10 text-center transition-all hover:border-amber-400 cursor-pointer ' + (isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-amber-900/10' : 'border-gray-200 bg-gray-50/50 hover:bg-amber-50')}>
                <input type="file" id="documents" multiple onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                <label htmlFor="documents" className="cursor-pointer">
                  <div className={'w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ' + (isDark ? 'bg-amber-900/30' : 'bg-amber-100')}>
                    <CloudArrowUpIcon className={'w-8 h-8 ' + (isDark ? 'text-amber-400' : 'text-amber-600')} />
                  </div>
                  <p className={'font-semibold ' + textMain}>Click to upload documents</p>
                  <p className={'text-sm mt-1 ' + textMuted}>PDF, DOC, or images — max 10MB each</p>
                </label>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div key={index} className={'flex items-center justify-between p-3.5 rounded-xl border ' + (isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-amber-50/50 border-amber-100')}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                          <DocumentIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className={'text-sm font-medium truncate max-w-[200px] sm:max-w-none ' + textMain}>{doc.name}</p>
                          <p className={'text-xs ' + textMuted}>{(doc.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeDocument(index)}
                        className={'p-1.5 rounded-lg text-red-400 hover:text-red-500 transition-colors ' + (isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: OD Letter Preview */}
          {currentStep === 5 && (() => {
            const studentNames = [user?.name, ...teamMembers.map(m => m.name)].filter(Boolean)
            const durationDays = (() => {
              if (!formData.event_start_date || !formData.event_end_date) return null
              const s = new Date(formData.event_start_date + 'T00:00:00')
              const e = new Date(formData.event_end_date + 'T00:00:00')
              const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1
              return diff > 0 ? diff : null
            })()
            const durationHours = (() => {
              if (!formData.event_start_date || !formData.event_end_date) return null
              const s = new Date(formData.event_start_date + 'T00:00:00')
              const e = new Date(formData.event_end_date + 'T00:00:00')
              const diff = Math.ceil((e - s) / (1000 * 60 * 60))
              return diff > 0 ? diff : null
            })()
            const hasWarnings = !formData.event_name || !formData.venue || !formData.event_start_date || !formData.parent_name

            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                      <DocumentTextIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={'text-lg font-bold ' + textMain}>OD Permission Letter</h2>
                      <p className={'text-xs ' + textSub}>Review your auto-generated formal letter</p>
                    </div>
                  </div>
                  <span className={'text-xs px-3.5 py-1.5 rounded-full font-semibold ' + (isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')}>
                    Review before submitting
                  </span>
                </div>

                {/* Info tip */}
                <div className={'flex items-start gap-2.5 p-3.5 rounded-xl border text-sm ' + (isDark ? 'bg-indigo-900/10 border-indigo-800/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700')}>
                  <SparklesIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Hover over any section and click the pencil icon to go back and edit that detail.</span>
                </div>

                {/* The Letter - always white paper */}
                <div className="rounded-2xl overflow-hidden border-2 shadow-lg" style={{ borderColor: isDark ? '#4b5563' : '#d1d5db' }}>
                  <div className="p-7 sm:p-10" style={{ fontFamily: "'Times New Roman', Georgia, serif", color: '#111', backgroundColor: '#ffffff' }}>
                    {/* Header */}
                    <div className="text-center mb-4">
                      <p className="text-xl font-bold uppercase tracking-wide" style={{ color: '#111' }}>{COLLEGE_NAME}</p>
                      <p className="text-sm mt-1" style={{ color: '#444' }}>Department of {user?.department || '___________'}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>{COLLEGE_PLACE}</p>
                    </div>
                    <hr className="my-3" style={{ borderTop: '2px solid #222' }} />

                    {/* Date */}
                    <p className="text-right text-sm mb-5" style={{ color: '#dc2626' }}>
                      Date : {fmtDate(new Date().toISOString().split('T')[0])}
                    </p>

                    {/* From */}
                    <div className="relative group text-sm leading-7 mb-5" style={{ color: '#111' }}>
                      <button type="button" onClick={() => setCurrentStep(2)}
                        className="absolute -right-1 -top-1 p-1.5 rounded-lg bg-indigo-100 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Edit team">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <p className="font-bold">From,</p>
                      {studentNames.map((n, i) => <p key={i} className="ml-8">{n},</p>)}
                      <p className="ml-8">{yearSuffix(user?.year_of_study)}/{user?.section || '___'},</p>
                      <p className="ml-8">{user?.department || '___________'},</p>
                      <p className="ml-8">{COLLEGE_NAME},</p>
                      <p className="ml-8">{COLLEGE_PLACE}.</p>
                    </div>

                    {/* To */}
                    <div className="text-sm leading-7 mb-5" style={{ color: '#111' }}>
                      <p className="font-bold">To,</p>
                      <p className="ml-8">The Head of Department,</p>
                      <p className="ml-8">{user?.department || '___________'},</p>
                      <p className="ml-8">{COLLEGE_NAME},</p>
                      <p className="ml-8">{COLLEGE_PLACE}.</p>
                    </div>

                    {/* Subject */}
                    <div className="relative group text-sm mb-5" style={{ color: '#111' }}>
                      <button type="button" onClick={() => setCurrentStep(1)}
                        className="absolute -right-1 -top-1 p-1.5 rounded-lg bg-indigo-100 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Edit event">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <p>
                        <span className="font-bold">Subject : </span>
                        <span className="underline">Requesting On-Duty permission to attend {formData.event_type || 'event'} — "{formData.event_name || '___________'}"</span>
                      </p>
                    </div>

                    <p className="text-sm mb-4 font-bold" style={{ color: '#111' }}>Respected Sir/Madam,</p>

                    {/* Body - improved formal content */}
                    <div className="relative group">
                      <button type="button" onClick={() => setCurrentStep(1)}
                        className="absolute -right-1 -top-1 p-1.5 rounded-lg bg-indigo-100 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Edit event">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <p className="text-sm leading-[2]" style={{ textIndent: '40px', color: '#222' }}>
                        With due respect, {studentNames.length > 1 ? 'we' : 'I'}, the undersigned student{studentNames.length > 1 ? 's' : ''} of{' '}
                        <strong>{yearSuffix(user?.year_of_study)} Year</strong>, <strong>Section {user?.section || '___'}</strong>,{' '}
                        Department of <strong>{user?.department || '___________'}</strong>, hereby kindly request your permission to attend the{' '}
                        {durationDays ? <><strong>{durationDays}-day </strong></> : null}
                        <strong>{formData.event_type || 'event'}</strong> titled{' '}
                        "<strong>{formData.event_name || '___________'}</strong>"{' '}
                        {formData.organizer_name ? <>organized by <strong>{formData.organizer_name}</strong>, </> : null}
                        scheduled from <strong>{fmtDate(formData.event_start_date)}</strong>
                        {formData.event_end_date && formData.event_end_date !== formData.event_start_date
                          ? <> to <strong>{fmtDate(formData.event_end_date)}</strong></>
                          : null
                        }{durationHours ? <> ({durationHours} hours)</> : ''},{' '}
                        to be held at <strong>{formData.venue || '___________'}</strong>
                        {formData.location_city ? ', ' + formData.location_city : ''}
                        {formData.location_state ? ', ' + formData.location_state : ''}.
                      </p>

                      {formData.event_description && (
                        <p className="text-sm leading-[2] mt-3" style={{ textIndent: '40px', color: '#222' }}>
                          {formData.event_description}
                        </p>
                      )}

                      <p className="text-sm leading-[2] mt-3" style={{ textIndent: '40px', color: '#222' }}>
                        {studentNames.length > 1 ? 'We' : 'I'} have duly informed {studentNames.length > 1 ? 'our' : 'my'} parent{studentNames.length > 1 ? 's' : ''}/guardian(s) regarding {studentNames.length > 1 ? 'our' : 'my'} participation in this event and have obtained their consent. {studentNames.length > 1 ? 'We' : 'I'} assure you that {studentNames.length > 1 ? 'we' : 'I'} will make up for the classes missed during {studentNames.length > 1 ? 'our' : 'my'} absence and will submit any assignments or notes as required by the respective faculty members.
                      </p>

                      <p className="text-sm leading-[2] mt-3" style={{ textIndent: '40px', color: '#222' }}>
                        {studentNames.length > 1 ? 'We' : 'I'} shall be grateful if you kindly consider {studentNames.length > 1 ? 'our' : 'my'} request and grant On-Duty permission for the above-mentioned date{formData.event_end_date && formData.event_end_date !== formData.event_start_date ? 's' : ''}.
                      </p>
                    </div>

                    {/* Thanking you */}
                    <p className="text-sm mt-6" style={{ color: '#111' }}>Thanking you,</p>

                    {/* Parent + Faithfully */}
                    <div className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-4">
                      <div className="relative group">
                        <button type="button" onClick={() => setCurrentStep(3)}
                          className="absolute -right-1 -top-1 p-1.5 rounded-lg bg-indigo-100 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Edit parent info">
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <p className="text-xs italic" style={{ color: '#666' }}>Informed to {studentNames.length > 1 ? 'their' : 'my'} Parent(s)</p>
                        {formData.parent_name && (
                          <p className="text-xs mt-1" style={{ color: '#888' }}>{formData.parent_name} — {formData.parent_phone}</p>
                        )}
                        <p className="text-sm mt-3" style={{ color: '#555' }}>Place : {COLLEGE_PLACE}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: '#111' }}>Yours faithfully,</p>
                        <div className="mt-2 space-y-0.5">
                          {studentNames.map((n, i) => <p key={i} className="text-sm" style={{ color: '#333' }}>{n}</p>)}
                        </div>
                      </div>
                    </div>

                    {/* Signature placeholders */}
                    <div className="flex flex-col sm:flex-row justify-between items-end gap-8 mt-10 pt-6" style={{ borderTop: '1px solid #d1d5db' }}>
                      <div className="text-center min-w-[170px]">
                        <p className="text-xs italic mb-2" style={{ color: '#999' }}>Forward to the HOD</p>
                        <div className="w-44 h-14 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>
                          <span className="text-xs" style={{ color: '#aaa' }}>Staff Signature</span>
                        </div>
                        <p className="text-xs mt-1 pt-1" style={{ color: '#777', borderTop: '1px solid #ccc' }}>Class Advisor / Staff</p>
                      </div>
                      <div className="text-center min-w-[170px]">
                        <p className="text-xs italic mb-2" style={{ color: '#999' }}>Approved / Reviewed by HOD</p>
                        <div className="w-44 h-14 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>
                          <span className="text-xs" style={{ color: '#aaa' }}>HOD Signature</span>
                        </div>
                        <p className="text-xs mt-1 pt-1" style={{ color: '#777', borderTop: '1px solid #ccc' }}>Head of Department</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center text-[10px]" style={{ color: '#bbb' }}>
                      <p>This is a digitally generated OD permission letter.</p>
                    </div>
                  </div>
                </div>

                {/* Validation warnings */}
                {hasWarnings && (
                  <div className={'p-4 rounded-xl border flex items-start gap-3 ' + (isDark ? 'bg-amber-900/15 border-amber-800/50' : 'bg-amber-50 border-amber-200')}>
                    <ExclamationTriangleIcon className={'w-5 h-5 flex-shrink-0 mt-0.5 ' + (isDark ? 'text-amber-400' : 'text-amber-600')} />
                    <div>
                      <p className={'font-semibold text-sm ' + (isDark ? 'text-amber-300' : 'text-amber-800')}>Missing required fields:</p>
                      <ul className={'list-disc ml-4 mt-1.5 text-xs space-y-1 ' + (isDark ? 'text-amber-400/80' : 'text-amber-700')}>
                        {!formData.event_name && <li>Event name — <button type="button" onClick={() => setCurrentStep(1)} className="text-indigo-500 underline font-medium">Go to Step 1</button></li>}
                        {!formData.venue && <li>Venue — <button type="button" onClick={() => setCurrentStep(1)} className="text-indigo-500 underline font-medium">Go to Step 1</button></li>}
                        {!formData.event_start_date && <li>Start date — <button type="button" onClick={() => setCurrentStep(1)} className="text-indigo-500 underline font-medium">Go to Step 1</button></li>}
                        {!formData.parent_name && <li>Parent name — <button type="button" onClick={() => setCurrentStep(3)} className="text-indigo-500 underline font-medium">Go to Step 3</button></li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Navigation Buttons */}
          <div className={'flex justify-between mt-8 pt-6 border-t ' + (isDark ? 'border-gray-700' : 'border-gray-200')}>
            <button type="button" onClick={handleBack} disabled={currentStep === 1}
              className={'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ' + (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
            >
              <ArrowLeftIcon className="w-4 h-4" /> Back
            </button>

            {currentStep < 5 ? (
              <button type="button" onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {currentStep === 4 ? 'Preview OD Letter' : 'Next'}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-green-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {isEditMode ? 'Update & Resubmit' : 'Submit Request'}
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
