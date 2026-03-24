import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

/* ── SVG Neural Network Background ── */
const NeuralNetwork = () => {
  const nodes = [
    { x: 80, y: 100, r: 4, c: '#00e5ff' }, { x: 200, y: 60, r: 3, c: '#8b5cf6' }, { x: 320, y: 130, r: 5, c: '#00e5ff' },
    { x: 140, y: 220, r: 3, c: '#f43f8a' }, { x: 260, y: 200, r: 4, c: '#00f5a0' }, { x: 380, y: 80, r: 3, c: '#ffbe0b' },
    { x: 60, y: 320, r: 4, c: '#8b5cf6' }, { x: 180, y: 350, r: 3, c: '#00e5ff' }, { x: 300, y: 310, r: 5, c: '#f43f8a' },
    { x: 420, y: 260, r: 3, c: '#00f5a0' }, { x: 100, y: 450, r: 4, c: '#00e5ff' }, { x: 240, y: 480, r: 3, c: '#8b5cf6' },
    { x: 360, y: 420, r: 4, c: '#ffbe0b' }, { x: 460, y: 350, r: 3, c: '#00e5ff' }, { x: 160, y: 560, r: 5, c: '#f43f8a' },
    { x: 320, y: 540, r: 3, c: '#00f5a0' }, { x: 440, y: 500, r: 4, c: '#8b5cf6' }, { x: 50, y: 180, r: 3, c: '#ffbe0b' },
    { x: 480, y: 160, r: 3, c: '#f43f8a' }, { x: 400, y: 580, r: 3, c: '#00e5ff' },
  ]

  const connections = [
    [0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [3, 4], [4, 5],
    [3, 6], [4, 7], [5, 9], [6, 7], [7, 8], [8, 9],
    [6, 10], [7, 11], [8, 12], [9, 13], [10, 11], [11, 12], [12, 13],
    [10, 14], [11, 15], [12, 16], [14, 15], [15, 16],
    [0, 17], [2, 18], [13, 16], [14, 19], [16, 19],
    [1, 3], [4, 8], [9, 12], [5, 2],
  ]

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 540 640" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f8a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffbe0b" stopOpacity="0.1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="bigGlow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {connections.map(([a, b], i) => (
        <motion.line
          key={`c-${i}`}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke={i % 3 === 0 ? 'url(#lineGrad2)' : 'url(#lineGrad1)'}
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: i * 0.03, duration: 1.2, ease: 'easeOut' }}
        />
      ))}

      {nodes.map((n, i) => (
        <motion.g key={`n-${i}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.04, type: 'spring', stiffness: 200 }}
        >
          <circle cx={n.x} cy={n.y} r={n.r * 4} fill={n.c} opacity="0.08" filter="url(#bigGlow)">
            <animate attributeName="opacity" values="0.06;0.15;0.06" dur={`${3 + i % 3}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} filter="url(#glow)">
            <animate attributeName="r" values={`${n.r};${n.r + 1.5};${n.r}`} dur={`${2 + i % 4}s`} repeatCount="indefinite" />
          </circle>
        </motion.g>
      ))}

      {/* Data flowing particles - colorful */}
      {[
        { ci: 0, color: '#00e5ff' }, { ci: 4, color: '#f43f8a' }, { ci: 8, color: '#00f5a0' },
        { ci: 12, color: '#8b5cf6' }, { ci: 16, color: '#ffbe0b' }, { ci: 20, color: '#00e5ff' },
        { ci: 24, color: '#f43f8a' }, { ci: 28, color: '#00f5a0' },
      ].map(({ ci, color }) => {
        const [a, b] = connections[ci] || [0, 1]
        return (
          <circle key={`p-${ci}`} r="2.5" fill={color} opacity="0.8" filter="url(#glow)">
            <animateMotion
              dur={`${2.5 + ci % 3}s`}
              repeatCount="indefinite"
              path={`M${nodes[a].x},${nodes[a].y} L${nodes[b].x},${nodes[b].y}`}
            />
          </circle>
        )
      })}
    </svg>
  )
}

