import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
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
  ArrowDownTrayIcon,
  TableCellsIcon,
  PrinterIcon
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
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async (range) => {
    setLoading(true)
    try {
      const params = {}
      if (range?.from) params.from = range.from
      if (range?.to) params.to = range.to
      const response = await hodAPI.getReports(params)
      setData(response.data.data)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = () => {
    fetchReports(dateRange)
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

  const exportExcel = () => {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const dateStr = new Date().toISOString().split('T')[0]
    const rate = data.overallStats.total_requests > 0
      ? ((data.overallStats.total_approved / data.overallStats.total_requests) * 100).toFixed(1)
      : 0

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Metric', 'Value'],
      ['Total Requests', data.overallStats.total_requests],
      ['Approved', data.overallStats.total_approved],
      ['Rejected', data.overallStats.total_rejected],
      ['Pending', data.overallStats.total_pending],
      ['Unique Students', data.overallStats.unique_students],
      ['Approval Rate (%)', rate],
    ]), 'Overview')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Month', 'Total', 'Approved', 'Rejected', 'Pending'],
      ...data.monthlyTrends.map(m => [m.month, m.total, m.approved, m.rejected, m.total - m.approved - m.rejected])
    ]), 'Monthly Trends')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Department', 'Total', 'Approved', 'Rejected'],
      ...data.departments.map(d => [d.department || 'Unknown', d.total, d.approved, d.rejected])
    ]), 'Departments')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Staff', 'Reviewed', 'Forwarded', 'Rejected', 'Avg Review (hrs)'],
      ...data.staffPerformance.map(s => [
        s.staff_name, s.total_reviewed, s.forwarded, s.rejected,
        s.avg_review_hours ? Math.round(s.avg_review_hours) : 'N/A'
      ])
    ]), 'Staff Performance')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Name', 'Roll No', 'Department', 'Total Requests', 'Approved', 'Rate (%)'],
      ...data.topStudents.map(s => [
        s.name, s.roll_number, s.department || '-', s.total_requests, s.approved,
        ((s.approved / s.total_requests) * 100).toFixed(0)
      ])
    ]), 'Top Students')

    XLSX.writeFile(wb, `eventpass-reports-${dateStr}.xlsx`)
  }

  const exportPDF = () => {
    if (!data) return
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const rate = data.overallStats.total_requests > 0
      ? ((data.overallStats.total_approved / data.overallStats.total_requests) * 100).toFixed(1)
      : 0
    const html = `<!DOCTYPE html><html><head><title>EventPass Reports</title><style>
      body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:20px}
      h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;margin-top:20px;margin-bottom:8px;border-bottom:1px solid #ccc;padding-bottom:4px}
      .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
      .stat{border:1px solid #ddd;padding:10px;border-radius:6px;text-align:center}
      .stat-val{font-size:22px;font-weight:bold}.stat-lbl{font-size:10px;color:#666}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#f5f5f5;text-align:left;padding:6px 8px;font-size:11px;border:1px solid #ddd}
      td{padding:5px 8px;border:1px solid #eee;font-size:11px}tr:nth-child(even)td{background:#fafafa}
      footer{font-size:10px;color:#999;text-align:center;margin-top:30px}
      @media print{@page{margin:15mm}}
    </style></head><body>
    <h1>EventPass — Reports &amp; Analytics</h1>
    <p style="color:#666;font-size:11px">Generated on ${date}</p>
    <h2>Overview</h2>
    <div class="grid">
      <div class="stat"><div class="stat-val">${data.overallStats.total_requests}</div><div class="stat-lbl">Total Requests</div></div>
      <div class="stat"><div class="stat-val" style="color:#16a34a">${data.overallStats.total_approved}</div><div class="stat-lbl">Approved</div></div>
      <div class="stat"><div class="stat-val" style="color:#dc2626">${data.overallStats.total_rejected}</div><div class="stat-lbl">Rejected</div></div>
      <div class="stat"><div class="stat-val" style="color:#d97706">${data.overallStats.total_pending}</div><div class="stat-lbl">Pending</div></div>
      <div class="stat"><div class="stat-val" style="color:#7c3aed">${rate}%</div><div class="stat-lbl">Approval Rate</div></div>
    </div>
    <h2>Monthly Trends</h2>
    <table><tr><th>Month</th><th>Total</th><th>Approved</th><th>Rejected</th><th>Pending</th></tr>
    ${data.monthlyTrends.map(m => `<tr><td>${m.month}</td><td>${m.total}</td><td>${m.approved}</td><td>${m.rejected}</td><td>${m.total - m.approved - m.rejected}</td></tr>`).join('')}</table>
    <h2>Department Breakdown</h2>
    <table><tr><th>Department</th><th>Total</th><th>Approved</th><th>Rejected</th></tr>
    ${data.departments.map(d => `<tr><td>${d.department || 'Unknown'}</td><td>${d.total}</td><td>${d.approved}</td><td>${d.rejected}</td></tr>`).join('')}</table>
    <h2>Staff Performance</h2>
    <table><tr><th>Staff</th><th>Reviewed</th><th>Forwarded</th><th>Rejected</th><th>Avg Time</th></tr>
    ${data.staffPerformance.map(s => `<tr><td>${s.staff_name}</td><td>${s.total_reviewed}</td><td>${s.forwarded}</td><td>${s.rejected}</td><td>${s.avg_review_hours ? Math.round(s.avg_review_hours)+'h' : 'N/A'}</td></tr>`).join('')}</table>
    <h2>Top Students</h2>
    <table><tr><th>#</th><th>Name</th><th>Roll No</th><th>Department</th><th>Total</th><th>Approved</th><th>Rate</th></tr>
    ${data.topStudents.map((s, i) => `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.roll_number}</td><td>${s.department || '-'}</td><td>${s.total_requests}</td><td>${s.approved}</td><td>${((s.approved/s.total_requests)*100).toFixed(0)}%</td></tr>`).join('')}</table>
    <footer>EventPass OD Management System &bull; Confidential &bull; ${date}</footer>
    </body></html>`
    const win = window.open('', '_blank', 'width=920,height=700')
    win.document.write(html)
    win.document.close()
    win.onload = () => win.print()
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
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateRange.from}
            onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
            className={`text-sm px-2 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
          />
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>to</span>
          <input type="date" value={dateRange.to}
            onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
            className={`text-sm px-2 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
          />
          <button onClick={handleDateFilter} className="btn btn-outline text-sm px-3 py-1.5">Filter</button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button onClick={exportCSV} className="btn btn-outline flex items-center gap-2 text-sm">
            <ArrowDownTrayIcon className="w-4 h-4" />
            CSV
          </button>
          <button onClick={exportExcel} className="btn flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white border-0">
            <TableCellsIcon className="w-4 h-4" />
            Excel
          </button>
          <button onClick={exportPDF} className="btn flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white border-0">
            <PrinterIcon className="w-4 h-4" />
            PDF
          </button>
        </div>
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
