import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { featuresAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import {
  DocumentCheckIcon, MagnifyingGlassIcon, ArrowUpTrayIcon,
  CheckBadgeIcon, FunnelIcon
} from '@heroicons/react/24/outline'

export default function CertificateRepository() {
  const { isDark: dark } = useTheme()
  const { user } = useAuthStore()
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: '', event_name: '', event_date: '', certificate_type: 'participation' })
  const [uploadFile, setUploadFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [verifiedFilter, setVerifiedFilter] = useState('')

  useEffect(() => { loadCerts() }, [search, verifiedFilter])

  const loadCerts = async () => {
    setLoading(true)
    try {
      const res = await featuresAPI.getCertificates({
        search: search || undefined,
        verified: verifiedFilter || undefined,
      })
      setCertificates(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  const handleUpload = async () => {
    if (!uploadForm.title) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (uploadFile) formData.append('documents', uploadFile)
      Object.entries(uploadForm).forEach(([k, v]) => { if (v) formData.append(k, v) })

      await featuresAPI.uploadCertificate(formData)
      setShowUpload(false)
      setUploadForm({ title: '', event_name: '', event_date: '', certificate_type: 'participation' })
      setUploadFile(null)
      loadCerts()
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed')
    } finally { setSubmitting(false) }
  }

  const verifyCert = async (id) => {
    try {
      await featuresAPI.verifyCertificate(id)
      loadCerts()
    } catch {}
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 w-10 h-10 rounded-xl flex items-center justify-center">
              <DocumentCheckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Certificate Repository</h1>
              <p className="text-sm text-gray-500">Central store for all event certificates</p>
            </div>
          </div>
          {user?.role === 'student' && (
            <button onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg text-sm font-medium">
              <ArrowUpTrayIcon className="h-4 w-4" /> Upload
            </button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search certificates..."
              className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`} />
          </div>
          <select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
            <option value="">All</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className={`rounded-xl border p-5 mb-6 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-semibold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>Upload Certificate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Certificate Title *" className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <input value={uploadForm.event_name} onChange={e => setUploadForm({ ...uploadForm, event_name: e.target.value })}
                placeholder="Event Name" className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <input type="date" value={uploadForm.event_date} onChange={e => setUploadForm({ ...uploadForm, event_date: e.target.value })}
                className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              <select value={uploadForm.certificate_type} onChange={e => setUploadForm({ ...uploadForm, certificate_type: e.target.value })}
                className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                <option value="participation">Participation</option>
                <option value="winner">Winner</option>
                <option value="runner_up">Runner Up</option>
                <option value="merit">Merit</option>
                <option value="other">Other</option>
              </select>
            </div>
            {/* Drag & Drop Zone */}
            <div className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition ${
              dark ? 'border-gray-600 hover:border-indigo-500' : 'border-gray-300 hover:border-indigo-400'
            }`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setUploadFile(e.dataTransfer.files[0]) }}>
              <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                {uploadFile ? uploadFile.name : 'Drag & drop certificate file or click to browse'}
              </p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setUploadFile(e.target.files[0])}
                className="hidden" id="cert-file" />
              <label htmlFor="cert-file" className="mt-2 inline-block px-3 py-1 bg-indigo-500 text-white rounded text-xs cursor-pointer hover:bg-indigo-600">
                Browse Files
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpload} disabled={submitting || !uploadForm.title}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submitting ? 'Uploading...' : 'Upload'}
              </button>
              <button onClick={() => setShowUpload(false)} className={`px-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
            </div>
          </div>
        )}

        {/* Certificate Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-3 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : certificates.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <DocumentCheckIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No certificates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map(c => (
              <div key={c.id} className={`rounded-xl border overflow-hidden ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{c.title}</h3>
                      <p className="text-xs text-gray-500">{c.event_name}</p>
                    </div>
                    {c.is_verified ? (
                      <CheckBadgeIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded dark:bg-yellow-900 dark:text-yellow-300">Unverified</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {c.certificate_type?.replace('_', ' ')}
                    </span>
                    {c.event_date && <span className="text-xs text-gray-400">{new Date(c.event_date).toLocaleDateString()}</span>}
                  </div>
                  <p className="text-xs text-gray-500">{c.student_name} • {c.student_roll}</p>
                  <div className="flex gap-2 mt-3">
                    <a href={c.certificate_url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600">View</a>
                    {['staff', 'hod'].includes(user?.role) && !c.is_verified && (
                      <button onClick={() => verifyCert(c.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">Verify</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
