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
  HomeIcon, DocumentPlusIcon, DocumentTextIcon, ClockIcon, CheckCircleIcon, UsersIcon, MapPinIcon,
  Bars3Icon, XMarkIcon, BellIcon, ArrowRightOnRectangleIcon, MoonIcon, SunIcon, Cog6ToothIcon,
  ChartPieIcon, CalendarDaysIcon, ClipboardDocumentListIcon, ChatBubbleLeftRightIcon, MegaphoneIcon,
  StarIcon, FolderIcon, BoltIcon, CpuChipIcon
} from '@heroicons/react/24/outline'

const getNavItems = (role) => ({
  student: [
    { name: 'Overview', path: '/student/dashboard', icon: HomeIcon },
    { name: 'New Request', path: '/student/new-request', icon: DocumentPlusIcon },
    { name: 'My Requests', path: '/student/my-requests', icon: DocumentTextIcon },
    { name: 'Leaves', path: '/student/leaves', icon: ClipboardDocumentListIcon },
    { name: 'Calendar', path: '/student/calendar', icon: CalendarDaysIcon },
    { name: 'Active Event', path: '/student/active-event', icon: MapPinIcon },
    { name: 'Results', path: '/student/submit-result', icon: StarIcon },
    { name: 'Certificates', path: '/student/certificates', icon: FolderIcon },
    { name: 'Leaderboard', path: '/student/leaderboard', icon: ChartPieIcon },
    { name: 'Hall of Fame', path: '/student/hall-of-fame', icon: StarIcon },
    { name: 'Profile', path: '/student/profile', icon: Cog6ToothIcon },
  ],
  staff: [
    { name: 'Overview', path: '/staff/dashboard', icon: HomeIcon },
    { name: 'Pending Requests', path: '/staff/requests', icon: ClockIcon },
    { name: 'Leave Requests', path: '/staff/leaves', icon: ClipboardDocumentListIcon },
    { name: 'WA Report', path: '/staff/whatsapp-report', icon: ChatBubbleLeftRightIcon },
    { name: 'Review History', path: '/staff/history', icon: CheckCircleIcon },
    { name: 'Calendar', path: '/staff/calendar', icon: CalendarDaysIcon },
    { name: 'Results', path: '/staff/results', icon: StarIcon },
    { name: 'Certificates', path: '/staff/certificates', icon: FolderIcon },
    { name: 'Leaderboard', path: '/staff/leaderboard', icon: ChartPieIcon },
    { name: 'Hall of Fame', path: '/staff/hall-of-fame', icon: StarIcon },
    { name: 'Profile', path: '/staff/profile', icon: Cog6ToothIcon },
  ],
  hod: [
    { name: 'Overview', path: '/hod/dashboard', icon: HomeIcon },
    { name: 'Approvals', path: '/hod/requests', icon: ClockIcon },
    { name: 'Leave Management', path: '/hod/leaves', icon: ClipboardDocumentListIcon },
    { name: 'WA Report', path: '/hod/whatsapp-report', icon: ChatBubbleLeftRightIcon },
    { name: 'All Requests', path: '/hod/all-requests', icon: DocumentTextIcon },
    { name: 'Announcements', path: '/hod/announcements', icon: MegaphoneIcon },
    { name: 'Calendar', path: '/hod/calendar', icon: CalendarDaysIcon },
    { name: 'Reports', path: '/hod/reports', icon: ChartPieIcon },
    { name: 'Audit Trail', path: '/hod/audit-trail', icon: ClipboardDocumentListIcon },
    { name: 'Live Tracking', path: '/hod/tracking', icon: MapPinIcon },
    { name: 'Users', path: '/hod/users', icon: UsersIcon },
    { name: 'Auto Rules', path: '/hod/auto-rules', icon: BoltIcon },
    { name: 'Workload', path: '/hod/staff-workload', icon: UsersIcon },
    { name: 'Certificates', path: '/hod/certificates', icon: FolderIcon },
    { name: 'Results', path: '/hod/results', icon: StarIcon },
    { name: 'Leaderboard', path: '/hod/leaderboard', icon: ChartPieIcon },
    { name: 'Hall of Fame', path: '/hod/hall-of-fame', icon: StarIcon },
    { name: 'Profile', path: '/hod/profile', icon: Cog6ToothIcon },
  ]
}[role] || [])

const roleLabels = {
  student: 'Student Neural Hub',
  staff: 'Faculty Review Hub',
  hod: 'Department Command Hub'
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
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await studentAPI.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#130a3d] text-white">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`fixed left-0 top-0 z-50 h-full w-[300px] border-r border-white/10 bg-[linear-gradient(180deg,_rgba(33,18,94,0.96)_0%,_rgba(20,10,61,0.98)_100%)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="signal-ring flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/8">
                  <CpuChipIcon className="h-7 w-7 text-cyan-300" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">AI & Data Science</p>
                  <h1 className="section-title text-2xl font-bold gradient-text">EventOS AI</h1>
                  <p className="mt-1 text-xs text-slate-500">{roleLabels[user?.role]}</p>
                </div>
              </div>
              <button className="rounded-2xl p-2 text-slate-500 hover:bg-white/8 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-4">
            <div className="neon-panel rounded-[24px] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">AI Layer</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">A futuristic workspace for approvals, event workflows, and departmental intelligence.</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-500/20 via-violet-500/18 to-cyan-400/18 text-white border border-fuchsia-300/20 shadow-[0_10px_30px_rgba(255,60,199,0.12)]'
                    : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="neon-panel rounded-[24px] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-300 text-white font-bold shadow-[0_0_24px_rgba(255,60,199,0.35)]">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.1]">
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[300px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#140b43]/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Bars3Icon className="h-6 w-6" />
              </button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Control Core</p>
                <h2 className="section-title text-2xl font-bold text-white">{roleLabels[user?.role]}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-slate-200 transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>

              <div className="relative">
                <button
                  className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-slate-200 transition-colors hover:bg-white/[0.1] hover:text-white"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300 px-1 text-[10px] font-bold text-[#140b43]">
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
                      className="absolute right-0 mt-3 w-80 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,_rgba(31,18,88,0.96)_0%,_rgba(18,11,62,0.98)_100%)] shadow-[0_24px_70px_rgba(10,7,32,0.45)]"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                        <div>
                          <h3 className="font-semibold text-white">Notifications</h3>
                          <p className="text-xs text-slate-500">Activity and request updates</p>
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs font-semibold text-cyan-300 hover:text-white">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notif) => (
                          <div key={notif.id} className="border-b border-white/10 px-4 py-3 last:border-b-0">
                            <p className="text-sm text-slate-200">{notif.message}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(notif.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )) : (
                          <div className="px-4 py-10 text-center text-sm text-slate-500">No notifications yet</div>
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
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6">
            <AnnouncementBanner />
            <Outlet />
          </motion.div>
        </main>
      </div>

      <AIChatWidget />
    </div>
  )
}
