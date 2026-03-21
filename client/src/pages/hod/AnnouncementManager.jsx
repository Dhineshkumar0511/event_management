import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { featuresAPI } from '../../services/api'
import {
  MegaphoneIcon, PlusIcon, TrashIcon, XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function AnnouncementManager() {
  const { isDark: dark } = useTheme()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal', target_role: 'all', target_department: '', expires_at: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await featuresAPI.getAnnouncements()
      setAnnouncements(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  const create = async () => {
    if (!form.title || !form.message) return
    setSubmitting(true)
    try {
      await featuresAPI.createAnnouncement({
        ...form,
        target_department: form.target_department || null,
        expires_at: form.expires_at || null
      })
      setShowForm(false)
      setForm({ title: '', message: '', priority: 'normal', target_role: 'all', target_department: '', expires_at: '' })
      load()
    } catch {} finally { setSubmitting(false) }
  }

  const remove = async (id) => {
    if (!confirm('Remove this announcement?')) return
    try { await featuresAPI.deleteAnnouncement(id); load() } catch {}
  }

  const priorityBadge = {
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    normal: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-10 h-10 rounded-xl flex items-center justify-center">
              <MegaphoneIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Announcements</h1>
              <p className="text-sm text-gray-500">Broadcast messages to students and staff</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium">
            <PlusIcon className="h-4 w-4" /> New
          </button>
        </div>

        {showForm && (
          <div className={`rounded-xl border p-5 mb-6 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>Create Announcement</h3>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title *"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Message *" rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })}
                  className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <option value="all">All Users</option>
                  <option value="student">Students Only</option>
                  <option value="staff">Staff Only</option>
                </select>
                <input value={form.target_department} onChange={e => setForm({ ...form, target_department: e.target.value })} placeholder="Department (optional)"
                  className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                <input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                  className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
              <div className="flex gap-2">
                <button onClick={create} disabled={submitting || !form.title || !form.message}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Publish'}
                </button>
                <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-3 border-purple-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : announcements.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <MegaphoneIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No active announcements</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className={`rounded-xl border p-4 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{a.title}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${priorityBadge[a.priority]}`}>{a.priority}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{a.target_role}</span>
                    </div>
                    <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-500 p-1"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