/* ── Feature badges ── */
const features = [
  { icon: '⚡', text: 'Real-time OD Pipeline', color: 'from-amber-400 to-orange-500', border: 'border-amber-400/20', glow: 'shadow-amber-500/10' },
  { icon: '🧠', text: 'AI-Powered Analytics', color: 'from-cyan-400 to-blue-500', border: 'border-cyan-400/20', glow: 'shadow-cyan-500/10' },
  { icon: '📊', text: 'Data Science Dashboard', color: 'from-purple-400 to-violet-600', border: 'border-purple-400/20', glow: 'shadow-purple-500/10' },
  { icon: '🔒', text: 'Multi-Role Access', color: 'from-emerald-400 to-teal-500', border: 'border-emerald-400/20', glow: 'shadow-emerald-500/10' },
]

/* ── Golden Badge Component ── */
const GoldenBadge = () => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 1, ease: "easeOut" }}
    className="relative group cursor-pointer"
  >
    <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-yellow-500/40 to-amber-500/30 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity animate-pulse" />
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-600 rounded-2xl rotate-45 scale-90 opacity-20 group-hover:rotate-90 transition-transform duration-1000" />
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-600 p-[2px] shadow-[0_0_30px_rgba(251,191,36,0.4)]">
        <div className="w-full h-full bg-[#0c0d28] rounded-[14px] flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent" />
          <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">🏆</span>
        </div>
      </div>
    </div>
  </motion.div>
)

