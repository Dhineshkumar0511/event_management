import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { hodAPI } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Simple horizontal bar component
const Bar = ({ value, max, color = 'bg-primary-500', label }) => {
  const width = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-16 text-right font-medium">{label}</span>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-sm w-10 font-semibold">{value}</span>
    </div>
  )
}

export default function Reports() {
  const { isDark } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await hodAPI.getReports()
      setData(response.data.data)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Category', 'Metric', 'Value'],
      ['Overall', 'Total Requests', data.overallStats.total_requests],
      ['Overall', 'Approved', data.overallStats.total_approved],
      ['Overall', 'Rejected', data.overallStats.total_rejected],
      ['Overall', 'Pending', data.overallStats.total_pending],
      ['Overall', 'Unique Students', data.overallStats.unique_students],
      [],
      ['Month', 'Total', 'Approved', 'Rejected'],
      ...data.monthlyTrends.map(m => [m.month, m.total, m.approved, m.rejected]),
      [],
      ['Department', 'Total', 'Approved', 'Rejected'],
      ...data.departments.map(d => [d.department, d.total, d.approved, d.rejected]),
      [],
      ['Staff', 'Reviewed', 'Forwarded', 'Rejected', 'Avg Hours'],
      ...data.staffPerformance.map(s => [
        s.staff_name, s.total_reviewed, s.forwarded, s.rejected,
        s.avg_review_hours ? Math.round(s.avg_review_hours) : 'N/A'
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eventpass-reports-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`card p-12 text-center ${isDark ? 'bg-gray-800' : ''}`}>
        <ChartBarIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No Data Available</h3>
      </div>
    )
  }

  const { overallStats, monthlyTrends, eventTypes, departments, staffPerformance, topStudents } = data
  const approvalRate = overallStats.total_requests > 0
    ? ((overallStats.total_approved / overallStats.total_requests) * 100).toFixed(1)
    : 0
  const maxMonthly = Math.max(...monthlyTrends.map(m => m.total), 1)
  const maxDept = Math.max(...departments.map(d => d.total), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Reports & Analytics
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Comprehensive insights into OD request management
          </p>
        </div>
        <button onClick={exportCSV} className="btn btn-primary flex items-center gap-2">
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Requests', value: overallStats.total_requests, icon: DocumentTextIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Approved', value: overallStats.total_approved, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Rejected', value: overallStats.total_rejected, icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-100' },
          { label: 'Pending', value: overallStats.total_pending, icon: ClockIcon, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Approval Rate', value: `${approvalRate}%`, icon: ArrowTrendingUpIcon, color: 'text-purple-600', bg: 'bg-purple-100' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl p-5 shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className={`${stat.bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <ChartBarIcon className="w-5 h-5 inline mr-2" />
            Monthly Trends
          </h2>
          {monthlyTrends.length > 0 ? (
            <div className="space-y-4">
              {monthlyTrends.map((m) => {
                const monthParts = m.month.split('-')
                const monthLabel = MONTHS_SHORT[parseInt(monthParts[1]) - 1]
                return (
                  <div key={m.month}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {monthLabel} {monthParts[0]}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {m.total} total
                      </span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.approved / maxMonthly) * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className="bg-green-500 rounded-l-full h-full"
                        title={`${m.approved} approved`}
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.rejected / maxMonthly) * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className="bg-red-400 h-full"
                        title={`${m.rejected} rejected`}
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((m.total - m.approved - m.rejected) / maxMonthly) * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className="bg-yellow-400 rounded-r-full h-full"
                        title={`${m.total - m.approved - m.rejected} pending`}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex gap-4 pt-2">
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-green-500 rounded" /> Approved</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-red-400 rounded" /> Rejected</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-yellow-400 rounded" /> Pending</span>
              </div>
            </div>
          ) : (
            <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data yet</p>
          )}
        </motion.div>

        {/* Event Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`rounded-xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Event Type Distribution
          </h2>
          {eventTypes.length > 0 ? (
            <div className="space-y-3">
              {eventTypes.map((et, i) => {
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
                const total = eventTypes.reduce((acc, t) => acc + t.count, 0)
                const percentage = ((et.count / total) * 100).toFixed(1)
                return (
                  <div key={et.event_type} className="flex items-center gap-3">
                    <span className={`capitalize text-sm w-28 truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {et.event_type}
                    </span>
                    <div className={`flex-1 h-5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full ${colors[i % colors.length]}`}
                      />
                    </div>
                    <span className={`text-sm font-semibold w-16 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {et.count} ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data yet</p>
          )}
        </motion.div>

        {/* Department Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <AcademicCapIcon className="w-5 h-5 inline mr-2" />
            Department Breakdown
          </h2>
          {departments.length > 0 ? (
            <div className="space-y-4">
              {departments.map((dept) => (
                <div key={dept.department}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {dept.department || 'Unknown'}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {dept.total} requests
                    </span>
                  </div>
                  <div className={`flex gap-0.5 h-4 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      style={{ width: `${(dept.approved / maxDept) * 100}%` }}
                      className="bg-green-500 h-full transition-all duration-500"
                    />
                    <div
                      style={{ width: `${(dept.rejected / maxDept) * 100}%` }}
                      className="bg-red-400 h-full transition-all duration-500"
                    />
                  </div>
                  <div className={`flex gap-4 text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span>{dept.approved} approved</span>
                    <span>{dept.rejected} rejected</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data yet</p>
          )}
        </motion.div>

        {/* Staff Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`rounded-xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <UserGroupIcon className="w-5 h-5 inline mr-2" />
            Staff Performance
          </h2>
          {staffPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    <th className="text-left pb-3 font-medium">Staff</th>
                    <th className="text-center pb-3 font-medium">Reviewed</th>
                    <th className="text-center pb-3 font-medium">Forwarded</th>
                    <th className="text-center pb-3 font-medium">Rejected</th>
                    <th className="text-center pb-3 font-medium">Avg Time</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {staffPerformance.map((staff) => (
                    <tr key={staff.staff_name}>
                      <td className={`py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {staff.staff_name}
                      </td>
                      <td className="text-center py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                          {staff.total_reviewed}
                        </span>
                      </td>
                      <td className="text-center py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`}>
                          {staff.forwarded}
                        </span>
                      </td>
                      <td className="text-center py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'}`}>
                          {staff.rejected}
                        </span>
                      </td>
                      <td className={`text-center py-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {staff.avg_review_hours ? `${Math.round(staff.avg_review_hours)}h` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data yet</p>
          )}
        </motion.div>
      </div>

      {/* Top Students */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`rounded-xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Top Students by OD Requests
        </h2>
        {topStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  <th className="text-left pb-3 font-medium">#</th>
                  <th className="text-left pb-3 font-medium">Student</th>
                  <th className="text-left pb-3 font-medium">Roll No</th>
                  <th className="text-left pb-3 font-medium">Department</th>
                  <th className="text-center pb-3 font-medium">Total</th>
                  <th className="text-center pb-3 font-medium">Approved</th>
                  <th className="text-center pb-3 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {topStudents.map((student, i) => (
                  <tr key={i}>
                    <td className={`py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className={`py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {student.name}
                    </td>
                    <td className={`py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {student.roll_number}
                    </td>
                    <td className={`py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {student.department || '-'}
                    </td>
                    <td className="text-center py-3 font-semibold">{student.total_requests}</td>
                    <td className="text-center py-3 text-green-600 font-semibold">{student.approved}</td>
                    <td className="text-center py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        (student.approved / student.total_requests) >= 0.7
                          ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                          : isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {((student.approved / student.total_requests) * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data yet</p>
        )}
      </motion.div>
    </div>
  )
}
