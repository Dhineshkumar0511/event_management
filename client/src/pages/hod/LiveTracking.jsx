import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hodAPI, trackingAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { 
  MapPinIcon,
  SignalIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'

function getComplianceStyle(rate) {
  if (rate >= 80) return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Good' }
  if (rate >= 50) return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Fair' }
  return { color: 'text-red-500', bg: 'bg-red-500', label: 'Low' }
}

export default function LiveTracking() {
  const [activeEvents, setActiveEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [complianceSummary, setComplianceSummary] = useState(null)
  const [activityFeed, setActivityFeed] = useState([])
  const [overdueStudents, setOverdueStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentDetail, setStudentDetail] = useState(null)
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'activity' | 'student'
  const { isDark } = useTheme()

  useEffect(() => {
    fetchActiveEvents()
    fetchComplianceSummary()
    fetchStudentActivity()
    const interval = setInterval(() => {
      fetchActiveEvents()
      fetchStudentActivity()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchCheckins(selectedEvent.id)
    }
  }, [selectedEvent])

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentDetail(selectedStudent)
    }
  }, [selectedStudent])

  const fetchActiveEvents = async () => {
    try {
      const response = await hodAPI.getActiveEvents()
      setActiveEvents(response.data.data || [])
      if (response.data.data?.length > 0 && !selectedEvent) {
        setSelectedEvent(response.data.data[0])
      }
    } catch (error) {
      console.error('Failed to fetch active events:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComplianceSummary = async () => {
    try {
      const response = await trackingAPI.getComplianceSummary()
      setComplianceSummary(response.data.data)
    } catch { /* ignore */ }
  }

  const fetchStudentActivity = async () => {
    try {
      const response = await hodAPI.getStudentActivity({ limit: 30 })
      setActivityFeed(response.data.data?.recentActivity || [])
      setOverdueStudents(response.data.data?.overdueStudents || [])
    } catch { /* ignore */ }
  }

  const fetchStudentDetail = async (studentId) => {
    try {
      const response = await hodAPI.getStudentMonitor(studentId)
      setStudentDetail(response.data.data)
    } catch (error) {
      console.error('Failed to fetch student details:', error)
    }
  }

  const fetchCheckins = async (requestId) => {
    try {
      const response = await trackingAPI.getLiveTracking(requestId)
      setCheckins(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch check-ins:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <MapPinIcon className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <MapPinIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Tracking</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monitor students currently on OD</p>
        </div>
      </div>

      {/* Compliance overview stats */}
      {complianceSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Events', value: complianceSummary.activeEvents || activeEvents.length, gradient: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-500/30' },
            { label: 'Total Check-ins', value: complianceSummary.totalCheckins || 0, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30' },
            { label: 'Avg Compliance', value: `${Math.round(complianceSummary.avgCompliance || 0)}%`, gradient: 'from-purple-500 to-indigo-600', shadow: 'shadow-purple-500/30' },
            { label: 'Outside Venue', value: complianceSummary.outsideVenue || 0, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow} text-white`}
            >
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Overdue Students Alert Banner */}
      {overdueStudents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
              <BellAlertIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold">{overdueStudents.length} Student{overdueStudents.length !== 1 ? 's' : ''} Overdue for Check-in</p>
              <p className="text-sm text-white/80">
                {overdueStudents.slice(0, 3).map(s => s.student_name).join(', ')}{overdueStudents.length > 3 ? ` and ${overdueStudents.length - 3} more` : ''}
              </p>
            </div>
            <button onClick={() => setActiveTab('activity')}
              className="px-4 py-2 bg-white text-red-600 font-bold rounded-xl text-sm hover:bg-white/90 transition-all flex-shrink-0"
            >
              View Details
            </button>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'events', label: 'Live Events', icon: SignalIcon, count: activeEvents.length },
          { id: 'activity', label: 'Activity Feed', icon: ClockIcon, count: overdueStudents.length > 0 ? overdueStudents.length : null },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count != null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-red-500 text-white'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && studentDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setSelectedStudent(null); setStudentDetail(null) }}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{studentDetail.student.name}</h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{studentDetail.student.employee_id} — {studentDetail.student.department}</p>
                </div>
                <button onClick={() => { setSelectedStudent(null); setStudentDetail(null) }}
                  className={`p-2 rounded-xl ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <span className="text-lg">&times;</span>
                </button>
              </div>

              {/* Active ODs */}
              <h3 className={`font-bold text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Recent OD Requests</h3>
              <div className="space-y-2 mb-4">
                {studentDetail.activeODs.map(od => (
                  <div key={od.id} className={`p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{od.event_name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        od.checkin_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                      }`}>{od.checkin_count} check-ins</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {od.venue} — {new Date(od.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to {new Date(od.event_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recent Check-ins */}
              <h3 className={`font-bold text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Recent Check-ins</h3>
              {studentDetail.recentCheckins.length === 0 ? (
                <p className={`text-sm text-center py-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No check-ins recorded</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {studentDetail.recentCheckins.map((c, i) => (
                    <div key={c.id || i} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        c.is_within_radius === false ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        {c.is_within_radius === false ? <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" /> : <CheckCircleIcon className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.event_name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(c.checkin_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {c.distance_from_venue != null && ` — ${(c.distance_from_venue / 1000).toFixed(1)}km from venue`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'activity' ? (
        /* Student Activity Feed Tab */
        <div className="space-y-6">
          {/* Overdue Students */}
          {overdueStudents.length > 0 && (
            <div className={`rounded-2xl border shadow-sm p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" /> Overdue Check-ins
              </h3>
              <div className="space-y-3">
                {overdueStudents.map((s, i) => (
                  <motion.div key={s.od_request_id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border-l-4 border-red-500 cursor-pointer transition-colors ${isDark ? 'bg-red-900/10 hover:bg-red-900/20' : 'bg-red-50 hover:bg-red-100'}`}
                    onClick={() => { setSelectedStudent(s.student_id); setActiveTab('activity') }}
                  >
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.student_name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.student_roll_number} — {s.event_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-500 font-bold text-sm">
                        {s.minutes_since_last_checkin >= 60
                          ? `${Math.floor(s.minutes_since_last_checkin / 60)}h ${Math.round(s.minutes_since_last_checkin % 60)}m`
                          : `${Math.round(s.minutes_since_last_checkin)}m`} overdue
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {s.last_checkin ? `Last: ${new Date(s.last_checkin).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'No check-ins'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity Stream */}
          <div className={`rounded-2xl border shadow-sm p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <ClockIcon className="w-5 h-5 text-blue-500" /> Recent Activity
            </h3>
            {activityFeed.length === 0 ? (
              <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <MapPinIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No recent check-in activity</p>
              </div>
            ) : (
              <div className="relative">
                <div className={`absolute left-4 top-0 bottom-0 w-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className="space-y-3">
                  {activityFeed.map((item, index) => {
                    const isOutside = item.is_within_radius === false
                    return (
                      <motion.div key={item.id || index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
                        className="relative flex gap-3 pl-10 cursor-pointer"
                        onClick={() => setSelectedStudent(item.student_id)}
                      >
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 shadow ${
                          isOutside ? 'bg-amber-500 border-amber-300' : isDark ? 'bg-blue-500 border-gray-800' : 'bg-blue-500 border-white'
                        }`} />
                        <div className={`flex-1 p-3 rounded-xl transition-colors ${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.student_name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                {item.student_roll_number}
                              </span>
                              {isOutside && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-700">Outside</span>
                              )}
                            </div>
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(item.checkin_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.event_name} — {item.venue}
                            {item.distance_from_venue != null && ` (${(item.distance_from_venue / 1000).toFixed(1)}km)`}
                          </p>
                          {item.notes && (
                            <p className={`text-xs mt-1 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>"{item.notes}"</p>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeEvents.length === 0 ? (
        <div className={`rounded-2xl p-16 text-center border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <SignalIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>No Active Events</h3>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            There are no students currently attending events
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className={`rounded-2xl border shadow-sm p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <h3 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <SignalIcon className="w-5 h-5 text-green-500" />
                Active Events ({activeEvents.length})
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {activeEvents.map((event) => {
                  const comp = event.compliance_rate != null ? getComplianceStyle(event.compliance_rate) : null
                  const minutesSince = event.minutes_since_last_checkin
                  const isOverdue = minutesSince != null && minutesSince > (event.checkin_interval_minutes || 180)
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left p-3 rounded-xl transition-all border-2 ${
                        selectedEvent?.id === event.id
                          ? isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50'
                          : isDark ? 'border-gray-700 hover:border-gray-600 bg-gray-700/50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{event.event_name}</p>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                          {event.event_status === 'upcoming' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-700">Upcoming</span>
                          )}
                          {isOverdue && (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{event.student_name}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          <MapPinIcon className="w-3 h-3" /> {event.venue}
                        </span>
                        {comp && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${comp.color} ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                            {Math.round(event.compliance_rate)}%
                          </span>
                        )}
                      </div>
                      {/* Monitor button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedStudent(event.student_id) }}
                        className={`mt-2 w-full text-center text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          isDark ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        <EyeIcon className="w-3 h-3" /> Monitor Student
                      </button>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedEvent ? (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border shadow-sm p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedEvent.event_name}</h2>
                      <p className={`text-sm capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedEvent.event_type}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                      <SignalIcon className="w-3.5 h-3.5 animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: UserIcon, label: 'Student', value: selectedEvent.student_name, sub: selectedEvent.student_roll_number },
                      { icon: MapPinIcon, label: 'Venue', value: selectedEvent.venue },
                      { icon: CalendarIcon, label: 'Event Date', value: new Date(selectedEvent.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                      { icon: ClockIcon, label: 'Check-ins', value: `${checkins.length} total`, sub: selectedEvent.minutes_since_last_checkin != null ? `Last: ${Math.round(selectedEvent.minutes_since_last_checkin)}m ago` : null },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                        <div>
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{item.label}</p>
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                          {item.sub && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compliance bar */}
                  {selectedEvent.compliance_rate != null && (() => {
                    const cs = getComplianceStyle(selectedEvent.compliance_rate)
                    return (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <ShieldCheckIcon className="w-3.5 h-3.5" /> Compliance Rate
                          </span>
                          <span className={`text-sm font-bold ${cs.color}`}>{Math.round(selectedEvent.compliance_rate)}% — {cs.label}</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div className={`h-full rounded-full transition-all duration-500 ${cs.bg}`} style={{ width: `${Math.min(100, selectedEvent.compliance_rate)}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded-2xl border shadow-sm p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                >
                  <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Check-in Timeline</h3>
                  {checkins.length === 0 ? (
                    <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <MapPinIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No check-ins recorded yet</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className={`absolute left-4 top-0 bottom-0 w-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      <div className="space-y-4">
                        {checkins.map((checkin, index) => {
                          const isOutside = checkin.is_within_radius === false || checkin.outside_venue
                          return (
                            <motion.div
                              key={checkin.id || index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="relative flex gap-4 pl-10"
                            >
                              <div className={`absolute left-2 w-4 h-4 rounded-full border-2 shadow ${
                                isOutside
                                  ? 'bg-amber-500 border-amber-300'
                                  : isDark ? 'bg-blue-500 border-gray-800' : 'bg-blue-500 border-white'
                              }`} />
                              <div className={`flex-1 p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      Check-in #{checkins.length - index}
                                    </span>
                                    {checkin.checkin_type && checkin.checkin_type !== 'manual' && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                        {checkin.checkin_type}
                                      </span>
                                    )}
                                    {isOutside && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-700">Outside Venue</span>
                                    )}
                                  </div>
                                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {new Date(checkin.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {checkin.notes && (
                                  <p className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{checkin.notes}</p>
                                )}
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <MapPinIcon className="w-3 h-3" />
                                    {checkin.latitude?.toFixed(4)}, {checkin.longitude?.toFixed(4)}
                                  </span>
                                  {checkin.distance_from_venue != null && (
                                    <span className={`text-xs font-medium ${isOutside ? 'text-amber-500' : 'text-emerald-500'}`}>
                                      {(checkin.distance_from_venue / 1000).toFixed(1)}km
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            ) : (
              <div className={`rounded-2xl p-16 text-center border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <MapPinIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Select an Event</h3>
                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Choose an active event from the list to view tracking details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
