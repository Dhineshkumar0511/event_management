import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  KeyIcon,
  CheckIcon,
  ShieldCheckIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

export default function Profile() {
  const { user, updateProfile } = useAuthStore()
  const { isDark } = useTheme()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState(null)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    year_of_study: user?.year_of_study || '',
    section: user?.section || ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/auth/me')
      if (response.data.user) {
        setStats({
          unreadNotifications: response.data.unreadNotifications || 0,
          memberSince: response.data.user.created_at
        })
      }
    } catch {
      // silently fail
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateProfile(formData)
      if (result.success) {
        toast.success('Profile updated successfully!')
        setEditing(false)
      } else {
        toast.error('Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      toast.success('Password changed successfully!')
      setChangingPassword(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const roleColor = {
    student: 'from-blue-500 to-indigo-600',
    staff: 'from-emerald-500 to-teal-600',
    hod: 'from-purple-500 to-indigo-600'
  }

  const roleLabel = { student: 'Student', staff: 'Staff Advisor', hod: 'Head of Department' }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl overflow-hidden shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}
      >
        <div className={`bg-gradient-to-r ${roleColor[user?.role]} h-32 relative`}>
          <div className="absolute -bottom-12 left-8">
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ${
              isDark ? 'bg-gray-700' : 'bg-white'
            }`}>
              <span className={`bg-gradient-to-r ${roleColor[user?.role]} bg-clip-text text-transparent`}>
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-6 px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`badge bg-gradient-to-r ${roleColor[user?.role]} text-white px-3 py-1`}>
                  {roleLabel[user?.role]}
                </span>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  ID: {user?.employee_id}
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className={`btn ${editing ? 'btn-outline' : 'btn-primary'} flex items-center gap-2`}
            >
              <PencilSquareIcon className="w-4 h-4" />
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`lg:col-span-2 rounded-2xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Personal Information
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <UserCircleIcon className="w-4 h-4 inline mr-1" /> Full Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              ) : (
                <p className={`mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
              )}
            </div>

            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <EnvelopeIcon className="w-4 h-4 inline mr-1" /> Email
              </label>
              <p className={`mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.email}</p>
            </div>

            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <PhoneIcon className="w-4 h-4 inline mr-1" /> Phone
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              ) : (
                <p className={`mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.phone || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <BuildingOfficeIcon className="w-4 h-4 inline mr-1" /> Department
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              ) : (
                <p className={`mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.department || 'Not set'}</p>
              )}
            </div>

            {user?.role === 'student' && (
              <>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <AcademicCapIcon className="w-4 h-4 inline mr-1" /> Year of Study
                  </label>
                  {editing ? (
                    <select
                      value={formData.year_of_study}
                      onChange={(e) => setFormData({ ...formData, year_of_study: e.target.value })}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="">Select</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  ) : (
                    <p className={`mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {user?.year_of_study ? `${user.year_of_study} Year` : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Section
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  ) : (
                    <p className={`mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.section || 'Not set'}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {editing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex gap-3"
            >
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-outline">
                Cancel
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Sidebar Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Account Info Card */}
          <div className={`rounded-2xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Account</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Active</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Verified</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-blue-500" />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Member Since</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className={`rounded-2xl shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Security</h3>
            
            {changingPassword ? (
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    {saving ? 'Saving...' : 'Update'}
                  </button>
                  <button
                    onClick={() => setChangingPassword(false)}
                    className="btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setChangingPassword(true)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <KeyIcon className="w-4 h-4" />
                Change Password
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