export default function AuthLayout() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="fixed inset-0 flex bg-[#050510] text-white overflow-hidden">
      {/* ── Left Panel: Ultra-Premium Neural Network ── */}
      <section className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Multidimensional Gradient Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#02020a] via-[#0a0b25] to-[#02020a]" />
        
        {/* Animated Orbs with Perspective */}
        <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Neural Grid with Viewport Scaling */}
        <div className="absolute inset-0 opacity-[0.05] [perspective:2000px]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,1)_1px,transparent_1px)] bg-[size:80px_80px] [transform:rotateX(65deg)_translateY(-100px)] [transform-origin:top] animate-data-stream" />
        </div>

        {/* Dynamic Data Stream Overlay */}
        <div className="absolute inset-0 opacity-40">
           <NeuralNetwork />
        </div>

        {/* Floating AI Particles */}
        <div className="absolute inset-0">
           {Array.from({ length: 15 }).map((_, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, scale: 0 }}
               animate={{ 
                 opacity: [0, 0.6, 0],
                 scale: [0, 1.5, 0],
                 x: [Math.floor(Math.random() * 80) + '%', Math.floor(Math.random() * 80) + '%'],
                 y: [Math.floor(Math.random() * 80) + '%', Math.floor(Math.random() * 80) + '%']
               }}
               transition={{ 
                 duration: 15 + Math.random() * 10, 
                 repeat: Infinity, 
                 delay: Math.random() * 5 
               }}
               className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_15px_#00e5ff]"
             />
           ))}
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Top: Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/20 px-5 py-2.5 shadow-lg shadow-cyan-500/5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-glow-pulse shadow-lg shadow-cyan-400/40" />
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                AI & Data Science Department
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-lg"
          >
            <div className="mb-6 flex items-center gap-6">
               <GoldenBadge />
               <div>
                  <h1 className="font-display text-5xl xl:text-[4rem] font-black leading-[1.05] tracking-tight">
                    <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">EventOS</span>
                    <br />
                    <span className="bg-gradient-to-r from-white via-white/90 to-amber-200 bg-clip-text text-transparent">Neural</span>
                    <br />
                    <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">Elite Access</span>
                  </h1>
               </div>
            </div>
            <p className="mt-6 text-[15px] text-slate-400 leading-relaxed max-w-md">
              Next-generation event management built for the Department of <span className="text-cyan-400 font-medium">Artificial Intelligence</span> & <span className="text-purple-400 font-medium">Data Science</span>.
            </p>

            {/* Feature badges — colorful card-based */}
            <div className="mt-8 grid grid-cols-2 gap-2.5">
              {features.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.5, type: 'spring' }}
                  className={`group relative flex items-center gap-3 rounded-2xl border ${f.border} bg-white/[0.03] px-4 py-3 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:scale-[1.02] shadow-lg ${f.glow}`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-base shadow-lg`}>
                    {f.icon}
                  </span>
                  <span className="text-[13px] font-semibold text-white/80">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom: Version badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/8 to-cyan-500/5 border border-emerald-400/15 px-4 py-2 shadow-lg shadow-emerald-500/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-glow-pulse shadow-lg shadow-emerald-400/40" />
              <span className="font-mono text-xs font-semibold text-emerald-300/80">v3.0 Neural</span>
            </div>
            <span className="font-mono text-xs text-white/20">System Online</span>
          </motion.div>
        </div>
      </section>

      {/* ── Right Panel: Auth Form ── */}
      <section className="flex-1 relative flex items-center justify-center p-5 sm:p-8 overflow-hidden">
        {/* Rich gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#080818] via-[#0d0e30] to-[#0a0820]" />

        {/* Colorful gradient orbs — larger and more vivid */}
        <div className="absolute top-[-15%] right-[-15%] w-[450px] h-[450px] rounded-full bg-purple-600/12 blur-[100px] animate-breathe" />
        <div className="absolute bottom-[-15%] left-[-15%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px] animate-breathe" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] right-[10%] w-[250px] h-[250px] rounded-full bg-pink-500/8 blur-[80px] animate-breathe" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[10%] left-[20%] w-[180px] h-[180px] rounded-full bg-amber-500/6 blur-[70px] animate-breathe" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[20%] right-[30%] w-[200px] h-[200px] rounded-full bg-emerald-500/6 blur-[80px] animate-breathe" style={{ animationDelay: '4s' }} />

        {/* Visible dot grid */}
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,229,255,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {/* Floating geometric shapes */}
        {/* Top-left: rotating hexagon ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[8%] left-[8%] w-20 h-20 border border-cyan-400/15 rounded-2xl"
          style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
        />
        {/* Top-right: pulsing circle */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[12%] right-[15%] w-12 h-12 rounded-full border border-purple-400/20 bg-purple-500/5"
        />
        {/* Mid-left: diamond */}
        <motion.div
          animate={{ rotate: [45, 135, 45], y: [-5, 8, -5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[35%] left-[5%] w-8 h-8 border border-pink-400/15 bg-pink-500/5"
          style={{ transform: 'rotate(45deg)' }}
        />
        {/* Mid-right: floating ring */}
        <motion.div
          animate={{ y: [-8, 8, -8], x: [-3, 3, -3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[45%] right-[5%] w-14 h-14 rounded-full border-2 border-cyan-400/10"
        />
        {/* Bottom-left: small filled dot */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-[25%] left-[12%] w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30"
        />
        {/* Bottom-right: rotating square */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-[12%] right-[10%] w-16 h-16 border border-emerald-400/12 rounded-xl bg-emerald-500/3"
        />
        {/* Center-top: tiny dot cluster */}
        <div className="absolute top-[18%] left-[40%] flex gap-3">
          <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 rounded-full bg-cyan-400/50" />
          <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="w-2 h-2 rounded-full bg-purple-400/50" />
          <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            className="w-2 h-2 rounded-full bg-pink-400/50" />
        </div>
        {/* Bottom-center: gradient line */}
        <motion.div
          animate={{ scaleX: [0.3, 1, 0.3], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[8%] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent origin-center"
        />
        {/* Floating cross */}
        <motion.div
          animate={{ rotate: [0, 90, 180, 270, 360], y: [-4, 6, -4] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[65%] left-[8%] text-purple-400/15 text-3xl font-light"
        >+</motion.div>
        {/* Floating triangle outline */}
        <motion.div
          animate={{ y: [-6, 6, -6], rotate: [0, 10, 0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[35%] right-[8%] text-amber-400/15 text-2xl"
        >△</motion.div>

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="absolute right-5 top-5 z-20 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-white/40 transition-all hover:bg-white/[0.08] hover:text-white/70 hover:border-cyan-400/20">
          {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>

        {/* Mobile branding */}
        <div className="absolute top-5 left-5 lg:hidden z-20">
          <div className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/20 px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-glow-pulse" />
            <span className="font-display text-sm font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">EventOS</span>
          </div>
        </div>

        {/* Form container — glassmorphism card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[420px]"
        >
          {/* Animated gradient border card */}
          <div className="relative rounded-3xl p-[1.5px] overflow-hidden">
            {/* Animated gradient border — more vivid */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-pink-500/40 animate-data-stream" />
            {/* Inner card */}
            <div className="relative rounded-3xl bg-[#0c0d28]/95 backdrop-blur-2xl p-7">
              <Outlet />
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
