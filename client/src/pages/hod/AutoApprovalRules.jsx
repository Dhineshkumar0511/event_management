import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { featuresAPI } from '../../services/api'
import {
  CogIcon, PlusIcon, TrashIcon, BoltIcon
} from '@heroicons/react/24/outline'

export default function AutoApprovalRules() {
  const { isDark: dark } = useTheme()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', rule_type: 'both',
    conditions: { max_days: 2, event_types: [], min_approval_rate: 80 }
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await featuresAPI.getAutoRules()
      setRules(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  const create = async () => {
    if (!form.name) return
    setSubmitting(true)
    try {
      await featuresAPI.createAutoRule(form)
      setShowForm(false)
      setForm({ name: '', description: '', rule_type: 'both', conditions: { max_days: 2, event_types: [], min_approval_rate: 80 } })
      load()
    } catch {} finally { setSubmitting(false) }
  }

  const toggle = async (id) => {
    try { await featuresAPI.toggleAutoRule(id); load() } catch {}
  }

  const remove = async (id) => {
    if (!confirm('Delete this rule?')) return
    try { await featuresAPI.deleteAutoRule(id); load() } catch {}
  }

  const eventTypes = ['hackathon', 'symposium', 'sports', 'workshop', 'conference', 'cultural']

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-10 h-10 rounded-xl flex items-center justify-center">
              <BoltIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Auto-Approval Rules</h1>
              <p className="text-sm text-gray-500">Define rules for automatic request approval</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium">
            <PlusIcon className="h-4 w-4" /> New Rule
          </button>
        </div>

        {/* Info Banner */}
        <div className={`rounded-xl border p-4 mb-6 ${dark ? 'bg-blue-950 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Auto-approval rules will be checked when new requests match the defined conditions. Staff still reviews — only their approval is auto-forwarded to HOD.
          </p>
        </div>

        {showForm && (
          <div className={`rounded-xl border p-5 mb-6 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>Create Rule</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rule Name *"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <select value={form.rule_type} onChange={e => setForm({ ...form, rule_type: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                <option value="od">OD Requests Only</option>
                <option value="leave">Leave Requests Only</option>
                <option value="both">Both</option>
              </select>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Conditions</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Max OD Days</label>
                    <input type="number" value={form.conditions.max_days} onChange={e => setForm({ ...form, conditions: { ...form.conditions, max_days: parseInt(e.target.value) } })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Min Approval Rate (%)</label>
                    <input type="number" value={form.conditions.min_approval_rate} onChange={e => setForm({ ...form, conditions: { ...form.conditions, min_approval_rate: parseInt(e.target.value) } })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-400 block mb-1">Event Types (leave empty for all)</label>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map(t => (
                      <button key={t} onClick={() => {
                        const arr = form.conditions.event_types || []
                        setForm({
                          ...form,
                          conditions: {
                            ...form.conditions,
                            event_types: arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t]
                          }
                        })
                      }}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          (form.conditions.event_types || []).includes(t)
                            ? 'bg-cyan-500 text-white'
                            : dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={create} disabled={submitting || !form.name}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Rule'}
                </button>
                <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : rules.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <BoltIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No auto-approval rules configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(r => (
              <div key={r.id} className={`rounded-xl border p-4 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{r.name}</span>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{r.rule_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(r.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${r.is_active ? 'bg-green-500' : 'bg-gray-400'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${r.is_active ? 'left-5.5' : 'left-0.5'}`} style={{ left: r.is_active ? '22px' : '2px' }} />
                    </button>
                    <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </div>
                {r.description && <p className="text-sm text-gray-500 mb-2">{r.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {r.conditions?.max_days && (
                    <span className={`text-xs px-2 py-0.5 rounded ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      Max {r.conditions.max_days} days
                    </span>
                  )}
                  {r.conditions?.min_approval_rate && (
                    <span className={`text-xs px-2 py-0.5 rounded ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      Min {r.conditions.min_approval_rate}% approval rate
                    </span>
                  )}
                  {(r.conditions?.event_types || []).map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">{t}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Created by {r.created_by_name} on {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
