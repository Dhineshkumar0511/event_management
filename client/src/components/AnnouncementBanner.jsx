import { useState, useEffect } from 'react'
import { featuresAPI } from '../services/api'
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

const toneMap = {
  low: {
    shell: 'border-white/10 bg-white/[0.03]',
    icon: 'text-slate-300',
    chip: 'bg-white/[0.06] text-slate-300',
  },
  normal: {
    shell: 'border-cyan-300/14 bg-cyan-300/[0.06]',
    icon: 'text-cyan-200',
    chip: 'bg-cyan-300/10 text-cyan-200',
  },
  high: {
    shell: 'border-amber-300/16 bg-amber-300/[0.08]',
    icon: 'text-amber-200',
    chip: 'bg-amber-300/10 text-amber-200',
  },
  urgent: {
    shell: 'border-rose-300/16 bg-rose-300/[0.08]',
    icon: 'text-rose-200',
    chip: 'bg-rose-300/10 text-rose-200',
  },
}

const priorityIcons = {
  low: InformationCircleIcon,
  normal: InformationCircleIcon,
  high: ExclamationTriangleIcon,
  urgent: ExclamationTriangleIcon,
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]')
    } catch {
      return []
    }
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

  const visible = announcements.filter((a) => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      {visible.map((a) => {
        const tone = toneMap[a.priority] || toneMap.normal
        const Icon = priorityIcons[a.priority] || InformationCircleIcon

        return (
          <div key={a.id} className={`rounded-[24px] border px-4 py-4 ${tone.shell}`}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05]">
                <Icon className={`h-5 w-5 ${tone.icon}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{a.title}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.chip}`}>
                    {a.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-300">{a.message}</p>
                <p className="mt-2 text-xs text-slate-500">By {a.author_name}</p>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                className="rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
