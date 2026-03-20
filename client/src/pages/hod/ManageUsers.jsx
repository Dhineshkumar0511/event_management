import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hodAPI } from '../../services/api'
import { exportToCSV } from '../../utils/export'
import toast from 'react-hot-toast'
import { 
  UserPlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'

const roleColors = {
  student: { bg: 'bg-blue-100', text: 'text-blue-800' },
  staff: { bg: 'bg-green-100', text: 'text-green-800' },
  hod: { bg: 'bg-purple-100', text: 'text-purple-800' }
}

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importRows, setImportRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importFileRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    roll_number: '',
    year: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  const fetchUsers = async () => {
    try {
      const params = roleFilter !== 'all' ? { role: roleFilter } : {}
      const response = await hodAPI.getUsers(params)
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await hodAPI.updateUser(editingUser.id, formData)
        toast.success('User updated successfully')
      } else {
        await hodAPI.createUser(formData)
        toast.success('User created successfully')
      }
      setShowModal(false)
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      roll_number: user.roll_number || '',
      year: user.year || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await hodAPI.deleteUser(userId)
      toast.success('User deleted')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      department: '',
      roll_number: '',
      year: ''
    })
  }

  const filteredUsers = users.filter(user =>
    search === '' ||
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.roll_number?.toLowerCase().includes(search.toLowerCase())
  )

  const userStats = useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    staff: users.filter(u => u.role === 'staff').length,
    hod: users.filter(u => u.role === 'hod').length
  }), [users])

  const handleExportUsers = () => {
    const data = filteredUsers.map(u => ({
      'Name': u.name,
      'Email': u.email,
      'Role': u.role,
      'Department': u.department || '',
      'Roll Number': u.roll_number || '',
      'Year': u.year || ''
    }))
    exportToCSV(data, 'users-export')
  }

  const downloadCSVTemplate = () => {
    const template = 'name,email,employee_id,role,department,phone\nJohn Doe,john@example.com,STU001,student,CSE,9876543210\nJane Smith,jane@example.com,STF001,staff,CSE,'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a .csv file')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { toast.error('CSV has no data rows'); return }
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/["']/g, ''))
      const nameIdx = headers.indexOf('name')
      const emailIdx = headers.indexOf('email')
      const empIdx = headers.findIndex(h => h.includes('employee') || h.includes('id') || h.includes('roll'))
      const roleIdx = headers.indexOf('role')
      const deptIdx = headers.indexOf('department')
      const phoneIdx = headers.indexOf('phone')
      if (nameIdx < 0 || emailIdx < 0 || empIdx < 0 || roleIdx < 0) {
        toast.error('CSV must have columns: name, email, employee_id, role')
        return
      }
      const rows = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        if (!cols[nameIdx] && !cols[emailIdx]) continue
        rows.push({
          name: cols[nameIdx] || '',
          email: cols[emailIdx] || '',
          employee_id: cols[empIdx] || '',
          role: cols[roleIdx] || 'student',
          department: deptIdx >= 0 ? cols[deptIdx] || '' : '',
          phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
        })
      }
      setImportRows(rows)
      setImportResult(null)
    }
    reader.readAsText(file)
  }

  const submitImport = async () => {
    if (!importRows.length) return
    setImporting(true)
    try {
      const res = await hodAPI.bulkImportUsers(importRows)
      const result = res.data.data
      setImportResult(result)
      toast.success(`Imported ${result.created} users${result.skipped ? `, skipped ${result.skipped}` : ''}`)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-500">Add, edit, or remove system users</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadCSVTemplate} className="btn btn-outline inline-flex items-center gap-1.5 text-sm">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Template
          </button>
          <button onClick={() => { setShowImportModal(true); setImportRows([]); setImportResult(null) }} className="btn btn-outline inline-flex items-center gap-1.5 text-sm bg-teal-50 border-teal-300 text-teal-700 hover:bg-teal-100">
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import CSV
          </button>
          {filteredUsers.length > 0 && (
            <button onClick={handleExportUsers} className="btn btn-outline inline-flex items-center gap-1.5">
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export
            </button>
          )}
          <button
            onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }}
            className="btn btn-primary"
          >
            <UserPlusIcon className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      {/* User Stats */}
      {users.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Users', value: userStats.total, color: 'bg-gray-100 text-gray-700', icon: UsersIcon },
            { label: 'Students', value: userStats.students, color: 'bg-blue-100 text-blue-700', icon: UserCircleIcon },
            { label: 'Staff', value: userStats.staff, color: 'bg-green-100 text-green-700', icon: UserCircleIcon },
            { label: 'HOD', value: userStats.hod, color: 'bg-purple-100 text-purple-700', icon: UserCircleIcon }
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-3 flex items-center gap-3`}>
              <stat.icon className="w-8 h-8 opacity-60" />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs opacity-80">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="input pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="staff">Staff</option>
            <option value="hod">HOD</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card p-12 text-center">
          <UserCircleIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No users found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${roleColors[user.role]?.bg} ${roleColors[user.role]?.text} capitalize`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {user.department || '-'}
                    {user.roll_number && <span className="text-sm text-gray-400 ml-2">({user.roll_number})</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="hod">HOD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input"
                />
              </div>
              {formData.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                    <input
                      type="text"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="input"
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <DocumentArrowUpIcon className="w-6 h-6 text-teal-600" />
                  <div>
                    <h2 className="text-lg font-semibold">Bulk Import Users</h2>
                    <p className="text-xs text-gray-500">Upload a CSV to create multiple users at once</p>
                  </div>
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Upload area */}
                {!importResult && (
                  <div
                    onClick={() => importFileRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors"
                  >
                    <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                    <p className="font-medium text-gray-700">Click to upload CSV file</p>
                    <p className="text-sm text-gray-500 mt-1">Required columns: name, email, employee_id, role</p>
                    <p className="text-xs text-gray-400 mt-1">Default password = employee_id</p>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                  </div>
                )}

                {/* Preview table */}
                {importRows.length > 0 && !importResult && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{importRows.length} records to import:</p>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            {['Name', 'Email', 'ID', 'Role', 'Department', 'Phone'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importRows.slice(0, 10).map((r, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                              <td className="px-3 py-2 text-gray-600">{r.email}</td>
                              <td className="px-3 py-2 text-gray-600">{r.employee_id}</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${roleColors[r.role]?.bg || 'bg-gray-100'} ${roleColors[r.role]?.text || 'text-gray-700'}`}>{r.role}</span>
                              </td>
                              <td className="px-3 py-2 text-gray-500">{r.department || '-'}</td>
                              <td className="px-3 py-2 text-gray-500">{r.phone || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importRows.length > 10 && (
                        <p className="px-3 py-2 text-xs text-gray-400 bg-gray-50">+ {importRows.length - 10} more rows…</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Results */}
                {importResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                      <CheckCircleIcon className="w-8 h-8 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-800">{importResult.created} users created successfully</p>
                        {importResult.skipped > 0 && (
                          <p className="text-sm text-green-700">{importResult.skipped} rows skipped</p>
                        )}
                      </div>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="rounded-xl border border-amber-200 overflow-hidden">
                        <div className="px-4 py-2 bg-amber-50 flex items-center gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800">Skipped rows</span>
                        </div>
                        <div className="divide-y divide-amber-100">
                          {importResult.errors.map((e, i) => (
                            <div key={i} className="px-4 py-2 flex items-center justify-between">
                              <span className="text-sm text-gray-700">{e.email}</span>
                              <span className="text-xs text-amber-700">{e.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t flex-shrink-0 flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn btn-outline flex-1"
                >
                  {importResult ? 'Close' : 'Cancel'}
                </button>
                {!importResult && (
                  <button
                    onClick={submitImport}
                    disabled={!importRows.length || importing}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <><span className="spinner w-4 h-4" /> Importing…</>
                    ) : (
                      <><ArrowUpTrayIcon className="w-4 h-4" /> Import {importRows.length} Users</>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
