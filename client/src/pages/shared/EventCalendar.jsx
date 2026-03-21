import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import api, { leaveAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Helpers for availability form defaults
const getTodayStr = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
}
const getNowTime = () => {
  const n = new Date()
  const mm = n.getMinutes() < 30 ? '00' : '30'
  return `${String(n.getHours()).padStart(2,'0')}:${mm}`
}
const addHours = (timeStr, hours) => {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const mins = h * 60 + m + Math.round(hours * 60)
  const rH = Math.floor(mins / 60) % 24
  const rM = mins % 60
  return `${String(rH).padStart(2,'0')}:${String(rM).padStart(2,'0')}`
}
const DURATION_OPTIONS = [
  { label: '30 min', value: 0.5 },
  { label: '1 hour', value: 1 },
  { label: '1.5 hours', value: 1.5 },
  { label: '2 hours', value: 2 },
  { label: '3 hours', value: 3 },
  { label: '4 hours', value: 4 },
  { label: '6 hours', value: 6 },
  { label: '8 hours', value: 8 },
]

const statusStyles = {
  pending: { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  staff_review: { dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
  hod_review: { dot: 'bg-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
  approved: { dot: 'bg-green-400', badge: 'bg-green-100 text-green-700' },
  rejected: { dot: 'bg-red-400', badge: 'bg-red-100 text-red-700' },
  staff_rejected: { dot: 'bg-red-400', badge: 'bg-red-100 text-red-700' },
}

const leaveStatusStyles = {
  pending: { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  staff_approved: { dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
  approved: { dot: 'bg-green-400', badge: 'bg-green-100 text-green-700' },
  rejected: { dot: 'bg-red-400', badge: 'bg-red-100 text-red-700' },
  staff_rejected: { dot: 'bg-red-400', badge: 'bg-red-100 text-red-700' },
}

export default function EventCalendar() {
  const { isDark } = useTheme()
  const { user } = useAuthStore()
  const role = user?.role

  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [availabilities, setAvailabilities] = useState([])
  const [leaves, setLeaves] = useState([])
  const [showAvailForm, setShowAvailForm] = useState(false)
  const [availForm, setAvailForm] = useState(() => {
    const now = getNowTime()
    return { date: getTodayStr(), start_time: now, duration: 1, end_time: addHours(now, 1), title: '', note: '' }
  })
  const [savingAvail, setSavingAvail] = useState(false)
  const [activeTab, setActiveTab] = useState('events')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const leavesCaller = role === 'student' ? leaveAPI.getMyLeaves() : leaveAPI.getStaffAll()
      const [eventsRes, availRes, leavesRes] = await Promise.all([
        api.get(`/${role === 'student' ? 'student' : role === 'staff' ? 'staff' : 'hod'}/calendar-events`),
        api.get(`/${role}/availability`),
        leavesCaller
      ])
      setEvents(eventsRes.data.data || [])
      setAvailabilities(availRes.data.data || [])
      setLeaves(leavesRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch calendar data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push({ day: null, key: `e-${i}` })
    for (let d = 1; d <= daysInMonth; d++) days.push({ day: d, key: `d-${d}` })
    return days
  }, [year, month])

  const getDateStr = (day) => `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`

  // Convert ISO/date string to local YYYY-MM-DD (avoids UTC timezone shift)
  const toLocalDate = (d) => {
    if (!d) return null
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
  }

  const getEventsForDay = (day) => {
    if (!day) return []
    const ds = getDateStr(day)
    return events.filter(e => {
      const s = toLocalDate(e.event_start_date)
      const end = toLocalDate(e.event_end_date)
      return s && end && s <= ds && end >= ds
    })
  }

  const getAvailForDay = (day) => {
    if (!day) return []
    const ds = getDateStr(day)
    return availabilities.filter(a => toLocalDate(a.date) === ds)
  }

  const getLeavesForDay = (day) => {
    if (!day) return []
    const ds = getDateStr(day)
    return leaves.filter(l => {
      const s = toLocalDate(l.from_date)
      const e = toLocalDate(l.to_date)
      return s && e && s <= ds && e >= ds
    })
  }

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []
  const selectedAvails = selectedDate ? getAvailForDay(selectedDate) : []
  const selectedLeaves = selectedDate ? getLeavesForDay(selectedDate) : []
  const today = new Date()
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const handleSaveAvailability = async (e) => {
    e.preventDefault()
    if (!availForm.date || !availForm.start_time || !availForm.end_time) {
      return toast.error('Date and time are required')
    }
    setSavingAvail(true)
    try {
      await api.post(`/${role}/availability`, availForm)
      toast.success('Availability saved')
      setShowAvailForm(false)
      const now = getNowTime()
      setAvailForm({ date: getTodayStr(), start_time: now, duration: 1, end_time: addHours(now, 1), title: '', note: '' })
      fetchData()
    } catch {
      toast.error('Failed to save availability')
    } finally {
      setSavingAvail(false)
    }
  }

  const handleDeleteAvail = async (id) => {
    try {
      await api.delete(`/${role}/availability/${id}`)
      toast.success('Availability removed')
      fetchData()
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Event Calendar</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {role === 'student' ? 'Your events overview' : 'Department events & availability'}
          </p>
        </div>
        {role !== 'student' && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'events' ? 'bg-primary-600 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >Events</button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'availability' ? 'bg-primary-600 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >My Availability</button>
            <button
              onClick={() => {
              const now = getNowTime()
              setAvailForm({ date: selectedDate ? getDateStr(selectedDate) : getTodayStr(), start_time: now, duration: 1, end_time: addHours(now, 1), title: '', note: '' })
              setShowAvailForm(true)
            }}
              className="btn btn-primary text-sm flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Set Availability
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-2 rounded-2xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <ChevronLeftIcon className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <ChevronRightIcon className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className={`text-center text-xs font-medium py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ day, key }) => {
              const dayEvents = getEventsForDay(day)
              const dayAvails = getAvailForDay(day)
              const isSelected = day === selectedDate
              return (
                <button key={key} onClick={() => day && setSelectedDate(day)} disabled={!day}
                  className={`relative aspect-square p-1 rounded-xl text-sm transition-all ${
                    !day ? '' :
                    isSelected ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' :
                    isToday(day) ? (isDark ? 'bg-blue-900/30 text-blue-300 ring-1 ring-blue-500' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-300') :
                    isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {day && (
                    <>
                      <span className="font-medium">{day}</span>
                      {/* Pending OD count badge for staff/HOD */}
                      {(role === 'staff' || role === 'hod') && (() => {
                        const pendingCount = dayEvents.filter(e => e.status === 'pending' || e.status === 'staff_review' || e.status === 'hod_review').length
                        return pendingCount > 0 ? (
                          <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-0.5 ${isSelected ? 'bg-white text-primary-700' : 'bg-amber-500 text-white'}`}>
                            {pendingCount}
                          </span>
                        ) : null
                      })()}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((e, i) => (
                          <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : (statusStyles[e.status]?.dot || 'bg-gray-400')}`} />
                        ))}
                        {dayAvails.length > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-400'}`} />
                        )}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
            {[
              { label: 'Pending', color: 'bg-yellow-400' },
              { label: 'Staff Review', color: 'bg-blue-400' },
              { label: 'HOD Review', color: 'bg-indigo-400' },
              { label: 'Approved', color: 'bg-green-400' },
              { label: 'Rejected', color: 'bg-red-400' },
              { label: 'Staff/HOD Availability', color: 'bg-purple-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-2xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} max-h-[700px] overflow-y-auto`}
        >
          {selectedDate ? (
            <>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {MONTHS[month]} {selectedDate}
              </h3>

              {/* Pending summary badge for staff/HOD */}
              {(role === 'staff' || role === 'hod') && (() => {
                const pending = selectedEvents.filter(e => e.status === 'pending' || e.status === 'staff_review' || e.status === 'hod_review').length
                return pending > 0 ? (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-amber-800">{pending} pending review on this date</span>
                  </div>
                ) : null
              })()}

              {/* Events for the day */}
              {selectedEvents.length > 0 ? (
                <div className="space-y-3 mb-4">
                  <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Events ({selectedEvents.length})</p>
                  {selectedEvents.map((event) => (
                    <div key={event.id}
                      onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                      className={`p-3 rounded-xl cursor-pointer transition-colors ${
                        isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-1 min-h-[36px] rounded-full mt-0.5 ${statusStyles[event.status]?.dot || 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{event.event_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusStyles[event.status]?.badge || ''}`}>
                              {event.status?.replace('_', ' ')}
                            </span>
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{event.event_type}</span>
                          </div>
                          {role !== 'student' && (
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              <UserIcon className="w-3 h-3 inline mr-1" />
                              {event.student_name} ({event.student_department})
                            </p>
                          )}
                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <MapPinIcon className="w-3 h-3" /> {event.venue}
                          </p>

                          {/* Expanded details with team */}
                          <AnimatePresence>
                            {selectedEvent?.id === event.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className={`mt-3 pt-3 border-t space-y-2 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                  <div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <ClockIcon className="w-3 h-3 inline mr-1" />
                                    {new Date(event.event_start_date).toLocaleDateString()} – {new Date(event.event_end_date).toLocaleDateString()}
                                  </div>
                                  {event.event_start_time && (
                                    <div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                      Time: {event.event_start_time} – {event.event_end_time || 'N/A'}
                                    </div>
                                  )}
                                  {/* Team Members */}
                                  {event.team_members && event.team_members.length > 0 && (
                                    <div className="mt-2">
                                      <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <UserGroupIcon className="w-3.5 h-3.5" /> Team ({event.team_members.length})
                                      </p>
                                      <div className="space-y-1">
                                        {event.team_members.map((m, i) => (
                                          <div key={i} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-600' : 'bg-gray-100'}`}>
                                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{m.name}</span>
                                            {m.register_number && <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({m.register_number})</span>}
                                            {m.department && <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>• {m.department}</span>}
                                            {m.is_team_lead ? <span className="ml-1 text-yellow-500 text-[10px]">★ Lead</span> : null}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-4 mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <CalendarDaysIcon className="w-10 h-10 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No events on this date</p>
                </div>
              )}

              {/* Leaves for the day */}
              {selectedLeaves.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Leaves ({selectedLeaves.length})
                  </p>
                  {selectedLeaves.map((leave) => (
                    <div key={leave.id} className={`p-3 rounded-xl ${
                      isDark ? 'bg-violet-900/20 border border-violet-800' : 'bg-violet-50 border border-violet-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-1 min-h-[36px] rounded-full mt-0.5 ${
                          leaveStatusStyles[leave.status]?.dot || 'bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {(leave.leave_type || 'Leave').replace(/_/g, ' ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              leaveStatusStyles[leave.status]?.badge || 'bg-gray-100 text-gray-600'
                            }`}>
                              {(leave.status || '').replace(/_/g, ' ')}
                            </span>
                            {leave.days_count && (
                              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{leave.days_count}d</span>
                            )}
                          </div>
                          {role !== 'student' && leave.student_name && (
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              <UserIcon className="w-3 h-3 inline mr-1" />
                              {leave.student_name}{leave.section ? ` · ${leave.section}` : ''}
                            </p>
                          )}
                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <ClockIcon className="w-3 h-3" />
                            {new Date(leave.from_date).toLocaleDateString()} – {new Date(leave.to_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Meetings / Availability for the day */}
              {selectedAvails.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {role === 'student' ? 'Meetings' : 'Meetings'}
                  </p>
                  {selectedAvails.map(a => (
                    <div key={a.id} className={`p-3 rounded-xl ${isDark ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          {a.title && <p className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>{a.title}</p>}
                          <p className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            <ClockIcon className="w-3 h-3 inline mr-1" />
                            {a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}
                          </p>
                          {a.user_name && (
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              <UserIcon className="w-3 h-3 inline mr-0.5" />
                              {a.user_name}{a.user_role ? ` (${a.user_role})` : ''}
                            </p>
                          )}
                          {a.note && <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{a.note}</p>}
                        </div>
                        {a.user_id === user.id && role !== 'student' && (
                          <button onClick={() => handleDeleteAvail(a.id)} className="text-red-400 hover:text-red-500 p-1">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <CalendarDaysIcon className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className="text-sm">Click a date to see events</p>
            </div>
          )}

          {/* Upcoming Events */}
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <ClockIcon className="w-4 h-4 inline mr-1" /> Upcoming Events
            </h4>
            <div className="space-y-2">
              {events
                .filter(e => new Date(e.event_start_date) >= new Date())
                .sort((a, b) => new Date(a.event_start_date) - new Date(b.event_start_date))
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} className={`text-sm px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{e.event_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusStyles[e.status]?.badge || 'bg-gray-100 text-gray-600'}`}>
                        {e.status?.replace('_', ' ')}
                      </span>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(e.event_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      {role !== 'student' && (
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>• {e.student_name}</p>
                      )}
                    </div>
                  </div>
                ))
              }
              {events.filter(e => new Date(e.event_start_date) >= new Date()).length === 0 && (
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No upcoming events</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Availability Form Modal */}
      <AnimatePresence>
        {showAvailForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAvailForm(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Set Availability</h3>
                <button onClick={() => setShowAvailForm(false)} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveAvailability} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date *</label>
                  <input type="date" required value={availForm.date}
                    onChange={e => setAvailForm(f => ({ ...f, date: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Start Time *</label>
                    <input type="time" required value={availForm.start_time}
                      onChange={e => {
                        const t = e.target.value
                        setAvailForm(f => ({ ...f, start_time: t, end_time: addHours(t, f.duration) }))
                      }}
                      className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Duration *</label>
                    <select value={availForm.duration}
                      onChange={e => {
                        const dur = Number(e.target.value)
                        setAvailForm(f => ({ ...f, duration: dur, end_time: addHours(f.start_time, dur) }))
                      }}
                      className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>End Time (auto-calculated)</label>
                  <input type="time" readOnly value={availForm.end_time}
                    className={`w-full px-3 py-2 rounded-lg border cursor-not-allowed opacity-70 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Title (e.g. "Available for meeting")</label>
                  <input type="text" value={availForm.title}
                    onChange={e => setAvailForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Available / Meeting / Office Hours..."
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Note</label>
                  <textarea value={availForm.note}
                    onChange={e => setAvailForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Any additional details..."
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <button type="submit" disabled={savingAvail}
                  className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  {savingAvail ? <div className="spinner w-4 h-4" /> : <CheckCircleIcon className="w-5 h-5" />}
                  {savingAvail ? 'Saving...' : 'Save Availability'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
