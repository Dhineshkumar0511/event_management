import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../context/ThemeContext'
import { initSocket, disconnectSocket, subscribeToNotifications, unsubscribe } from '../services/socket'
import AIChatWidget from '../components/AIChatWidget'
import AnnouncementBanner from '../components/AnnouncementBanner'
import { studentAPI } from '../services/api'
import {
  HomeIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  UsersIcon,
  MapPinIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
  Cog6ToothIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  StarIcon,
  FolderIcon,
  BoltIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'

const getNavItems = (role) => {
  const items = {
    student: [
      { name: 'Dashboard', path: '/student/dashboard', icon: HomeIcon },
      { name: 'New Request', path: '/student/new-request', icon: DocumentPlusIcon },
      { name: 'My Requests', path: '/student/my-requests', icon: DocumentTextIcon },
      { name: 'My Leaves', path: '/student/leaves', icon: ClipboardDocumentListIcon },
      { name: 'Event Calendar', path: '/student/calendar', icon: CalendarDaysIcon },
      { name: 'Active Event', path: '/student/active-event', icon: MapPinIcon },
      { name: 'Submit Result', path: '/student/submit-result', icon: StarIcon },
      { name: 'Certificates', path: '/student/certificates', icon: FolderIcon },
      { name: 'Leaderboard', path: '/student/leaderboard', icon: ChartPieIcon },
      { name: 'Hall of Fame', path: '/student/hall-of-fame', icon: StarIcon },
      { name: 'My Profile', path: '/student/profile', icon: Cog6ToothIcon },
    ],
    staff: [
      { name: 'Dashboard', path: '/staff/dashboard', icon: HomeIcon },
      { name: 'Pending Requests', path: '/staff/requests', icon: ClockIcon },
      { name: 'Leave Requests', path: '/staff/leaves', icon: ClipboardDocumentListIcon },
      { name: 'WA Report', path: '/staff/whatsapp-report', icon: ChatBubbleLeftRightIcon },
      { name: 'Review History', path: '/staff/history', icon: CheckCircleIcon },
      { name: 'Event Calendar', path: '/staff/calendar', icon: CalendarDaysIcon },
      { name: 'Event Results', path: '/staff/results', icon: StarIcon },
      { name: 'Certificates', path: '/staff/certificates', icon: FolderIcon },
      { name: 'Leaderboard', path: '/staff/leaderboard', icon: ChartPieIcon },
      { name: 'Hall of Fame', path: '/staff/hall-of-fame', icon: StarIcon },
      { name: 'My Profile', path: '/staff/profile', icon: Cog6ToothIcon },
    ],
    hod: [
      { name: 'Dashboard', path: '/hod/dashboard', icon: HomeIcon },
      { name: 'Pending Approvals', path: '/hod/requests', icon: ClockIcon },
      { name: 'Leave Management', path: '/hod/leaves', icon: ClipboardDocumentListIcon },
      { name: 'WA Report', path: '/hod/whatsapp-report', icon: ChatBubbleLeftRightIcon },
      { name: 'All Requests', path: '/hod/all-requests', icon: DocumentTextIcon },
      { name: 'Announcements', path: '/hod/announcements', icon: MegaphoneIcon },
      { name: 'Event Calendar', path: '/hod/calendar', icon: CalendarDaysIcon },
      { name: 'Reports', path: '/hod/reports', icon: ChartPieIcon },
      { name: 'Audit Trail', path: '/hod/audit-trail', icon: ClipboardDocumentListIcon },
      { name: 'Live Tracking', path: '/hod/tracking', icon: MapPinIcon },
      { name: 'Manage Users', path: '/hod/users', icon: UsersIcon },
      { name: 'Auto Rules', path: '/hod/auto-rules', icon: BoltIcon },
      { name: 'Staff Workload', path: '/hod/staff-workload', icon: UsersIcon },
      { name: 'Certificates', path: '/hod/certificates', icon: FolderIcon },
      { name: 'Event Results', path: '/hod/results', icon: StarIcon },
      { name: 'Leaderboard', path: '/hod/leaderboard', icon: ChartPieIcon },
      { name: 'Hall of Fame', path: '/hod/hall-of-fame', icon: StarIcon },
      { name: 'My Profile', path: '/hod/profile', icon: Cog6ToothIcon },
    ]
  }
  return items[role] || []
}

const roleLabels = {
  student: 'Student Intelligence Portal',
  staff: 'Faculty Review Console',
  hod: 'Department Command Center'
}

const roleAccent = {
  student: 'from-cyan-400 via-sky-400 to-emerald-300',
  staff: 'from-emerald-300 via-teal-400 to-cyan-400',
  hod: 'from-lime-300 via-cyan-300 to-teal-400',
}

const roleChip = {
  student: 'Student',
  staff: 'Staff',
  hod: 'HOD',
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, token, logout } = useAuthStore()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const navItems = getNavItems(user?.role)

  useEffect(() => {
    if (token) {
      initSocket(token)
      subscribeToNotifications((notif) => {
        setNotifications(prev => [notif, ...prev].slice(0, 20))
        setUnreadCount(prev => prev + 1)
      })
    }

    return () => {
      unsubscribe('notification')
      disconnectSocket()
    }
  }, [token])

  useEffect(() => {
    if (user?.role === 'student') {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.role])

  const fetchNotifications = async () => {
    try {
      const response = await studentAPI.getNotifications()
      const notifs = response.data.data || []
      setNotifications(notifs.slice(0, 10))
      setUnreadCount(notifs.filter(n => !n.is_read).length)
    } catch {
      // silently fail
    }
  }

  const markAllRead = async () => {
    try {
      await studentAPI.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silently fail
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const shellBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
  const surface = isDark ? 'bg-slate-900/95 border-white/10' : 'bg-white/90 border-slate-200'
  const sidebarSurface = isDark ? 'bg-slate-950/90 border-white/10' : 'bg-white/95 border-slate-200'
  const headerSurface = isDark ? 'bg-slate-950/75 border-white/10' : 'bg-white/75 border-slate-200/70'

  return (
    <div className={`min-h-screen ${shellBg}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_12%,_rgba(20,184,166,0.16),_transparent_20%),radial-gradient(circle_at_88%_10%,_rgba(34,211,238,0.12),_transparent_18%),linear-gradient(180deg,_#07111f_0%,_#091629_52%,_#08111d_100%)]" />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 border-r shadow-[0_24px_90px_rgba(2,8,23,0.45)] transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarSurface}
        `}
      >
        <div className="flex h-full flex-col">
          <div className={`relative overflow-hidden border-b p-6 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${roleAccent[user?.role] || roleAccent.student} opacity-14`} />
            <div className="absolute -right-8 top-0 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/15 bg-white/10 backdrop-blur-sm">
                  <CpuChipIcon className="h-7 w-7 text-cyan-200" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">AI and Data Science</p>
                  <h1 className={`section-title text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>EventOS AI</h1>
                  <p className="mt-1 text-xs text-slate-400">{roleLabels[user?.role]}</p>
                </div>
              </div>
              <button className="lg:hidden rounded-2xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => setSidebarOpen(false)}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-4">
            <div className="rounded-3xl border border-cyan-300/10 bg-slate-900/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Navigation Matrix</p>
              <p className="mt-2 text-sm text-slate-300">Move through approvals, analytics, and student engagement from one connected workspace.</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-r from-cyan-400/18 via-teal-400/16 to-lime-300/18 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.22)]'
                    : isDark
                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-cyan-200 transition-colors group-hover:bg-white/10">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className={`border-t p-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${roleAccent[user?.role] || roleAccent.student} text-slate-950 font-bold`}>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.name}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
                <span className="rounded-full border border-cyan-300/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  {roleChip[user?.role] || 'User'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/15"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className={`sticky top-0 z-30 border-b backdrop-blur-2xl ${headerSurface}`}>
          <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className={`rounded-2xl border p-2.5 lg:hidden ${surface}`}
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Department Workspace</p>
                <h2 className={`section-title text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Welcome back, {user?.name?.split(' ')?.[0] || 'User'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`rounded-2xl border p-3 transition-all ${surface}`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <SunIcon className="h-5 w-5 text-amber-300" /> : <MoonIcon className="h-5 w-5 text-slate-600" />}
              </button>

              <div className="relative">
                <button
                  className={`relative rounded-2xl border p-3 transition-all ${surface}`}
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <BellIcon className={`h-5 w-5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute right-0 mt-3 w-80 overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(2,8,23,0.45)] ${surface}`}
                    >
                      <div className={`flex items-center justify-between border-b px-4 py-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div>
                          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Notifications</h3>
                          <p className="text-xs text-slate-400">Realtime activity from your platform</p>
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`border-b px-4 py-3 last:border-b-0 ${isDark ? 'border-white/10 hover:bg-white/[0.03]' : 'border-slate-200 hover:bg-slate-50'} transition-colors`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notif.is_read ? 'bg-slate-600' : 'bg-cyan-400'}`} />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{notif.message}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {new Date(notif.created_at).toLocaleString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-10 text-center text-sm text-slate-400">
                            No notifications yet
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <AnnouncementBanner />
            <Outlet />
          </div>
        </main>
      </div>

      <AIChatWidget />
    </div>
  )
}
