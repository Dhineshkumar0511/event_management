import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { leaveAPI } from '../../services/api';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: ClockIcon },
  staff_approved: { label: 'Staff Approved', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircleIcon },
  staff_rejected: { label: 'Staff Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircleIcon },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircleIcon },
};

const TYPE_COLORS = {
  sick: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  casual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  emergency: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  medical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  family: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function MyLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cancelId, setCancelId] = useState(null);

  const [filters, setFilters] = useState({ status: '', leave_type: '' });
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.leave_type) params.leave_type = filters.leave_type;
      const res = await leaveAPI.getMyLeaves(params);
      setLeaves(res.data.data);
    } catch {
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const handleCancel = async (id) => {
    try {
      await leaveAPI.cancelRequest(id);
      toast.success('Leave request cancelled');
      setCancelId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => ['staff_rejected', 'rejected'].includes(l.status)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Leaves</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track all your leave applications</p>
        </div>
        <Link
          to="/student/leaves/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
        >
          <PlusIcon className="h-4 w-4" /> New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white', bg: 'bg-white dark:bg-gray-800' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300"
        >
          <FunnelIcon className="h-4 w-4" /> Filters {showFilters ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
        </button>
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="staff_approved">Staff Approved</option>
                    <option value="approved">Approved</option>
                    <option value="staff_rejected">Staff Rejected</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Leave Type</label>
                  <select
                    value={filters.leave_type}
                    onChange={e => setFilters(p => ({ ...p, leave_type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="sick">Sick</option>
                    <option value="casual">Casual</option>
                    <option value="emergency">Emergency</option>
                    <option value="medical">Medical</option>
                    <option value="family">Family</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leaves list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No leave requests found</p>
          <Link
            to="/student/leaves/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4" /> Submit a Leave
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave) => {
            const S = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
            const SIcon = S.icon;
            const isOpen = expanded === leave.id;

            return (
              <motion.div
                key={leave.id}
                layout
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : leave.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[leave.leave_type] || TYPE_COLORS.other}`}>
                          {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          leave.leave_mode === 'post_leave' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        }`}>
                          {leave.leave_mode === 'post_leave' ? 'Post-Leave' : 'Pre-Leave'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}
                        <span className="font-medium text-gray-700 dark:text-gray-300">({leave.days_count}d)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${S.color}`}>
                      <SIcon className="h-3 w-3" /> {S.label}
                    </span>
                    {isOpen ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 space-y-4 mt-0">
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reason</p>
                          <p className="text-sm text-gray-800 dark:text-gray-200">{leave.reason}</p>
                        </div>

                        {/* Approval timeline */}
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Approval Status</p>
                          <div className="space-y-2">
                            {/* Submitted */}
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Submitted</p>
                                <p className="text-xs text-gray-500">{fmtDate(leave.created_at)}</p>
                              </div>
                            </div>
                            {/* Staff */}
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                ['staff_approved','approved'].includes(leave.status) ? 'bg-blue-500' :
                                'staff_rejected' === leave.status ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`} />
                              <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  Staff Review
                                  {leave.staff_name && <span className="font-normal text-gray-500 ml-1">by {leave.staff_name}</span>}
                                </p>
                                {leave.staff_remarks && <p className="text-xs text-gray-500 italic">"{leave.staff_remarks}"</p>}
                                {leave.staff_reviewed_at && <p className="text-xs text-gray-400">{fmtDate(leave.staff_reviewed_at)}</p>}
                              </div>
                            </div>
                            {/* HOD */}
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                leave.status === 'approved' ? 'bg-green-500' :
                                leave.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`} />
                              <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">HOD Final Decision</p>
                                {leave.hod_remarks && <p className="text-xs text-gray-500 italic">"{leave.hod_remarks}"</p>}
                                {leave.hod_reviewed_at && <p className="text-xs text-gray-400">{fmtDate(leave.hod_reviewed_at)}</p>}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {/* View Letter button for approved/staff_approved */}
                          {['staff_approved', 'approved'].includes(leave.status) && (
                            <Link
                              to={`/student/leave-letter/${leave.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                              <DocumentTextIcon className="h-3.5 w-3.5" /> View Letter
                            </Link>
                          )}

                          {/* Cancel for pending */}
                          {leave.status === 'pending' && (
                            <div className="flex justify-end w-full">
                              {cancelId === leave.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Cancel this leave?</span>
                                  <button onClick={() => handleCancel(leave.id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg font-medium hover:bg-red-700">Yes, cancel</button>
                                  <button onClick={() => setCancelId(null)} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg font-medium">Keep</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCancelId(leave.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" /> Cancel Request
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
