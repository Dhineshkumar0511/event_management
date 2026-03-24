import { useState, useEffect } from 'react'
import { featuresAPI } from '../services/api'
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

const toneMap = {
  low: {
    border: 'border-white/[0.06]',
    bg: 'bg-white/[0.02]',
    icon: 'text-white/50',
    chip: 'bg-white/[0.04] text-white/40 border-white/[0.06]',
  },
  normal: {
    border: 'border-accent-cyan/10',
    bg: 'bg-accent-cyan/[0.03]',
    icon: 'text-accent-cyan/70',
    chip: 'bg-accent-cyan/[0.06] text-accent-cyan/70 border-accent-cyan/10',
  },
  high: {
    border: 'border-accent-amber/12',
    bg: 'bg-accent-amber/[0.03]',
    icon: 'text-accent-amber/70',
    chip: 'bg-accent-amber/[0.06] text-accent-amber/70 border-accent-amber/12',
  },
  urgent: {
    border: 'border-danger-500/12',
    bg: 'bg-danger-500/[0.03]',
    icon: 'text-danger-400/70',
    chip: 'bg-danger-500/[0.06] text-danger-400/70 border-danger-500/12',
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
    try { return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]') } catch { return [] }
  })

  useEffect(() => { loadAnnouncements() }, [])

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
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map((a) => {
          const tone = toneMap[a.priority] || toneMap.normal
          const Icon = priorityIcons[a.priority] || InformationCircleIcon

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className={`rounded-xl border ${tone.border} ${tone.bg} px-4 py-3`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] ${tone.icon}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white/80">{a.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${tone.chip}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-white/40">{a.message}</p>
                  <p className="mt-1.5 text-[11px] text-white/20">By {a.author_name}</p>
                </div>
                <button
                  onClick={() => dismiss(a.id)}
                  className="shrink-0 rounded-lg p-1 text-white/20 transition-colors hover:bg-white/[0.04] hover:text-white/50"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
