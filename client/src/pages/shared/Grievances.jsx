import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { featuresAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import {
  ShieldExclamationIcon, PlusIcon, ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon, EyeIcon
} from '@heroicons/react/24/outline'

const statusConfig = {
  open: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', icon: ClockIcon },
  under_review: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: EyeIcon },
  resolved: { color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: CheckCircleIcon },
  dismissed: { color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: XCircleIcon },
}

export default function Grievances() {
  const { isDark: dark } = useTheme()
  const { user } = useAuthStore()
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ entity_type: 'od_request', entity_id: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [resolveModal, setResolveModal] = useState(null)
  const [resolveForm, setResolveForm] = useState({ status: 'resolved', resolution_notes: '' })
  const [filter, setFilter] = useState('')

  useEffect(() => { loadGrievances() }, [filter])

  const loadGrievances = async () => {
    setLoading(true)
    try {
      const res = await featuresAPI.getGrievances({ status: filter || undefined })
      setGrievances(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  const submitGrievance = async () => {
    if (!form.entity_id || form.reason.length < 20) return
    setSubmitting(true)
    try {
      const res = await featuresAPI.fileGrievance({
        entity_type: form.entity_type,
        entity_id: parseInt(form.entity_id),
        reason: form.reason,
      })
      if (res.data.success) {
        setShowForm(false)
        setForm({ entity_type: 'od_request', entity_id: '', reason: '' })
        loadGrievances()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit appeal')
    } finally { setSubmitting(false) }
  }

  const resolveGrievance = async () => {
    if (!resolveForm.resolution_notes.trim()) return
    try {
      await featuresAPI.resolveGrievance(resolveModal.id, resolveForm)
      setResolveModal(null)
      setResolveForm({ status: 'resolved', resolution_notes: '' })
      loadGrievances()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve')
    }
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-10 h-10 rounded-xl flex items-center justify-center">
              <ShieldExclamationIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Appeals & Grievances</h1>
              <p className="text-sm text-gray-500">Appeal rejected requests for re-review</p>
            </div>
          </div>
          {user?.role === 'student' && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition">
              <PlusIcon className="h-4 w-4" /> File Appeal
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['', 'open', 'under_review', 'resolved', 'dismissed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === s
                  ? 'bg-orange-500 text-white'
                  : dark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Appeal Form */}
        {showForm && (
          <div className={`rounded-xl border p-5 mb-6 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>Submit an Appeal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Request Type</label>
                <select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <option value="od_request">OD Request</option>
                  <option value="leave_request">Leave Request</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Request ID (number)</label>
                <input type="number" value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })}
                  placeholder="Enter the request ID"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-500 mb-1">Reason for Appeal (min 20 chars)</label>
              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                rows={4} placeholder="Explain why you believe this decision should be reconsidered..."
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <p className="text-xs text-gray-400 mt-1">{form.reason.length}/20 characters minimum</p>
            </div>
            <div className="flex gap-2">
              <button onClick={submitGrievance} disabled={submitting || form.reason.length < 20 || !form.entity_id}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
              <button onClick={() => setShowForm(false)}
                className={`px-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Grievance List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : grievances.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <ShieldExclamationIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No appeals found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grievances.map(g => {
              const cfg = statusConfig[g.status]
              const StatusIcon = cfg?.icon || ClockIcon
              return (
                <div key={g.id} className={`rounded-xl border p-4 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{g.grievance_id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${cfg?.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {g.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{g.entity_type.replace('_', ' ')} #{g.entity_id} — {g.student_name} ({g.student_roll})</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(g.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-sm mb-2 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{g.reason}</p>
                  {g.resolution_notes && (
                    <div className={`p-2 rounded-lg text-sm ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className="font-medium text-gray-500">Resolution: </span>
                      <span className={dark ? 'text-gray-300' : 'text-gray-700'}>{g.resolution_notes}</span>
                      {g.resolver_name && <span className="text-xs text-gray-400 ml-2">— {g.resolver_name}</span>}
                    </div>
                  )}
                  {user?.role === 'hod' && ['open', 'under_review'].includes(g.status) && (
                    <button onClick={() => { setResolveModal(g); setResolveForm({ status: 'resolved', resolution_notes: '' }) }}
                      className="mt-2 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600">
                      Resolve
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Resolve Modal */}
        {resolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full max-w-md rounded-xl p-6 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`font-bold text-lg mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>Resolve Appeal</h3>
              <p className="text-sm text-gray-500 mb-4">{resolveModal.grievance_id} — {resolveModal.student_name}</p>
              <div className="flex gap-2 mb-4">
                {['resolved', 'dismissed'].map(s => (
                  <button key={s} onClick={() => setResolveForm({ ...resolveForm, status: s })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      resolveForm.status === s
                        ? s === 'resolved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        : dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {s === 'resolved' ? '✓ Accept & Reopen' : '✗ Dismiss'}
                  </button>
                ))}
              </div>
              <textarea value={resolveForm.resolution_notes} onChange={e => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                placeholder="Resolution notes..." rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm mb-4 ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setResolveModal(null)} className={`px-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
                <button onClick={resolveGrievance} disabled={!resolveForm.resolution_notes.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50">Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
