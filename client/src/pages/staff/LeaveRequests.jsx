import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { leaveAPI } from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const TYPE_COLORS = {
  sick: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  casual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  emergency: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  medical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  family: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function ReviewModal({ leave, onClose, onDone }) {
  const [action, setAction] = useState('approve');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await leaveAPI.staffReview(leave.id, { action, remarks });
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Review Leave Request</h2>

        {/* Leave summary */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm space-y-1">
          <p className="font-semibold text-gray-900 dark:text-white">{leave.student_name}</p>
          <p className="text-gray-500 dark:text-gray-400">{leave.roll_number} · {leave.department} · Yr {leave.year_of_study}</p>
          <p className="text-gray-600 dark:text-gray-300 capitalize">{leave.leave_type} Leave · {leave.days_count} day(s)</p>
          <p className="text-gray-500 dark:text-gray-400">{fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}</p>
          <p className="text-gray-600 dark:text-gray-300 pt-1 italic">"{leave.reason}"</p>
        </div>

        {/* Action picker */}
        <div className="grid grid-cols-2 gap-3">
          {['approve', 'reject'].map(a => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
                action === a
                  ? a === 'approve'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500'
              }`}
            >
              {a === 'approve' ? <><CheckCircleIcon className="inline h-4 w-4 mr-1" />Approve</> : <><XCircleIcon className="inline h-4 w-4 mr-1" />Reject</>}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks (optional)</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder={action === 'reject' ? 'Reason for rejection...' : 'Any additional notes...'}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
              action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-60`}
          >
            {loading ? 'Saving...' : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function StaffLeaveRequests() {
  const [tab, setTab] = useState('pending');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [reviewLeave, setReviewLeave] = useState(null);
  const [filters, setFilters] = useState({ status: '', leave_type: '' });

  const loadLeaves = async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'pending') {
        res = await leaveAPI.getStaffPending();
        setLeaves(res.data.data);
      } else {
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.leave_type) params.leave_type = filters.leave_type;
        res = await leaveAPI.getStaffAll(params);
        setLeaves(res.data.data);
      }
    } catch {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeaves(); }, [tab, filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Requests</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Review and approve student leave applications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
        {[{ id: 'pending', label: 'Pending Review' }, { id: 'all', label: 'All Requests' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t.label}
            {t.id === 'pending' && leaves.length > 0 && tab === 'pending' && (
              <span className="ml-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-1.5 py-0.5 rounded-full">{leaves.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* All tab filters */}
      {tab === 'all' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Filters</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="staff_approved">Staff Approved</option>
              <option value="staff_rejected">Staff Rejected</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filters.leave_type}
              onChange={e => setFilters(p => ({ ...p, leave_type: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
      )}

      {/* List */}
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
          <p className="text-gray-500 dark:text-gray-400">{tab === 'pending' ? 'No pending leave requests' : 'No leave requests found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => {
            const isOpen = expanded === leave.id;
            return (
              <motion.div key={leave.id} layout className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : leave.id)}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{leave.student_name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{leave.roll_number}</span>
                      {leave.leave_mode === 'post_leave' && (
                        <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded font-medium">POST-LEAVE</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${TYPE_COLORS[leave.leave_type]}`}>{leave.leave_type}</span>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)} ({leave.days_count}d)
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {leave.status === 'pending' && (
                      <button
                        onClick={e => { e.stopPropagation(); setReviewLeave(leave); }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Review
                      </button>
                    )}
                    {/* Letter link visible for all leaves */}
                    <Link
                      to={`/staff/leave-letter/${leave.id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                      <DocumentTextIcon className="h-3.5 w-3.5" /> Letter
                    </Link>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      leave.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      ['staff_approved','approved'].includes(leave.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>{leave.status.replace('_', ' ')}</span>
                    {isOpen ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 mt-0">
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Department</p>
                            <p className="text-gray-900 dark:text-white">{leave.department} · Yr {leave.year_of_study} · Sec {leave.section}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Contact During Leave</p>
                            <p className="text-gray-900 dark:text-white">{leave.contact_during_leave || '-'}</p>
                          </div>
                          {leave.parent_name && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Parent/Guardian</p>
                              <p className="text-gray-900 dark:text-white">{leave.parent_name} · {leave.parent_phone || '-'}</p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Reason</p>
                            <p className="text-gray-900 dark:text-white">{leave.reason}</p>
                          </div>
                          {leave.staff_remarks && (
                            <div className="col-span-2">
                              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Your Remarks</p>
                              <p className="text-gray-900 dark:text-white italic">"{leave.staff_remarks}"</p>
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

      {reviewLeave && (
        <ReviewModal
          leave={reviewLeave}
          onClose={() => setReviewLeave(null)}
          onDone={() => { setReviewLeave(null); loadLeaves(); }}
        />
      )}
    </div>
  );
}
