import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { studentAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const statusStyles = {
  pending: 'bg-yellow-400',
  staff_review: 'bg-blue-400',
  hod_review: 'bg-indigo-400',
  approved: 'bg-green-400',
  rejected: 'bg-red-400',
  staff_rejected: 'bg-red-400'
}

export default function EventCalendar() {
  const { isDark } = useTheme()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await studentAPI.getRequests({})
      setEvents(response.data.data || [])
    } catch {
      console.error('Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, key: `empty-${i}` })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, key: `day-${d}` })
    }
    return days
  }, [year, month])

  const getEventsForDay = (day) => {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => {
      const start = e.event_start_date?.split('T')[0]
      const end = e.event_end_date?.split('T')[0]
      return start <= dateStr && end >= dateStr
    })
  }

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []
  const today = new Date()
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Event Calendar</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Visual overview of all your events</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-2 rounded-2xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <ChevronLeftIcon className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <ChevronRightIcon className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className={`text-center text-xs font-medium py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ day, key }) => {
              const dayEvents = getEventsForDay(day)
              const isSelected = day === selectedDate
              return (
                <button
                  key={key}
                  onClick={() => day && setSelectedDate(day)}
                  disabled={!day}
                  className={`relative aspect-square p-1 rounded-xl text-sm transition-all ${
                    !day ? '' :
                    isSelected
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : isToday(day)
                        ? isDark ? 'bg-blue-900/30 text-blue-300 ring-1 ring-blue-500' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-300'
                        : isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {day && (
                    <>
                      <span className="font-medium">{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white' : statusStyles[e.status] || 'bg-gray-400'
                            }`} />
                          ))}
                        </div>
                      )}
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
              { label: 'Rejected', color: 'bg-red-400' }
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Selected Day Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {selectedDate
              ? `Events on ${MONTHS[month]} ${selectedDate}`
              : 'Select a date'
            }
          </h3>

          {selectedDate ? (
            selectedEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/student/request/${event.id}`}
                    className={`block p-4 rounded-xl transition-colors ${
                      isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-1 h-full min-h-[40px] rounded-full ${statusStyles[event.status] || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {event.event_name}
                        </p>
                        <p className={`text-xs capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {event.event_type}
                        </p>
                        <div className={`flex items-center gap-3 mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="w-3 h-3" />
                            {event.venue}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            event.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : event.status.includes('rejected')
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {event.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <CalendarDaysIcon className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className="text-sm">No events on this date</p>
              </div>
            )
          ) : (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <CalendarDaysIcon className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className="text-sm">Click a date to see events</p>
            </div>
          )}

          {/* Upcoming summary */}
          <div className={`mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <ClockIcon className="w-4 h-4 inline mr-1" /> Upcoming Events
            </h4>
            <div className="space-y-2">
              {events
                .filter(e => new Date(e.event_start_date) >= new Date() && e.status === 'approved')
                .slice(0, 3)
                .map(e => (
                  <div key={e.id} className={`text-sm px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-green-50'}`}>
                    <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{e.event_name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(e.event_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))
              }
              {events.filter(e => new Date(e.event_start_date) >= new Date() && e.status === 'approved').length === 0 && (
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No upcoming approved events</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
