import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackingAPI, studentAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { subscribeToCheckinReminders, unsubscribe } from '../../services/socket'
import toast from 'react-hot-toast'
import { 
  MapPinIcon, 
  CheckCircleIcon,
  ClockIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

function formatDuration(minutes) {
  if (minutes == null || !isFinite(minutes)) return 'never'
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h === 0) return `${m}m ago`
  return `${h}h ${m}m ago`
}

function formatCountdown(minutes) {
  if (minutes <= 0) return 'NOW!'
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export default function ActiveEvent() {
  const [activeRequests, setActiveRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [location, setLocation] = useState(null)
  const [notes, setNotes] = useState('')
  const [minutesSinceCheckin, setMinutesSinceCheckin] = useState(null)
  const [checkinType, setCheckinType] = useState('manual')
  const { isDark } = useTheme()
  const timerRef = useRef()

  useEffect(() => {
    fetchActiveRequests()
    subscribeToCheckinReminders((data) => {
      toast('📍 Time to check in for "' + data.eventName + '"!', {
        duration: 10000,
        icon: '⏰',
      })
    })
    return () => unsubscribe('checkin_reminder')
  }, [])

  useEffect(() => {
    if (selectedRequest) {
      fetchCheckins(selectedRequest.id)
    }
  }, [selectedRequest])

  // Live timer — update every 30 seconds
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    const updateTimer = () => {
      if (selectedRequest?.last_checkin) {
        const diff = (Date.now() - new Date(selectedRequest.last_checkin).getTime()) / (1000 * 60)
        setMinutesSinceCheckin(diff)
      } else if (checkins.length > 0) {
        const diff = (Date.now() - new Date(checkins[0].checkin_time).getTime()) / (1000 * 60)
        setMinutesSinceCheckin(diff)
      } else {
        setMinutesSinceCheckin(null)
      }
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 30000)
    return () => clearInterval(timerRef.current)
  }, [selectedRequest, checkins])

  const fetchActiveRequests = async () => {
    try {
      const response = await studentAPI.getRequests({ status: 'approved' })
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const active = (response.data.data || []).filter(req => {
        const end = new Date(req.event_end_date)
        end.setHours(23, 59, 59, 999)
        return end >= now
      })
      setActiveRequests(active)
      if (active.length > 0) {
        setSelectedRequest(active[0])
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCheckins = async (requestId) => {
    try {
      const response = await trackingAPI.getCheckins(requestId)
      setCheckins(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch check-ins:', error)
    }
  }

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => reject(error),
        { enableHighAccuracy: true }
      )
    })
  }

  const handleCheckIn = async () => {
    if (!selectedRequest) return
    
    setCheckingIn(true)
    try {
      let loc = location
      if (!loc) {
        loc = await getCurrentLocation()
        setLocation(loc)
      }
      
      const resp = await trackingAPI.checkin({
        od_request_id: selectedRequest.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        checkin_type: checkinType,
        notes: notes || 'Regular check-in'
      })
      
      const data = resp.data.data
      if (data?.isWithinVenue === false) {
        toast(`Check-in recorded — you're ${(data.distanceFromVenue / 1000).toFixed(1)}km from venue`, { duration: 6000, icon: '📍' })
      } else {
        toast.success('Check-in successful!')
      }
      setNotes('')
      setMinutesSinceCheckin(0)
      setCheckinType('manual')
      fetchCheckins(selectedRequest.id)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in. Please try again.')
      console.error('Check-in error:', error)
    } finally {
      setCheckingIn(false)
    }
  }

  const interval = selectedRequest?.checkin_interval_minutes || 180
  const minutesRemaining = minutesSinceCheckin != null ? interval - minutesSinceCheckin : null
  const isOverdue = minutesRemaining != null && minutesRemaining <= 0
  const isWarning = minutesRemaining != null && minutesRemaining > 0 && minutesRemaining <= 30
  const complianceRate = selectedRequest?.checkin_compliance_rate || 0

  // Determine if event has actually started
  const eventStartDate = selectedRequest ? new Date(selectedRequest.event_start_date) : null
  const eventStartDay = eventStartDate ? new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate()) : null
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const hasEventStarted = eventStartDay ? todayDay >= eventStartDay : false
  const daysUntilStart = eventStartDay ? Math.ceil((eventStartDay - todayDay) / (1000 * 60 * 60 * 24)) : 0

  const getComplianceColor = (rate) => {
    if (rate >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Excellent' }
    if (rate >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Fair' }
    return { bg: 'bg-red-500', text: 'text-red-500', label: 'Low' }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <SignalIcon className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    )
  }

  if (activeRequests.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`rounded-2xl p-16 text-center border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
      >
        <SignalIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>No Active Events</h3>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          You don't have any approved events happening right now.
        </p>
      </motion.div>
    )
  }

  const comp = getComplianceColor(complianceRate)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <SignalIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Active Event Tracking</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check in every {interval / 60} hours during your event</p>
        </div>
      </div>

      {/* Check-in Urgency Banner */}
      <AnimatePresence>
        {isOverdue && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
              <ExclamationTriangleIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Check-in Overdue!</p>
              <p className="text-sm text-white/80">
                Last check-in was {formatDuration(minutesSinceCheckin)}. Please check in now to maintain compliance.
              </p>
            </div>
            <button onClick={handleCheckIn} disabled={checkingIn}
              className="px-4 py-2 bg-white text-red-600 font-bold rounded-xl text-sm hover:bg-white/90 transition-all flex-shrink-0"
            >
              Check In Now
            </button>
          </motion.div>
        )}
        {isWarning && !isOverdue && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 flex items-center gap-3"
          >
            <ClockIcon className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Check-in Due Soon</p>
              <p className="text-sm text-white/80">
                Next check-in due in {formatCountdown(minutesRemaining)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeRequests.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {activeRequests.map((req) => (
            <button
              key={req.id}
              onClick={() => setSelectedRequest(req)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold text-sm transition-all ${
                selectedRequest?.id === req.id
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {req.event_name}
            </button>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Check-in Timer Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              {/* Timer strip at top */}
              <div className={`px-6 py-3 flex items-center justify-between ${
                isOverdue ? 'bg-red-500/10' : isWarning ? 'bg-amber-500/10' : 'bg-emerald-500/10'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOverdue ? 'bg-red-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className={`text-sm font-bold ${isOverdue ? 'text-red-600' : isWarning ? 'text-amber-600' : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {minutesSinceCheckin == null ? 'No check-ins yet' :
                     isOverdue ? `Overdue — last check-in ${formatDuration(minutesSinceCheckin)}` :
                     `Next check-in in ${formatCountdown(minutesRemaining)}`}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isOverdue ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {minutesSinceCheckin != null ? `Last: ${formatDuration(minutesSinceCheckin)}` : 'Pending'}
                </span>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRequest.event_name}</h2>
                    <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedRequest.venue}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                    hasEventStarted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {hasEventStarted ? (
                      <><SignalIcon className="w-3.5 h-3.5" /> Active</>
                    ) : (
                      <><ClockIcon className="w-3.5 h-3.5" /> Starts in {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''}</>
                    )}
                  </span>
                </div>

                {/* Not-started banner */}
                {!hasEventStarted && (
                  <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                    <ClockIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className={`font-bold text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Event Hasn't Started Yet</p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>
                        Starts on {eventStartDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} — {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''} from now. Check-in will be available when the event starts.
                      </p>
                    </div>
                  </div>
                )}

                {/* Check-in type selector */}
                <div className="mb-4">
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Check-in Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'arrival', label: 'Arrival' },
                      { value: 'hourly', label: 'Hourly' },
                      { value: 'manual', label: 'Manual' },
                      { value: 'departure', label: 'Departure' },
                    ].map(t => (
                      <button key={t.value} onClick={() => setCheckinType(t.value)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          checkinType === t.value
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Check-in Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="E.g., Attending workshop on AI/ML, currently in session 3..."
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn || !hasEventStarted}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:scale-100 text-base ${
                      !hasEventStarted
                        ? 'bg-gray-400 shadow-none cursor-not-allowed'
                        : isOverdue 
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30 animate-pulse'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-600 shadow-blue-500/25 hover:from-blue-600 hover:to-cyan-700'
                    }`}
                  >
                    {checkingIn ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Getting Location...
                      </>
                    ) : !hasEventStarted ? (
                      <>
                        <ClockIcon className="w-5 h-5" />
                        Check-in Available in {daysUntilStart} Day{daysUntilStart !== 1 ? 's' : ''}
                      </>
                    ) : (
                      <>
                        <MapPinIcon className="w-5 h-5" />
                        {isOverdue ? 'Check In Now (Overdue!)' : 'Check In Now'}
                      </>
                    )}
                  </button>

                  <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Your location will be recorded for verification. {selectedRequest.venue_latitude ? 'Geofencing: active' : 'GPS coordinates captured'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Check-in History */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`rounded-2xl border shadow-sm p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Check-in History</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {checkins.length} total
                </span>
              </div>
              {checkins.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <MapPinIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No check-ins yet. Start by checking in above!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checkins.map((checkin, index) => (
                    <div key={checkin.id || index} className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        checkin.is_within_radius === false 
                          ? 'bg-amber-100' 
                          : 'bg-blue-100'
                      }`}>
                        {checkin.is_within_radius === false 
                          ? <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                          : <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Check-in #{checkins.length - index}</p>
                            {checkin.checkin_type && checkin.checkin_type !== 'manual' && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                {checkin.checkin_type}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(checkin.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {checkin.notes && (
                          <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{checkin.notes}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {checkin.latitude?.toFixed(4)}, {checkin.longitude?.toFixed(4)}
                          </p>
                          {checkin.distance_from_venue != null && (
                            <span className={`text-xs font-medium ${
                              checkin.is_within_radius === false ? 'text-amber-500' : 'text-emerald-500'
                            }`}>
                              {checkin.is_within_radius === false ? '!' : '✓'} {(checkin.distance_from_venue / 1000).toFixed(1)}km from venue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Compliance Score Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`rounded-2xl border shadow-sm p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <ShieldCheckIcon className="w-5 h-5 text-blue-500" /> Compliance
              </h3>
              <div className="text-center mb-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                    <path className={isDark ? 'stroke-gray-700' : 'stroke-gray-200'} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5" />
                    <path className={comp.text} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5"
                      strokeDasharray={`${complianceRate}, 100`} strokeLinecap="round" stroke="currentColor" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.round(complianceRate)}%</span>
                  </div>
                </div>
                <p className={`text-sm font-bold mt-2 ${comp.text}`}>{comp.label}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {selectedRequest.total_actual_checkins || checkins.length} / {selectedRequest.total_expected_checkins || '?'} expected
                </p>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div className={`h-full rounded-full transition-all duration-500 ${comp.bg}`} style={{ width: `${Math.min(100, complianceRate)}%` }} />
              </div>
            </motion.div>

            {/* Event Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`rounded-2xl border shadow-sm p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Event Info</h3>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <ClockIcon className="w-5 h-5 text-blue-500" />
                  <span>{new Date(selectedRequest.event_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {selectedRequest.event_end_date !== selectedRequest.event_start_date && 
                    ` — ${new Date(selectedRequest.event_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                  }</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <MapPinIcon className="w-5 h-5 text-blue-500" />
                  <span>{selectedRequest.venue}</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <BoltIcon className="w-5 h-5 text-amber-500" />
                  <span>Check-in every {interval / 60}h ({interval}min)</span>
                </div>
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-6 bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
            >
              <h3 className="text-lg font-bold mb-4">Tips for Best Compliance</h3>
              <ul className="space-y-2.5 text-sm text-white/90">
                <li className="flex items-start gap-2"><span className="text-white/60">•</span> Check in every {interval / 60} hours to maintain compliance</li>
                <li className="flex items-start gap-2"><span className="text-white/60">•</span> Use &quot;Arrival&quot; type when you first arrive at venue</li>
                <li className="flex items-start gap-2"><span className="text-white/60">•</span> Add detailed notes about sessions/activities</li>
                <li className="flex items-start gap-2"><span className="text-white/60">•</span> Keep GPS enabled for accurate tracking</li>
                <li className="flex items-start gap-2"><span className="text-white/60">•</span> Submit your result within 7 days after event ends</li>
              </ul>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
