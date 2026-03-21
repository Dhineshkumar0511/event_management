import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { featuresAPI } from '../../services/api'
import {
  UsersIcon, ExclamationTriangleIcon, ClockIcon, CheckCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

export default function StaffWorkload() {
  const { isDark: dark } = useTheme()
  const [data, setData] = useState({ workload: [], escalated: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await featuresAPI.getStaffWorkload()
      setData(res.data.data || { workload: [], escalated: [] })
    } catch {} finally { setLoading(false) }
  }

  const getTotalPending = (s) => (s.pending_od || 0) + (s.pending_leave || 0)

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-10 h-10 rounded-xl flex items-center justify-center">
            <UsersIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Staff Workload</h1>
            <p className="text-sm text-gray-500">Monitor staff review queues and SLA performance</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <>
            {/* Staff Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {data.workload.map(s => {
                const total = getTotalPending(s)
                const severity = total > 10 ? 'red' : total > 5 ? 'yellow' : 'green'
                return (
                  <div key={s.id} className={`rounded-xl border p-4 ${
                    severity === 'red' ? 'ring-2 ring-red-300 dark:ring-red-800' :
                    severity === 'yellow' ? 'ring-1 ring-yellow-300 dark:ring-yellow-800' : ''
                  } ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{s.name}</h3>
                        <p className="text-xs text-gray-500">{s.department}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        severity === 'red' ? 'bg-red-500 animate-pulse' :
                        severity === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-lg p-2 text-center ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="text-lg font-bold text-orange-500">{s.pending_od || 0}</div>
                        <div className="text-xs text-gray-500">Pending OD</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="text-lg font-bold text-blue-500">{s.pending_leave || 0}</div>
                        <div className="text-xs text-gray-500">Pending Leave</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="text-lg font-bold text-green-500">{s.reviewed_today || 0}</div>
                        <div className="text-xs text-gray-500">Today</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className={`text-lg font-bold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{s.avg_review_hours || '-'}h</div>
                        <div className="text-xs text-gray-500">Avg Time</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Escalated Requests */}
            {data.escalated.length > 0 && (
              <div>
                <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" /> Escalated Requests
                </h2>
                <div className="space-y-2">
                  {data.escalated.map(r => (
                    <div key={r.id} className={`flex items-center justify-between rounded-lg border p-3 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div>
                        <span className={`font-medium text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{r.event_name}</span>
                        <span className="text-xs text-gray-500 ml-2">by {r.student_name} ({r.student_roll})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 font-medium">
                          {Math.floor((Date.now() - new Date(r.created_at)) / 86400000)}d idle
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.workload.length === 0 && (
              <div className={`text-center py-12 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No staff members found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
