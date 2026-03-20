import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { leaveAPI } from '../../services/api';

const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave', color: 'red' },
  { value: 'casual', label: 'Casual Leave', color: 'blue' },
  { value: 'emergency', label: 'Emergency Leave', color: 'orange' },
  { value: 'medical', label: 'Medical Leave', color: 'purple' },
  { value: 'family', label: 'Family Leave', color: 'green' },
  { value: 'other', label: 'Other', color: 'gray' },
];

const LEAVE_MODES = [
  {
    value: 'pre_leave',
    label: 'Pre-Leave',
    desc: 'Submit before your leave dates',
    icon: '📋',
  },
  {
    value: 'post_leave',
    label: 'Post-Leave',
    desc: 'Submit after leave was already taken',
    icon: '📝',
  },
];

const daysBetween = (from, to) => {
  if (!from || !to) return 0;
  const d1 = new Date(from), d2 = new Date(to);
  if (d2 < d1) return 0;
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
};

export default function NewLeaveRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leave_type: '',
    leave_mode: 'pre_leave',
    from_date: '',
    to_date: '',
    reason: '',
    contact_during_leave: '',
    parent_name: '',
    parent_phone: '',
  });

  const days = daysBetween(form.from_date, form.to_date);
  const isPostLeave = form.leave_mode === 'post_leave';

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const validateStep1 = () => {
    if (!form.leave_type) return 'Please select a leave type';
    if (!form.from_date) return 'Please select a start date';
    if (!form.to_date) return 'Please select an end date';
    if (new Date(form.to_date) < new Date(form.from_date)) return 'End date cannot be before start date';
    if (form.reason.trim().length < 10) return 'Reason must be at least 10 characters';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { toast.error(err); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) payload.append(k, v); });

      await leaveAPI.submitRequest(payload);
      toast.success('Leave request submitted successfully!');
      navigate('/student/leaves');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/student/leaves')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Back to My Leaves
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Leave Request</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Submit a pre-leave or post-leave application</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              s < step ? 'bg-green-500 text-white' : s === step ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {s < step ? <CheckCircleIcon className="h-4 w-4" /> : s}
            </div>
            <span className={`text-sm font-medium ${s === step ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
              {s === 1 ? 'Leave Details' : 'Contact & Submit'}
            </span>
            {s < 2 && <div className={`h-px w-12 ${step > s ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-6"
          >
            {/* Leave Mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leave Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {LEAVE_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => set('leave_mode', m.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.leave_mode === m.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{m.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
              {isPostLeave && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Post-leave applications require department approval and must include a valid reason for late submission.
                  </p>
                </div>
              )}
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Leave Type</label>
              <div className="grid grid-cols-3 gap-2">
                {LEAVE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => set('leave_type', t.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      form.leave_type === t.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={form.from_date}
                    onChange={(e) => set('from_date', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={form.to_date}
                    min={form.from_date}
                    onChange={(e) => set('to_date', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {days > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Total: <strong>{days} day{days > 1 ? 's' : ''}</strong> of leave
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={form.reason}
                onChange={(e) => set('reason', e.target.value)}
                placeholder="Provide a detailed reason for your leave..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{form.reason.length} characters (min 10)</p>
            </div>

            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
            >
              Next: Contact Details <ArrowRightIcon className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-6"
          >
            {/* Summary card */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Leave Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="font-medium capitalize text-gray-900 dark:text-white">{form.leave_type} Leave</span>
                <span className="text-gray-500 dark:text-gray-400">Mode:</span>
                <span className="font-medium text-gray-900 dark:text-white">{isPostLeave ? 'Post-Leave' : 'Pre-Leave'}</span>
                <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                <span className="font-medium text-gray-900 dark:text-white">{form.from_date} → {form.to_date} ({days} day{days > 1 ? 's' : ''})</span>
              </div>
            </div>

            {/* Contact during leave */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Contact Number During Leave
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="tel"
                  value={form.contact_during_leave}
                  onChange={(e) => set('contact_during_leave', e.target.value)}
                  placeholder="Your phone during leave"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Parent/Guardian */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Parent/Guardian Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => set('parent_name', e.target.value)}
                    placeholder="Parent name"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Parent Phone
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => set('parent_phone', e.target.value)}
                    placeholder="Parent phone"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-4 w-4" />
                    Submit Leave Request
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
