import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { leaveAPI } from '../../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const TYPE_COLORS = {
  sick:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  casual:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  emergency: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  medical:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  family:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  other:     'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const STATUS_BADGE = {
  pending:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  staff_approved:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  staff_rejected:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  approved:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function HodReviewModal({ leave, onClose, onDone }) {
  const [action, setAction] = useState('approve');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await leaveAPI.hodReview(leave.id, { action, remarks });
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'} by HOD`);
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">HOD Final Decision</h2>

        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm space-y-1">
          <p className="font-semibold text-gray-900 dark:text-white">{leave.student_name}</p>
          <p className="text-gray-500 dark:text-gray-400">{leave.roll_number} · {leave.department}</p>
          <p className="text-gray-600 dark:text-gray-300 capitalize">{leave.leave_type} Leave · {leave.days_count} day(s)</p>
          <p className="text-gray-500 dark:text-gray-400">{fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}</p>
          {leave.staff_name && (
            <p className="text-xs text-blue-600 dark:text-blue-400 pt-1">✓ Staff approved by {leave.staff_name}</p>
          )}
          {leave.staff_remarks && <p className="text-xs text-gray-500 italic">Staff note: "{leave.staff_remarks}"</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {['approve', 'reject'].map(a => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
                action === a
                  ? a === 'approve' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
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
            placeholder={action === 'reject' ? 'Reason for rejection...' : 'HOD comments...'}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          <button
            onClick={submit}
            disabled={loading || (action === 'approve' && !leave.hod_signature)}
            title={action === 'approve' && !leave.hod_signature ? 'Sign the leave letter first to enable approval' : ''}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
              action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? 'Saving...' : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function HodLeaveManagement() {
  const [tab, setTab] = useState('awaiting');
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [reviewLeave, setReviewLeave] = useState(null);
  const [filters, setFilters] = useState({ status: '', leave_type: '', department: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      if (tab === 'awaiting') {
        const res = await leaveAPI.getHodPending();
        setLeaves(res.data.data);
      } else {
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.leave_type) params.leave_type = filters.leave_type;
        if (filters.department) params.department = filters.department;
        const res = await leaveAPI.getHodAll(params);
        setLeaves(res.data.data.leaves);
        setStats(res.data.data.stats);
      }
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    leaveAPI.getHodAll({}).then(res => setStats(res.data.data.stats)).catch(() => {});
  }, []);

  useEffect(() => { loadLeaves(); }, [tab, filters]);

  // Reload when user returns from signing the letter in another tab
  useEffect(() => {
    const onFocus = () => loadLeaves();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [tab, filters]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLeaves();
      leaveAPI.getHodAll({}).then(r => setStats(r.data.data.stats)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [tab, filters]);

  const handleDeleteOne = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this leave request? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await leaveAPI.hodDeleteOne(id);
      toast.success('Leave request deleted');
      setLeaves(prev => prev.filter(l => l.id !== id));
      leaveAPI.getHodAll({}).then(r => setStats(r.data.data.stats)).catch(() => {});
    } catch {
      toast.error('Failed to delete leave request');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await leaveAPI.hodDeleteAll();
      toast.success('All leave requests deleted');
      setLeaves([]);
      setStats({});
      setShowDeleteAllModal(false);
    } catch {
      toast.error('Failed to delete all leave requests');
    } finally {
      setDeletingAll(false);
    }
  };

  const statCards = [
    { label: 'Total', value: stats.total || 0, color: 'text-gray-900 dark:text-white', bg: 'bg-white dark:bg-gray-800' },
    { label: 'Pending', value: stats.pending || 0, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Awaiting HOD', value: stats.awaiting_hod || 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Approved', value: stats.approved || 0, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Rejected', value: stats.rejected || 0, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Total Days', value: stats.total_days || 0, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Review and manage all student leave applications</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">Auto-refresh: 1 min</span>
          <button
            onClick={() => { loadLeaves(); leaveAPI.getHodAll({}).then(r => setStats(r.data.data.stats)).catch(() => {}); }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
          >
            <TrashIcon className="w-4 h-4" />
            Delete All
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
        {[
          { id: 'awaiting', label: 'Awaiting HOD Decision' },
          { id: 'all', label: 'All Requests' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t.label}
            {t.id === 'awaiting' && (stats.awaiting_hod || 0) > 0 && (
              <span className="ml-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {stats.awaiting_hod}
              </span>
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
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                key: 'status', label: 'Status',
                opts: [['', 'All Statuses'], ['pending','Pending'], ['staff_approved','Staff Approved'], ['staff_rejected','Staff Rejected'], ['approved','Approved'], ['rejected','Rejected']],
              },
              {
                key: 'leave_type', label: 'Leave Type',
                opts: [['', 'All Types'], ['sick','Sick'], ['casual','Casual'], ['emergency','Emergency'], ['medical','Medical'], ['family','Family'], ['other','Other']],
              },
              {
                key: 'department', label: 'Department',
                opts: [['','All Departments'], ['CSE','CSE'], ['ECE','ECE'], ['EEE','EEE'], ['MECH','MECH'], ['CIVIL','CIVIL'], ['IT','IT']],
              },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                <select
                  value={filters[f.key]}
                  onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
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
          <p className="text-gray-500 dark:text-gray-400">{tab === 'awaiting' ? 'No leaves awaiting HOD decision' : 'No leave requests found'}</p>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{leave.student_name}</span>
                      <span className="text-xs text-gray-400">{leave.roll_number}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{leave.department} · Yr {leave.year_of_study}</span>
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
                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      leave.status === 'staff_approved' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' :
                      leave.status === 'approved'      ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' :
                      leave.status === 'rejected' || leave.status === 'staff_rejected' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' :
                      'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                    }`}>
                      {leave.status.replace(/_/g, ' ')}
                    </span>
                    {/* WhatsApp student */}
                    {leave.student_phone && (
                      <a
                        href={`https://wa.me/${leave.student_phone.replace(/\D/g,'').replace(/^0/,'91').replace(/^(?!91)/,'91')}?text=${encodeURIComponent(`Hi ${leave.student_name} 👋\n\n*${leave.leave_type.charAt(0).toUpperCase()+leave.leave_type.slice(1)} Leave Request*\n📅 ${fmtDate(leave.from_date)} → ${fmtDate(leave.to_date)} (${leave.days_count} day${leave.days_count>1?'s':''})\n🆔 ID: #${leave.leave_id}\n\nPlease check your EventPass portal for updates or reply here if you have questions.`)}`}
                        target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors border border-green-200 dark:border-green-800"
                      >
                        💬 WA
                      </a>
                    )}
                    {/* Letter — highlighted as primary action */}
                    <Link
                      to={`/hod/leave-letter/${leave.id}`}
                      onClick={e => e.stopPropagation()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
                        leave.hod_signature
                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                          : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                      }`}
                    >
                      <DocumentTextIcon className="h-3.5 w-3.5" />
                      {leave.hod_signature ? '✓ Letter' : 'Sign Letter'}
                    </Link>
                    {/* Final Decision — only for staff_approved, gated on signature */}
                    {leave.status === 'staff_approved' && (
                      <button
                        onClick={e => { e.stopPropagation(); setReviewLeave(leave); }}
                        disabled={!leave.hod_signature}
                        title={!leave.hod_signature ? 'Sign the letter first to enable Final Decision' : ''}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Final Decision
                      </button>
                    )}
                    <button
                      onClick={e => handleDeleteOne(leave.id, e)}
                      disabled={deletingId === leave.id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === leave.id
                        ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        : <TrashIcon className="h-4 w-4" />}
                    </button>
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
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 mt-0">
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
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
                          {/* Approval trail */}
                          <div className="col-span-2">
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Approval Trail</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                <span className="text-gray-600 dark:text-gray-400">Submitted: {fmtDate(leave.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                  ['staff_approved','approved'].includes(leave.status) ? 'bg-blue-500' :
                                  leave.status === 'staff_rejected' ? 'bg-red-500' : 'bg-gray-300'
                                }`} />
                                <span className="text-gray-600 dark:text-gray-400">
                                  Staff ({leave.staff_name || 'pending'}):
                                  {leave.staff_remarks ? ` "${leave.staff_remarks}"` : ''}
                                  {leave.staff_reviewed_at ? ` · ${fmtDate(leave.staff_reviewed_at)}` : ''}
                                </span>
                              </div>
                              {(leave.hod_remarks || leave.hod_reviewed_at) && (
                                <div className="flex items-center gap-2 text-xs">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${leave.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span className="text-gray-600 dark:text-gray-400">
                                    HOD: {leave.hod_remarks ? `"${leave.hod_remarks}"` : ''}
                                    {leave.hod_reviewed_at ? ` · ${fmtDate(leave.hod_reviewed_at)}` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
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
        <HodReviewModal
          leave={reviewLeave}
          onClose={() => setReviewLeave(null)}
          onDone={() => { setReviewLeave(null); loadLeaves(); leaveAPI.getHodAll({}).then(r => setStats(r.data.data.stats)).catch(() => {}); }}
        />
      )}

      {/* Delete All confirmation modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteAllModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Delete All Leave Requests</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This will permanently delete all leave records. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >Cancel</button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deletingAll
                  ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <TrashIcon className="w-4 h-4" />}
                {deletingAll ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
