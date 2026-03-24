import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export default function Register() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'student', department: '', year_of_study: '', section: '', phone: '', employee_id: ''
  })
  const [customDepartment, setCustomDepartment] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const departments = [
    'Computer Science', 'Information Technology', 'Artificial Intelligence and Data Science',
    'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Others'
  ]

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.password) { toast.error('Please fill all required fields'); return false }
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return false }
    if (formData.password.length < 12) { toast.error('Password must be at least 12 characters'); return false }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
      toast.error('Password must contain uppercase, lowercase, number, and special character'); return false
    }
    return true
  }

  const handleNext = () => { if (validateStep1()) setStep(2) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const submitData = { ...formData }
    delete submitData.confirmPassword
    if (submitData.department === 'Others') submitData.department = customDepartment.trim() || 'Others'
    const result = await register(submitData)
    if (result.success) {
      toast.success('Registration successful!')
      navigate({ student: '/student/dashboard', staff: '/staff/dashboard', hod: '/hod/dashboard' }[result.user.role])
    } else {
      toast.error(result.error || 'Registration failed')
    }
  }

  return (
    <div className="space-y-5 max-h-[90vh] overflow-y-auto pr-1">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-magenta/20 border border-accent-purple/20 flex items-center justify-center"
        >
          <span className="text-2xl">🚀</span>
        </motion.div>
        <h2 className="font-display text-2xl font-bold gradient-text">Create Account</h2>
        <p className="mt-2 text-sm text-white/40">
          {step === 1 ? 'Enter your credentials' : 'Complete your profile'}
        </p>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className={`w-2.5 h-2.5 rounded-full transition-all ${step >= 1 ? 'bg-accent-cyan shadow-glow-cyan' : 'bg-white/10'}`} />
          <div className={`w-10 h-0.5 rounded transition-all ${step >= 2 ? 'bg-accent-cyan' : 'bg-white/10'}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all ${step >= 2 ? 'bg-accent-cyan shadow-glow-cyan' : 'bg-white/10'}`} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input" placeholder="Enter your full name" required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" placeholder="you@college.edu" required />
            </div>
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="input pr-12" placeholder="Min 12 chars" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/30 hover:text-white/60">
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input pr-12" placeholder="Confirm password" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/30 hover:text-white/60">
                  {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Register as *</label>
              <select name="role" value={formData.role} onChange={handleChange} className="input">
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <button type="button" onClick={handleNext} className="btn btn-primary w-full h-12 text-base font-bold">
              Continue <ArrowRightIcon className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="label">Department *</label>
              <select name="department" value={formData.department} onChange={handleChange} className="input" required>
                <option value="">Select department</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {formData.department === 'Others' && (
                <input type="text" value={customDepartment} onChange={e => setCustomDepartment(e.target.value)} className="input mt-2" placeholder="Enter department name" required />
              )}
            </div>

            {formData.role === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Year</label>
                    <select name="year_of_study" value={formData.year_of_study} onChange={handleChange} className="input">
                      <option value="">Select</option>
                      <option value="1">1st Year</option><option value="2">2nd Year</option>
                      <option value="3">3rd Year</option><option value="4">4th Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Section</label>
                    <select name="section" value={formData.section} onChange={handleChange} className="input">
                      <option value="">Select</option>
                      {['A','B','C','D','E'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Register Number</label>
                  <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} className="input" placeholder="e.g., RA2011003010123" />
                </div>
              </>
            )}

            {formData.role === 'staff' && (
              <div>
                <label className="label">Employee ID</label>
                <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} className="input" placeholder="Enter employee ID" />
              </div>
            )}

            <div>
              <label className="label">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input" placeholder="Enter phone number" />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-danger-500/20 bg-danger-500/[0.04] px-4 py-3 text-sm text-danger-400">
                {error}
              </motion.div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary flex-1 h-12">
                <ArrowLeftIcon className="w-4 h-4" /> Back
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary flex-1 h-12 font-bold">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Register'}
              </button>
            </div>
          </motion.div>
        )}
      </form>

      <p className="text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-cyan/80 hover:text-accent-cyan transition-colors">Sign in</Link>
      </p>
    </div>
  )
}
