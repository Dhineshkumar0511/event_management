import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
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
  StarIcon, FolderIcon, BoltIcon
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
    { name: 'Leave Mgmt', path: '/hod/leaves', icon: ClipboardDocumentListIcon },
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
  staff: 'Faculty Command Hub',
  hod: 'HOD Command Center'
}

const roleGradients = {
  student: 'from-accent-cyan to-accent-purple',
  staff: 'from-accent-purple to-accent-magenta',
  hod: 'from-accent-green to-accent-cyan'
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, token, logout } = useAuthStore()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
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

  // Get current page name
  const currentPage = navItems.find(item => location.pathname === item.path)?.name || 'Dashboard'

  return (
    <div className="min-h-screen bg-[#05060f] text-white relative overflow-hidden">
      {/* ── Ultra-Premium Neural Background System ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Perspective Grid (Moving Floor) */}
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] opacity-20"
             style={{
               perspective: '800px',
               perspectiveOrigin: '50% 0%',
             }}>
          <div className="absolute inset-0"
               style={{
                 backgroundImage: `
                   linear-gradient(to right, rgba(0, 229, 255, 0.2) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(0, 229, 255, 0.2) 1px, transparent 1px)
                 `,
                 backgroundSize: '60px 60px',
                 transform: 'rotateX(60deg) translateY(-20%)',
                 transformOrigin: 'top center',
                 maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 80%, transparent)',
               }}>
            <motion.div 
              animate={{ backgroundPosition: ['0px 0px', '0px 60px'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0"
            />
          </div>
        </div>

        {/* Ambient Neural auras */}
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[70%] bg-cyan-500/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[70%] bg-purple-600/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Floating AI Particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5
            }}
            animate={{ 
              y: [null, '-20%', '120%'],
              opacity: [0, 0.8, 0]
            }}
            transition={{ 
              duration: 15 + Math.random() * 20, 
              repeat: Infinity, 
              delay: Math.random() * 10,
              ease: 'linear' 
            }}
          />
        ))}
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className={`fixed left-0 top-0 z-50 h-full w-[280px] transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar background - High Glassmorphism */}
        <div className="absolute inset-0 bg-[#0a0b1e]/80 backdrop-blur-2xl border-r border-white/10 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)]" />

        {/* Neural Scanning vertical line */}
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent" />
        
        <div className="relative h-full flex flex-col">
          {/* Logo area */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 flex items-center justify-center">
                  <span className="text-lg">🧠</span>
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-green border-2 border-[#0a0c1a] animate-glow-pulse" />
                </div>
                <div>
                  <h1 className="font-display text-base font-bold gradient-text leading-tight">EventOS</h1>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mt-0.5">{roleLabels[user?.role]?.split(' ')[0]}</p>
                </div>
              </div>
              <button
                className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.04] hover:text-white/60 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-cyan/[0.08] text-accent-cyan border border-accent-cyan/10'
                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white/70 border border-transparent'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      isActive
                        ? 'bg-accent-cyan/15 text-accent-cyan'
                        : 'bg-white/[0.03] text-white/30 group-hover:text-white/50'
                    }`}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-[13px] font-medium">{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-cyan"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User card at bottom */}
          <div className="p-3 border-t border-white/[0.04]">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleGradients[user?.role] || 'from-accent-cyan to-accent-purple'} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white/80">{user?.name}</p>
                  <p className="truncate text-[11px] text-white/25">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs font-medium text-white/40 transition-all hover:border-danger-500/20 hover:bg-danger-500/[0.04] hover:text-danger-400"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="lg:pl-[280px]">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/[0.04] bg-[#05060b]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 text-white/40 hover:text-white/70 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20">{roleLabels[user?.role]}</p>
                <h2 className="font-display text-lg font-bold text-white/90">{currentPage}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Real-time clock */}
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-glow-pulse" />
                <span className="font-mono text-xs text-white/30">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-white/40 transition-all hover:text-white/70"
              >
                {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  className="relative rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-white/40 transition-all hover:text-white/70"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <BellIcon className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-accent-cyan to-accent-purple px-1 text-[9px] font-bold text-neural-void"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 mt-2 w-80 rounded-xl border border-white/[0.06] bg-neural-surface/98 shadow-neural-lg backdrop-blur-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-3">
                        <div>
                          <h3 className="text-sm font-semibold text-white/80">Notifications</h3>
                          <p className="text-[11px] text-white/25">Activity updates</p>
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-[11px] font-semibold text-accent-cyan/70 hover:text-accent-cyan">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notif) => (
                          <div key={notif.id} className="border-b border-white/[0.03] px-4 py-3 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                            <p className="text-sm text-white/60">{notif.message}</p>
                            <p className="mt-1 text-[11px] text-white/20">
                              {new Date(notif.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )) : (
                          <div className="px-4 py-10 text-center text-sm text-white/25">No notifications yet</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page content with animation */}
        <main className="p-4 lg:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-7xl space-y-5"
          >
            <AnnouncementBanner />
            <Outlet />
          </motion.div>
        </main>
      </div>

      <AIChatWidget />
    </div>
  )
}
