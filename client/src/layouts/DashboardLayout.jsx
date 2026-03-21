import { useState, useEffect, useCallback } from 'react'
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
  UserCircleIcon,
  ChartBarIcon,
  TrophyIcon,
  MoonIcon,
  SunIcon,
  Cog6ToothIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  ShieldExclamationIcon,
  StarIcon,
  FolderIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

// Navigation items based on role
const getNavItems = (role) => {
  const items = {
    student: [
      { name: 'Dashboard', path: '/student/dashboard', icon: HomeIcon },
      { name: 'New Request', path: '/student/new-request', icon: DocumentPlusIcon },
      { name: 'My Requests', path: '/student/my-requests', icon: DocumentTextIcon },
      { name: 'My Leaves', path: '/student/leaves', icon: ClipboardDocumentListIcon },
      { name: 'Event Calendar', path: '/student/calendar', icon: CalendarDaysIcon },
      { name: 'Active Event', path: '/student/active-event', icon: MapPinIcon },
      { name: 'Submit Result', path: '/student/submit-result', icon: TrophyIcon },
      { name: 'Certificates', path: '/student/certificates', icon: FolderIcon },
      { name: 'Leaderboard', path: '/student/leaderboard', icon: TrophyIcon },
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
      { name: 'Event Results', path: '/staff/results', icon: TrophyIcon },
      { name: 'Certificates', path: '/staff/certificates', icon: FolderIcon },
      { name: 'Leaderboard', path: '/staff/leaderboard', icon: TrophyIcon },
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
      { name: 'Event Results', path: '/hod/results', icon: TrophyIcon },
      { name: 'Leaderboard', path: '/hod/leaderboard', icon: TrophyIcon },
      { name: 'Hall of Fame', path: '/hod/hall-of-fame', icon: StarIcon },
      { name: 'My Profile', path: '/hod/profile', icon: Cog6ToothIcon },
    ]
  }
  return items[role] || []
}

const roleLabels = {
  student: 'Student Portal',
  staff: 'Staff Portal',
  hod: 'HOD Portal'
}

const roleColors = {
  student: 'from-blue-500 to-indigo-600',
  staff: 'from-emerald-500 to-teal-600',
  hod: 'from-purple-500 to-indigo-600'
}

const activeGradients = {
  student: 'from-violet-500 to-purple-600',
  staff:   'from-emerald-500 to-teal-600',
  hod:     'from-purple-500 to-violet-600',
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
      // Real-time notification listener
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

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 shadow-xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDark ? 'bg-gray-800' : 'bg-white'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`p-5 bg-gradient-to-br ${roleColors[user?.role]} relative overflow-hidden`}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-3 w-16 h-16 rounded-full bg-white/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white font-black text-lg">🎟️</span>
                </div>
                <div>
                  <h1 className="text-lg font-black text-white tracking-tight">EventPass</h1>
                  <p className="text-xs text-white/70 font-medium">{roleLabels[user?.role]}</p>
                </div>
              </div>
              <button 
                className="lg:hidden text-white/80 hover:text-white p-1"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 p-4 space-y-1 overflow-y-auto ${isDark ? 'bg-gray-800' : ''}`}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                    ? `bg-gradient-to-r ${activeGradients[user?.role] || activeGradients.student} text-white font-semibold shadow-md`
                    : isDark
                    ? 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User info */}
          <div className={`p-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200'} border-t`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[user?.role] || roleColors.student} flex items-center justify-center shadow-md flex-shrink-0`}>
                <span className="text-white font-bold text-sm">{user?.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                isDark 
                ? 'text-red-400 hover:bg-red-900/20' 
                : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className={`sticky top-0 z-30 backdrop-blur-lg border-b ${
          isDark
          ? 'bg-gray-800/80 border-gray-700'
          : 'bg-white/80 border-gray-100'
        }`}>
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-900'}`} />
              </button>
              <div className="hidden sm:block">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Welcome back,</p>
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                  ? 'hover:bg-gray-700 text-yellow-400' 
                  : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  className={`p-2 rounded-lg relative ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <BellIcon className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
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
                      className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg border overflow-hidden ${
                        isDark
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => {
                            const catIcon = notif.category === 'checkin_reminder' ? '📍'
                              : notif.category === 'result_deadline' ? '⏰'
                              : notif.category === 'approval' ? '✅'
                              : notif.category === 'rejection' ? '❌'
                              : '🔔'
                            const priorityClass = notif.priority === 'urgent'
                              ? isDark ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-red-400'
                              : notif.priority === 'high'
                              ? isDark ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-amber-400'
                              : ''
                            return (
                              <div
                                key={notif.id}
                                className={`p-3 border-b last:border-b-0 transition-colors ${priorityClass} ${
                                  !notif.is_read
                                    ? isDark ? 'bg-gray-750 border-gray-700' : 'bg-blue-50/50 border-gray-100'
                                    : isDark ? 'border-gray-700' : 'border-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-sm mt-0.5 flex-shrink-0">{catIcon}</span>
                                  {!notif.is_read && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                      {notif.message}
                                    </p>
                                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {new Date(notif.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <BellIcon className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                            <p>No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User menu */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[user?.role] || roleColors.student} flex items-center justify-center shadow-sm`}>
                  <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`p-4 lg:p-6 ${isDark ? 'bg-gray-900' : ''}`}>
          <AnnouncementBanner />
          <Outlet />
        </main>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  )
}
