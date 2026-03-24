import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  UserCircleIcon, EnvelopeIcon, PhoneIcon, AcademicCapIcon,
  BuildingOfficeIcon, KeyIcon, CheckIcon, ShieldCheckIcon,
  ClockIcon, PencilSquareIcon, CameraIcon
} from '@heroicons/react/24/outline'

const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } })

const roleGradient = {
  student: 'from-accent-cyan to-accent-purple',
  staff: 'from-accent-green to-accent-cyan',
  hod: 'from-accent-purple to-accent-magenta'
}
const roleLabel = { student: 'Student', staff: 'Staff Advisor', hod: 'Head of Department' }

export default function Profile() {
  const { user, updateProfile } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [stats, setStats] = useState(null)
  const photoInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: user?.name || '', phone: user?.phone || '', department: user?.department || '',
    year_of_study: user?.year_of_study || '', section: user?.section || ''
  })
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    api.get('/auth/me').then(r => {
      if (r.data.user) setStats({ unreadNotifications: r.data.unreadNotifications || 0, memberSince: r.data.user.created_at })
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateProfile(formData)
      if (result.success) { toast.success('Profile updated!'); setEditing(false) }
      else toast.error('Failed to update')
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Passwords do not match')
    if (passwordData.newPassword.length < 6) return toast.error('Min 6 characters')
    setSaving(true)
    try {
      await api.put('/auth/change-password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword })
      toast.success('Password changed!'); setChangingPassword(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Select an image')
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB')
    setUploadingPhoto(true)
    try {
      const fd = new FormData(); fd.append('profile', file)
      const res = await api.post('/auth/profile-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      useAuthStore.setState({ user: res.data.user })
      toast.success('Photo updated!')
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed') }
    finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = '' }
  }

  // Field config for the info grid
  const infoFields = [
    { label: 'Full Name', icon: UserCircleIcon, value: user?.name, key: 'name', editable: true, type: 'text' },
    { label: 'Email', icon: EnvelopeIcon, value: user?.email, editable: false },
    { label: 'Phone', icon: PhoneIcon, value: user?.phone || 'Not set', key: 'phone', editable: true, type: 'tel' },
    { label: 'Department', icon: BuildingOfficeIcon, value: user?.department || 'Not set', key: 'department', editable: true, type: 'text' },
    ...(user?.role === 'student' ? [
      { label: 'Year of Study', icon: AcademicCapIcon, value: user?.year_of_study ? `${user.year_of_study} Year` : 'Not set', key: 'year_of_study', editable: true, type: 'select', options: [{ v: '', l: 'Select' }, { v: '1', l: '1st Year' }, { v: '2', l: '2nd Year' }, { v: '3', l: '3rd Year' }, { v: '4', l: '4th Year' }] },
      { label: 'Section', value: user?.section || 'Not set', key: 'section', editable: true, type: 'text' },
    ] : []),
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Profile Hero ── */}
      <motion.div {...fadeUp()} className="card overflow-hidden">
        {/* Banner */}
        <div className={`bg-gradient-to-r ${roleGradient[user?.role]} h-32 relative`}>
          {/* Dot pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }} />
          {/* Avatar */}
          <div className="absolute -bottom-12 left-8">
            <div className="relative w-24 h-24">
              {user?.profile_image ? (
                <img src={user.profile_image} alt={user.name}
                  className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-[var(--bg-void)]" />
              ) : (
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold bg-[var(--bg-surface)] border-2 border-[var(--bg-void)] shadow-lg">
                  <span className={`bg-gradient-to-r ${roleGradient[user?.role]} bg-clip-text text-transparent`}>
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                className="absolute inset-0 w-24 h-24 rounded-2xl bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" title="Change photo">
                {uploadingPhoto ? <div className="w-5 h-5 border-2 border-white/70 border-t-white rounded-full animate-spin" /> : <CameraIcon className="w-7 h-7 text-white" />}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>
        </div>

        {/* Name row */}
        <div className="pt-16 pb-6 px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white/90 font-display">{user?.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className={`badge bg-gradient-to-r ${roleGradient[user?.role]} text-white !border-0 shadow-lg`}>
                  {roleLabel[user?.role]}
                </span>
                <span className="text-xs font-mono text-white/25">ID: {user?.employee_id}</span>
              </div>
            </div>
            <button onClick={() => setEditing(!editing)} className={`btn ${editing ? 'btn-outline' : 'btn-primary'}`}>
              <PencilSquareIcon className="w-4 h-4" /> {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main Info ── */}
        <motion.div {...fadeUp(0.1)} className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-bold text-white/80 mb-6 font-display">Personal Information</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {infoFields.map(f => (
              <div key={f.label}>
                <label className="label flex items-center gap-1.5">{f.icon && <f.icon className="w-4 h-4" />} {f.label}</label>
                {editing && f.editable ? (
                  f.type === 'select' ? (
                    <select value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className="input mt-1">
                      {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className="input mt-1" />
                  )
                ) : (
                  <p className="mt-1 font-medium text-white/70">{f.value}</p>
                )}
              </div>
            ))}
          </div>
          {editing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary"><CheckIcon className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setEditing(false)} className="btn btn-outline">Cancel</button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Sidebar ── */}
        <motion.div {...fadeUp(0.2)} className="space-y-6">

          {/* Account Card */}
          <div className="card p-6">
            <h3 className="font-bold text-white/80 mb-4 font-display">Account</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-accent-green" />
                <div>
                  <p className="text-sm font-medium text-white/70">Account Active</p>
                  <p className="text-xs text-white/25">Verified</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-accent-cyan" />
                <div>
                  <p className="text-sm font-medium text-white/70">Member Since</p>
                  <p className="text-xs text-white/25">
                    {stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="card p-6">
            <h3 className="font-bold text-white/80 mb-4 font-display">Security</h3>
            {changingPassword ? (
              <div className="space-y-3">
                <input type="password" placeholder="Current Password" value={passwordData.currentPassword}
                  onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className="input text-sm" />
                <input type="password" placeholder="New Password" value={passwordData.newPassword}
                  onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="input text-sm" />
                <input type="password" placeholder="Confirm Password" value={passwordData.confirmPassword}
                  onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="input text-sm" />
                <div className="flex gap-2">
                  <button onClick={handleChangePassword} disabled={saving} className="btn btn-primary flex-1 text-sm">{saving ? 'Saving...' : 'Update'}</button>
                  <button onClick={() => setChangingPassword(false)} className="btn btn-outline text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setChangingPassword(true)}
                className="w-full btn btn-secondary justify-start">
                <KeyIcon className="w-4 h-4" /> Change Password
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
