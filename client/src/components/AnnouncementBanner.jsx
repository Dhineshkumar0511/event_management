import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { featuresAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import {
  MegaphoneIcon, PlusIcon, TrashIcon, XMarkIcon,
  ExclamationTriangleIcon, InformationCircleIcon
} from '@heroicons/react/24/outline'

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const priorityIcons = {
  low: InformationCircleIcon,
  normal: InformationCircleIcon,
  high: ExclamationTriangleIcon,
  urgent: ExclamationTriangleIcon,
}

export default function AnnouncementBanner() {
  const { isDark: dark } = useTheme()
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]') } catch { return [] }
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const res = await featuresAPI.getAnnouncements()
      setAnnouncements(res.data.data || [])
    } catch {}
  }

  const dismiss = (id) => {
    const updated = [...dismissed, id]
    setDismissed(updated)
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated))
  }

  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {visible.map(a => {
        const Icon = priorityIcons[a.priority] || InformationCircleIcon
        return (
          <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
            a.priority === 'urgent' ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950' :
            a.priority === 'high' ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950' :
            'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
          }`}>
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              a.priority === 'urgent' ? 'text-red-500' :
              a.priority === 'high' ? 'text-orange-500' : 'text-blue-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm dark:text-white">{a.title}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${priorityColors[a.priority]}`}>{a.priority}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{a.message}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">— {a.author_name}</p>
            </div>
            <button onClick={() => dismiss(a.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
