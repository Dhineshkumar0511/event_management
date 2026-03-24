import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import { useTheme } from '../../context/ThemeContext'
import { featuresAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import {
  TrophyIcon, StarIcon, BuildingOfficeIcon, ArrowDownTrayIcon,
  SparklesIcon, UserGroupIcon, CalendarIcon, AcademicCapIcon,
  TrashIcon, ArrowPathIcon, PencilIcon, ArrowUpTrayIcon, DocumentTextIcon
} from '@heroicons/react/24/outline'

const COLLEGE_NAME = 'Sri Manakula Vinayagar Engineering College'
const medals = ['🥇', '🥈', '🥉']
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

/* ═══════ Sparkle / confetti particles for banner ═══════ */
function Sparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 6 + 3,
            height: Math.random() * 6 + 3,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: ['#fbbf24','#f59e0b','#ffffff','#fde68a','#fb923c'][i % 5],
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            y: [0, -20, -40],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

/* ═══════ Student of the Month Banner (Ultra-Premium AI Edition) ═══════ */
function MonthBanner({ student, month, year, onDownload, bannerRef }) {
  const displayMonth = monthNames[(month || 1) - 1]

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0, y: 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-4xl mx-auto group"
    >
      {/* Dynamic Animated Peripheral Glows - Smaller */}
      <div className="absolute -top-10 -left-10 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* The Banner Container - Reduced rounding */}
      <div ref={bannerRef} className="relative w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]"
        style={{ background: 'linear-gradient(165deg, #05060b 0%, #0a0c1a 60%, #11142b 100%)' }}>
        
        {/* Futuristic Neural Backdrop */}
        <div className="absolute inset-0 opacity-20">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_70%)]" />
           <svg className="w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
              <defs>
                 <linearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                    <stop offset="50%" stopColor="#818cf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
                 </linearGradient>
              </defs>
              {/* Animated Horizontal Scanning Lines */}
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.line 
                  key={i} x1="0" y1={i * 30} x2="1000" y2={i * 30} 
                  stroke="url(#neuralGrad)" strokeWidth="1"
                  animate={{ opacity: [0, 1, 0], x: [-1000, 1000] }}
                  transition={{ duration: 4 + i % 5, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                />
              ))}
              {/* Connecting Nodes */}
              {Array.from({ length: 8 }).map((_, i) => (
                <circle key={i} cx={150 + i * 120} cy={100 + (i % 3) * 100} r="1.5" fill="#00e5ff" opacity="0.4">
                   <animate attributeName="opacity" values="0.1;0.8;0.1" dur="3s" repeatCount="indefinite" />
                </circle>
              ))}
           </svg>
        </div>

        {/* Content Layer - Tightened Padding */}
        <div className="relative z-10 grid lg:grid-cols-[1.1fr_1fr] gap-8 p-8 md:p-12 items-center">
           
           {/* Left: Metadata & Titles */}
           <div className="space-y-6">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-white/[0.03] backdrop-blur-xl shadow-2xl relative group"
                  >
                     <div className="absolute inset-0 bg-accent-cyan/10 rounded-2xl blur-lg animate-pulse" />
                     <StarIcon className="h-6 w-6 text-accent-cyan relative z-10" />
                  </motion.div>
                  <div>
                     <span className="text-accent-cyan font-black tracking-[0.5em] uppercase text-[9px] block glow-text-cyan">NEURAL IDENTITY VERIFIED</span>
                     <span className="text-white/20 font-mono text-[8px] tracking-[0.3em] block mt-1 uppercase">ARCHIVE_{year} // UNIT_{month}</span>
                  </div>

               <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter leading-none flex flex-col">
                    <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">THE PREMIER</span>
                    <span className="bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-magenta bg-clip-text text-transparent">EXCELLENCE</span>
                  </h2>
                  <div className="h-[3px] w-32 bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-magenta rounded-full opacity-60" />
               </div>

               <div className="space-y-4">
                  <p className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none glow-text-cyan">
                    {student.name}
                  </p>
                  <div className="flex gap-5 items-center">
                    <span className="px-5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-accent-cyan font-black text-[11px] tracking-[0.2em] uppercase italic backdrop-blur-xl">
                       {student.department}
                    </span>
                    <span className="text-white/20 font-black uppercase tracking-[0.3em] text-[9px]">
                       // NODE_{year} // SEC_{student.section || 'A'}
                    </span>
                  </div>
               </div>

               <div className="relative max-w-lg mt-4">
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-[4px] h-[80%] bg-gradient-to-b from-accent-cyan via-accent-purple to-transparent rounded-full opacity-40" />
                  <p className="text-xl md:text-2xl font-medium text-white/50 leading-relaxed italic tracking-tight">
                    "{student.achievement || "Defining the future through technical mastery and academic leadership."}"
                  </p>
               </div>

              <div className="flex gap-4 pt-2">
                 <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Status</div>
                    <div className="text-emerald-400 font-bold text-[11px] uppercase tracking-tighter flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> Platform Elite
                    </div>
                 </div>
                 <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Ranking</div>
                    <div className="text-cyan-400 font-bold text-[11px] uppercase tracking-tighter flex items-center gap-1.5">
                       🥇 #1 DEPARTMENT
                    </div>
                 </div>
              </div>
           </div>

           {/* Right: The Holographic Portrait - Refined */}
           <div className="relative flex justify-center items-center scale-90 md:scale-100">
              {/* Complex Geometric Background */}
              <div className="absolute inset-0 flex items-center justify-center">
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                   className="w-[320px] h-[320px] border border-white/5 rounded-[4rem] rotate-45 opacity-20" />
                 <motion.div animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                   className="w-[280px] h-[280px] border border-cyan-500/10 rounded-[3rem] -rotate-12 opacity-30" />
                 <div className="w-[220px] h-[220px] bg-gradient-to-br from-cyan-500/5 via-purple-600/5 to-transparent rounded-full blur-3xl opacity-50" />
              </div>

              {/* Portrait Container */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative z-10 w-52 h-52 md:w-64 md:h-64"
              >
                 {/* Glowing Outlines */}
                 <div className="absolute -inset-2 rounded-full border border-cyan-400/20 animate-pulse" />
                 <div className="absolute -inset-4 rounded-full border border-white/5" />
                 
                 {/* Animated Scanning Line */}
                 <motion.div 
                   animate={{ top: ['0%', '100%', '0%'] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute left-0 right-0 h-px bg-cyan-400/60 z-20 shadow-[0_0_10px_#00e5ff] opacity-60"
                 />

                 <div className="w-full h-full rounded-full p-1.5 bg-gradient-to-br from-white/10 via-white/5 to-white/0 backdrop-blur-sm shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-white/20 overflow-hidden relative">
                    {student.profile_image ? (
                      <img src={student.profile_image} alt={student.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-[#05060f] flex items-center justify-center text-5xl font-black text-white/90">
                         {student.name?.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05060f]/60 via-transparent to-transparent" />
                 </div>

                 {/* Corner Badges */}
                 <div className="absolute top-2 -left-2 bg-white text-black font-black px-2.5 py-0.5 rounded-md text-[9px] tracking-tighter shadow-xl uppercase">
                    Elite_Tier
                 </div>
                 <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-200 to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl rotate-6 border-4 border-[#0a0b1e] text-2xl">
                    👑
                 </div>
              </motion.div>
           </div>
        </div>

        {/* Dynamic Data Stream Footer - Subtle */}
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-white/5 flex items-center overflow-hidden px-10">
           <div className="flex gap-20 whitespace-nowrap animate-data-stream">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="text-[7px] font-mono text-cyan-400/30 uppercase tracking-[0.5em]">
                  [ LINK_NOMINAL ] [ CORE_SYNAPSE_ID: {student.employee_id?.slice(-6) || 'N/A'} ] [ PROTOCOL_V4 ] [ SIGNATURE_VERIFIED ]
                </span>
              ))}
           </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════ Signature Pad Component (reusable for each signer) ═══════ */
function SignaturePad({ label, signatureData, onSave, dark }) {
  const [mode, setMode] = useState('draw') // draw | type | upload
  const [signText, setSignText] = useState('')
  const [signFont, setSignFont] = useState('Dancing Script')
  const [uploadedSig, setUploadedSig] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showPad, setShowPad] = useState(false)
  const canvasRef = useRef(null)

  const fonts = ['Dancing Script', 'Great Vibes', 'Sacramento', 'Pacifico', 'Satisfy']

  const startDraw = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  const endDraw = () => setIsDrawing(false)
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedSig(ev.target.result)
    reader.readAsDataURL(file)
  }
  const getSignature = () => {
    if (mode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return null
      const blank = document.createElement('canvas')
      blank.width = canvas.width; blank.height = canvas.height
      if (canvas.toDataURL() === blank.toDataURL()) return null
      return canvas.toDataURL('image/png')
    }
    if (mode === 'type') {
      if (!signText.trim()) return null
      const c = document.createElement('canvas')
      c.width = 300; c.height = 80
      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.font = `40px "${signFont}", cursive`
      ctx.fillStyle = '#1e293b'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(signText.trim(), 150, 40)
      return c.toDataURL('image/png')
    }
    if (mode === 'upload') return uploadedSig || null
    return null
  }
  const handleSave = () => {
    const sig = getSignature()
    if (!sig) { toast.error(mode === 'draw' ? 'Draw your signature' : mode === 'type' ? 'Type your name' : 'Upload a signature'); return }
    onSave(sig)
    setShowPad(false)
  }

  if (signatureData) {
    return (
      <div className="text-center">
        <img src={signatureData} alt={label} className="h-10 mx-auto mb-1 object-contain" />
        <div className="w-28 border-b border-gray-400 mx-auto mb-1" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    )
  }

  return (
    <div className="text-center">
      {!showPad ? (
        <>
          <button onClick={() => setShowPad(true)}
            className={`w-28 h-10 border-2 border-dashed rounded-lg flex items-center justify-center mx-auto mb-1 text-xs transition-colors ${dark ? 'border-gray-600 text-gray-400 hover:border-yellow-500 hover:text-yellow-400' : 'border-gray-300 text-gray-400 hover:border-yellow-500 hover:text-yellow-600'}`}>
            <PencilIcon className="h-3.5 w-3.5 mr-1" /> Sign
          </button>
          <span className="text-xs text-gray-500">{label}</span>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className={`p-3 rounded-xl border shadow-lg ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-800'}`}>{label}</p>
          {/* Mode tabs */}
          <div className="flex gap-1 mb-2 justify-center">
            {[
              { id: 'draw', icon: PencilIcon, l: 'Draw' },
              { id: 'type', icon: DocumentTextIcon, l: 'Type' },
              { id: 'upload', icon: ArrowUpTrayIcon, l: 'Upload' },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${mode === m.id ? 'bg-yellow-500 text-white' : dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                <m.icon className="h-3 w-3" /> {m.l}
              </button>
            ))}
          </div>
          {/* Draw mode */}
          {mode === 'draw' && (
            <div>
              <canvas ref={canvasRef} width={260} height={70}
                className={`border rounded-lg cursor-crosshair w-full ${dark ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50'}`}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              <button onClick={clearCanvas} className="text-[10px] text-red-500 mt-1 hover:underline">Clear</button>
            </div>
          )}
          {/* Type mode */}
          {mode === 'type' && (
            <div className="space-y-1.5">
              <input value={signText} onChange={e => setSignText(e.target.value)} placeholder="Your name"
                className={`w-full px-2 py-1.5 border rounded-lg text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`} />
              <select value={signFont} onChange={e => setSignFont(e.target.value)}
                className={`w-full px-2 py-1 border rounded-lg text-xs ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}>
                {fonts.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
              {signText && <p className="text-xl text-center py-1" style={{ fontFamily: `'${signFont}', cursive` }}>{signText}</p>}
            </div>
          )}
          {/* Upload mode */}
          {mode === 'upload' && (
            <div>
              <input type="file" accept="image/*" onChange={handleFileUpload}
                className="w-full text-xs file:mr-2 file:px-2 file:py-1 file:rounded-md file:border-0 file:text-xs file:bg-yellow-50 file:text-yellow-700" />
              {uploadedSig && <img src={uploadedSig} alt="Preview" className="h-12 mx-auto mt-2 object-contain" />}
            </div>
          )}
          {/* Actions */}
          <div className="flex gap-2 mt-2 justify-center">
            <button onClick={handleSave} className="px-3 py-1 bg-yellow-500 text-white rounded-md text-[10px] font-medium hover:bg-yellow-600">Save</button>
            <button onClick={() => setShowPad(false)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-[10px] font-medium hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300">Cancel</button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ═══════ Certificate (downloadable — 2 signatures: Staff Advisor + HOD) ═══════ */
function Certificate({ student, month, year, certRef, dark, userRole }) {
  const displayMonth = monthNames[(month || 1) - 1]
  const [staffSig, setStaffSig] = useState(null)
  const [hodSig, setHodSig] = useState(null)
  const canSign = userRole === 'staff' || userRole === 'hod'

  return (
    <div className="space-y-4">
      <div ref={certRef} className="relative w-full max-w-xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden" style={{ aspectRatio: '1.414/1' }}>
        {/* Ornate gold border - Tighter */}
        <div className="absolute inset-2 border-2 border-yellow-500 rounded-lg pointer-events-none" />
        <div className="absolute inset-4 border border-yellow-300 rounded-md pointer-events-none" />
        {/* Corner ornaments */}
        {['top-3.5 left-3.5','top-3.5 right-3.5','bottom-3.5 left-3.5','bottom-3.5 right-3.5'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-8 h-8 border-yellow-600 ${i < 2 ? 'border-t-2' : 'border-b-2'} ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'} rounded-sm`} />
        ))}
        {/* Content */}
        <div className="relative flex flex-col items-center justify-center h-full px-6 py-4 text-center">
          <div className="mb-0.5">
            <span className="text-[10px] tracking-[0.3em] uppercase text-yellow-700 font-bold">{COLLEGE_NAME}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-yellow-700 mt-1" style={{ fontFamily: 'Georgia, serif' }}>
            Certificate of Recognition
          </h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mt-2 mb-2" />
          <p className="text-gray-500 text-[11px] italic">This is proudly presented to</p>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-2 underline decoration-yellow-400 decoration-2 underline-offset-4" style={{ fontFamily: 'Georgia, serif' }}>
            {student.name}
          </h3>
          <p className="text-gray-500 text-[11px] mt-1">
            {student.department}{student.year_of_study ? ` • Year ${student.year_of_study}` : ''}{student.section ? ` • Section ${student.section}` : ''}
          </p>
          <p className="text-gray-600 text-[11px] mt-2.5 max-w-sm leading-relaxed">
            In recognition of outstanding performance and being awarded the title of
          </p>
          <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-lg">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-bold text-yellow-700">Student of the Month</span>
          </div>
          <p className="text-gray-600 text-[11px] mt-1">
            for the month of <strong className="text-gray-800">{displayMonth} {year}</strong>
          </p>
          {student.achievement && (
            <p className="text-gray-500 text-[10px] mt-2 italic max-w-xs">"{student.achievement}"</p>
          )}
          {/* Two signature lines */}
          <div className="flex items-end justify-around w-full mt-auto pt-3 px-4">
            <div className="text-center flex-1">
              {staffSig ? (
                <img src={staffSig} alt="Staff Advisor" className="h-6 mx-auto mb-0.5 object-contain" />
              ) : (
                <div className="h-6 mb-0.5" />
              )}
              <div className="w-16 border-b-2 border-gray-600 mx-auto mb-0.5" />
              <span className="text-[10px] text-gray-600 font-medium">Staff Advisor</span>
            </div>
            <div className="text-center flex-[0.8]">
              <div className="text-xl mb-0.5">🎓</div>
              <span className="text-[8px] text-gray-400 uppercase tracking-wider">SMVEC</span>
            </div>
            <div className="text-center flex-1">
              {hodSig ? (
                <img src={hodSig} alt="HOD" className="h-6 mx-auto mb-0.5 object-contain" />
              ) : (
                <div className="h-6 mb-0.5" />
              )}
              <div className="w-16 border-b-2 border-gray-600 mx-auto mb-0.5" />
              <span className="text-[10px] text-gray-600 font-medium">Head of Department</span>
            </div>
          </div>
        </div>
      </div>
      {/* Signature pads - only for staff/hod */}
      {canSign && (
        <div className="flex justify-center gap-6 max-w-2xl mx-auto">
          <SignaturePad label="Staff Advisor Signature" signatureData={staffSig} onSave={setStaffSig} dark={dark} />
          <SignaturePad label="HOD Signature" signatureData={hodSig} onSave={setHodSig} dark={dark} />
        </div>
      )}
      {!canSign && (
        <div className={`text-center py-3 rounded-lg ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} text-sm`}>
          Signatures will be added by authorized staff
        </div>
      )}
    </div>
  )
}

/* ═══════ HOD Selection Form — shows top 5 students dynamically ═══════ */
function SelectStudentForm({ dark, onSelect, onSeedDemo }) {
  const [top5, setTop5] = useState([])
  const [selected, setSelected] = useState(null)
  const [achievement, setAchievement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingTop5, setLoadingTop5] = useState(true)
  const [manualRoll, setManualRoll] = useState('')
  const [manualStudent, setManualStudent] = useState(null)
  const [searching, setSearching] = useState(false)
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear, setSelYear] = useState(now.getFullYear())

  useEffect(() => {
    loadTop5()
  }, [])

  const loadTop5 = async () => {
    setLoadingTop5(true)
    try {
      const res = await featuresAPI.getTop5Students()
      setTop5(res.data.data || [])
    } catch {} finally { setLoadingTop5(false) }
  }

  const searchManual = async () => {
    if (!manualRoll.trim()) return
    setSearching(true)
    try {
      const res = await featuresAPI.lookupStudent({ roll: manualRoll.trim() })
      if (res.data.success) { setManualStudent(res.data.data); setSelected(res.data.data) }
      else setManualStudent(null)
    } catch { setManualStudent(null) }
    finally { setSearching(false) }
  }

  const pickStudent = (s) => {
    setSelected(s)
    setManualStudent(null)
    setManualRoll('')
  }

  const handleSubmit = async () => {
    if (!selected || !achievement.trim()) return
    setSubmitting(true)
    try {
      await onSelect({ student_id: selected.id, month: selMonth, year: selYear, achievement: achievement.trim() })
      setSelected(null); setAchievement(''); setManualRoll(''); setManualStudent(null)
    } catch {} finally { setSubmitting(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 mb-6 ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-lg flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
          <SparklesIcon className="h-5 w-5 text-yellow-500" /> Select Student of the Month
        </h3>
        <button onClick={onSeedDemo}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 font-medium transition-colors">
          🎲 Load Demo Data
        </button>
      </div>

      {/* Month/Year selectors */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Month</label>
          <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
            {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Year</label>
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
            {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Top 5 dynamic list */}
      <div className="mb-4">
        <label className={`text-xs font-semibold mb-2 block ${dark ? 'text-yellow-400' : 'text-yellow-700'}`}>
          🏆 Top 5 Students (auto-ranked by wins) — Click to select
        </label>
        {loadingTop5 ? (
          <div className="text-center py-4"><div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : top5.length > 0 ? (
          <div className="space-y-2">
            {top5.map((s, i) => (
              <motion.button key={s.id} type="button" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => pickStudent(s)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  selected?.id === s.id
                    ? 'ring-2 ring-yellow-400 border-yellow-400 bg-yellow-50 dark:bg-yellow-950'
                    : dark ? 'border-gray-700 bg-gray-700/30 hover:bg-gray-700/60' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}>
                <span className="text-lg w-7 text-center flex-shrink-0">{medals[i] || `#${i + 1}`}</span>
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  {s.profile_image ? (
                    <img src={s.profile_image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {s.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
                  <div className="text-xs text-gray-500">{s.department} • {s.employee_id} • {s.wins} wins, {s.runner_ups} runner-ups</div>
                </div>
                {selected?.id === s.id && <span className="text-yellow-500 text-lg flex-shrink-0">✓</span>}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className={`text-center py-4 rounded-xl border ${dark ? 'border-gray-700 bg-gray-700/20' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-gray-500 text-sm">No event results yet. Use manual search below or load demo data.</p>
          </div>
        )}
      </div>

      {/* Manual search fallback */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Or search by Roll Number</label>
        <div className="flex gap-2">
          <input value={manualRoll} onChange={e => setManualRoll(e.target.value)} placeholder="e.g. 22IT101"
            onKeyDown={e => e.key === 'Enter' && searchManual()}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
          <button onClick={searchManual} disabled={searching}
            className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
            {searching ? '...' : 'Find'}
          </button>
        </div>
        {manualStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`flex items-center gap-3 p-3 rounded-xl mt-2 ${dark ? 'bg-gray-700/50' : 'bg-yellow-50'}`}>
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              {manualStudent.profile_image ? (
                <img src={manualStudent.profile_image} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {manualStudent.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{manualStudent.name}</div>
              <div className="text-xs text-gray-500">{manualStudent.department} • {manualStudent.employee_id}</div>
            </div>
            <span className="text-green-500 text-lg">✓</span>
          </motion.div>
        )}
      </div>

      {/* Selected student summary */}
      {selected && (
        <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 text-sm font-medium ${dark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-800'}`}>
          ✨ Selected: <strong>{selected.name}</strong> ({selected.employee_id})
        </div>
      )}

      {/* Achievement */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Achievement / Reason</label>
        <textarea value={achievement} onChange={e => setAchievement(e.target.value)}
          rows={2} placeholder="Outstanding performance in..."
          className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
      </div>

      <button onClick={handleSubmit} disabled={!selected || !achievement.trim() || submitting}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-sm hover:from-yellow-600 hover:to-amber-700 disabled:opacity-40 transition-all shadow-lg shadow-yellow-500/20">
        {submitting ? 'Selecting...' : '🏆 Announce Student of the Month'}
      </button>
      <p className="text-xs text-gray-500 mt-2 text-center">
        💡 If no student is selected by month end, the #1 ranked student is auto-chosen
      </p>
    </motion.div>
  )
}

/* ═══════ MAIN COMPONENT ═══════ */
export default function HallOfFame() {
  const { isDark: dark } = useTheme()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('sotm')
  const [data, setData] = useState({ hallOfFame: [], deptStats: [] })
  const [sotmData, setSotmData] = useState({ current: [], history: [] })
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')

  const bannerRef = useRef(null)
  const certRef = useRef(null)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [fameRes, sotmRes] = await Promise.all([
        featuresAPI.getHallOfFame({ year: year || undefined }),
        featuresAPI.getStudentOfMonth()
      ])
      setData(fameRes.data.data || { hallOfFame: [], deptStats: [] })
      setSotmData(sotmRes.data.data || { current: [], history: [] })
    } catch {} finally { setLoading(false) }
  }, [year])

  useEffect(() => { loadAll() }, [loadAll])

  const handleSelectStudent = async (payload) => {
    await featuresAPI.selectStudentOfMonth(payload)
    loadAll()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this Student of the Month entry?')) return
    try {
      await featuresAPI.deleteStudentOfMonth(id)
      loadAll()
    } catch {}
  }

  const handleReset = async () => {
    if (!window.confirm('Reset ALL Student of the Month data? This cannot be undone.')) return
    try {
      await featuresAPI.resetAllStudentOfMonth()
      loadAll()
    } catch {}
  }

  const handleSeedDemo = async () => {
    try {
      await featuresAPI.seedDemoStudentOfMonth()
      loadAll()
    } catch {}
  }

  const downloadImage = async (ref, filename) => {
    if (!ref.current) return
    try {
      const dataUrl = await toPng(ref.current, { quality: 0.95, pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) { console.error('Download failed', err) }
  }

  const currentSOTM = sotmData.current?.[0]

  const tabs = [
    { id: 'sotm', label: 'Student of the Month', icon: TrophyIcon },
    { id: 'achievers', label: 'Top Achievers', icon: StarIcon },
    { id: 'departments', label: 'Departments', icon: BuildingOfficeIcon },
  ]

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* ──── Header ──── */}
        <motion.div className="text-center mb-16 relative"
          initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          
          {/* Decorative background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10" />

          <div className="relative inline-block group">
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-32 h-32 bg-gradient-to-br from-cyan-400 via-blue-600 to-purple-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(0,229,255,0.3)] relative z-10"
            >
              <TrophyIcon className="h-16 w-16 text-white filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              {/* Spinning outer rings */}
              <div className="absolute -inset-4 border-2 border-dashed border-cyan-500/20 rounded-[3rem] animate-spin-slow" />
              <div className="absolute -inset-8 border border-white/5 rounded-[3.5rem] animate-spin-slow-reverse" />
            </motion.div>
          </div>
          
          <h1 className="font-display text-4xl md:text-7xl font-black mb-6 tracking-tighter leading-none">
            <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent glow-text-cyan">HALL OF</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent italic font-black-display">EXCELLENCE</span>
          </h1>
          <p className="text-gray-400 mt-4 text-xl max-w-2xl mx-auto font-medium leading-relaxed tracking-wide">
            Automated ranking of the <span className="text-cyan-400 font-black italic glow-text-cyan underline decoration-cyan-500/30 underline-offset-8">Neural 1%</span>. 
            Powered by EventOS AI Recognition Engine.
          </p>
          
          <div className="mt-12 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mx-auto relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#00e5ff]" />
          </div>
        </motion.div>

        {/* ──── Tabs ──── */}
        <div className="flex justify-center mb-16">
          <div className="neural-card p-2 inline-flex gap-2 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem]">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2.5 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 overflow-hidden group ${
                  tab === t.id
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}>
                {tab === t.id && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 shadow-[0_5px_20px_rgba(0,229,255,0.3)]" />
                )}
                <div className="relative z-10 flex items-center gap-2">
                   <t.icon className={`h-4 w-4 ${tab === t.id ? 'text-white' : 'text-white/40'}`} />
                   <span className="hidden sm:inline">{t.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-10 w-10 border-3 border-yellow-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Loading Hall of Fame...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ═══════════ TAB: Student of the Month ═══════════ */}
            {tab === 'sotm' && (
              <motion.div key="sotm" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                {/* HOD Selection Form */}
                {user?.role === 'hod' && (
                  <SelectStudentForm dark={dark} onSelect={handleSelectStudent} onSeedDemo={handleSeedDemo} />
                )}

                {/* HOD action bar: Reset */}
                {user?.role === 'hod' && sotmData.history.length > 0 && (
                  <div className="flex justify-end gap-2 mb-4">
                    <button onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                      <ArrowPathIcon className="h-3.5 w-3.5" /> Reset All Data
                    </button>
                  </div>
                )}

                {/* Current SOTM Banner */}
                {currentSOTM ? (
                  <div className="space-y-6">
                    <MonthBanner
                      student={currentSOTM}
                      month={currentSOTM.month || currentMonth}
                      year={currentSOTM.year || currentYear}
                      bannerRef={bannerRef}
                    />
                    <div className="flex justify-center gap-3">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => downloadImage(bannerRef, `student-of-month-${currentSOTM.name?.replace(/\s+/g, '-')}.png`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-yellow-500/20 transition-all uppercase tracking-wider">
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Download Banner
                      </motion.button>
                      {user?.role === 'hod' && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(currentSOTM.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 rounded-xl font-medium text-sm hover:bg-red-500/20 transition-colors border border-red-500/20">
                          <TrashIcon className="h-4 w-4" /> Remove
                        </motion.button>
                      )}
                    </div>

                    {/* Certificate */}
                    <div className="mt-8">
                      <h3 className={`text-lg font-bold text-center mb-4 flex items-center justify-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                        <AcademicCapIcon className="h-5 w-5 text-yellow-600" /> Certificate of Recognition
                      </h3>
                      <Certificate
                        student={currentSOTM}
                        month={currentSOTM.month || currentMonth}
                        year={currentSOTM.year || currentYear}
                        certRef={certRef}
                        dark={dark}
                        userRole={user?.role}
                      />
                      <div className="flex justify-center mt-4">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => downloadImage(certRef, `certificate-${currentSOTM.name?.replace(/\s+/g, '-')}.png`)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow">
                          <ArrowDownTrayIcon className="h-4 w-4" /> Download Certificate
                        </motion.button>
                      </div>
                    </div>

                    {/* History */}
                    {sotmData.history.length > 1 && (
                      <div className="mt-8">
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                          <CalendarIcon className="h-5 w-5 text-blue-500" /> Past Winners
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sotmData.history.filter(h => !(h.month === currentSOTM.month && h.year === currentSOTM.year && h.department === currentSOTM.department)).map((h, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`rounded-xl border p-4 flex items-center gap-3 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-md transition-shadow`}>
                              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-yellow-400/50">
                                {h.profile_image ? (
                                  <img src={h.profile_image} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    {h.name?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{h.name}</div>
                                <div className="text-xs text-gray-500">{h.department}</div>
                                <div className="text-xs text-yellow-500 font-medium">{monthNames[(h.month || 1) - 1]} {h.year}</div>
                              </div>
                              <span className="text-xl">🏆</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`text-center py-16 rounded-2xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-4">🏆</motion.div>
                    <h3 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>No Student of the Month Yet</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {user?.role === 'hod' ? 'Use the form above to select a student!' : 'Check back soon for this month\'s winner!'}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ═══════════ TAB: Top Achievers ═══════════ */}
            {tab === 'achievers' && (
              <motion.div key="achievers" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                {/* Year filter */}
                <div className="flex justify-center gap-2 mb-6">
                  <button onClick={() => setYear('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!year ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : dark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                    All Time
                  </button>
                  {years.map(y => (
                    <button key={y} onClick={() => setYear(y.toString())}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${year == y ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : dark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                      {y}
                    </button>
                  ))}
                </div>

                {data.hallOfFame.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <TrophyIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No achievements yet for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.hallOfFame.map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`rounded-xl border p-4 flex items-center gap-4 transition-shadow hover:shadow-lg ${
                          i === 0 ? 'ring-2 ring-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-300 dark:border-yellow-800' :
                          i === 1 ? 'ring-1 ring-gray-300 dark:ring-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-gray-300 dark:border-gray-700' :
                          i === 2 ? 'ring-1 ring-orange-200 dark:ring-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800' :
                          dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                        <div className="flex-shrink-0 w-10 text-center">
                          {i < 3 ? <span className="text-2xl">{medals[i]}</span> : (
                            <span className={`text-lg font-bold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>#{i + 1}</span>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {s.profile_image ? (
                            <img src={s.profile_image} className="w-12 h-12 rounded-full object-cover ring-2 ring-yellow-400/30" alt="" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                              {s.name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
                          <div className="text-xs text-gray-500">{s.department} • {s.employee_id}</div>
                          <div className="text-xs text-gray-400 mt-0.5 truncate">{s.events}</div>
                        </div>
                        <div className="flex gap-4 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-500">{s.wins}</div>
                            <div className="text-xs text-gray-500">Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-500">{s.runner_ups}</div>
                            <div className="text-xs text-gray-500">Runner-up</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>₹{Number(s.total_prize || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Prize</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════ TAB: Department Rankings ═══════════ */}
            {tab === 'departments' && (
              <motion.div key="departments" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                {data.deptStats.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No department data available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.deptStats.map((d, i) => (
                      <motion.div key={d.department} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        className={`rounded-2xl border p-5 transition-shadow hover:shadow-lg ${
                          i === 0 ? 'ring-2 ring-yellow-400 border-yellow-300 dark:border-yellow-700' :
                          dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        } ${i === 0 ? (dark ? 'bg-gradient-to-br from-yellow-950 to-gray-800' : 'bg-gradient-to-br from-yellow-50 to-orange-50') : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {i < 3 && <span className="text-xl">{medals[i]}</span>}
                            <span className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{d.department}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            i === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>Rank #{i + 1}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className={`rounded-xl p-2 ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <div className={`text-xl font-bold ${dark ? 'text-yellow-400' : 'text-yellow-600'}`}>{d.wins}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Wins</div>
                          </div>
                          <div className={`rounded-xl p-2 ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <div className={`text-xl font-bold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{d.total_achievements}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Total</div>
                          </div>
                          <div className={`rounded-xl p-2 ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <div className={`text-xl font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>₹{Number(d.total_prize || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Prize</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
