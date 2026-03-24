import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiAPI } from '../services/api'
import {
  ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon,
  SparklesIcon, UserCircleIcon,
} from '@heroicons/react/24/outline'

const suggestedQuestions = [
  'How do I apply for OD?',
  'What documents are needed?',
  'How long does approval take?',
  'Can I edit my request?'
]

const defaultGreeting = {
  role: 'assistant',
  content: 'Hello. I can help with OD requests, approvals, event policies, and platform guidance.'
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chat_history')
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) return parsed }
    } catch {}
    return [defaultGreeting]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (isOpen) inputRef.current?.focus() }, [isOpen])
  useEffect(() => { try { localStorage.setItem('ai_chat_history', JSON.stringify(messages.slice(-50))) } catch {} }, [messages])

  const clearHistory = () => { setMessages([defaultGreeting]); localStorage.removeItem('ai_chat_history') }

  const sendMessage = async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    try {
      const response = await aiAPI.chat({ message: userMessage, context: 'EventPass OD Letter Management System' })
      const reply = response.data.reply || response.data.data?.response || response.data.message || 'Let me help with that.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The assistant is temporarily unavailable. Please try again.' }])
    } finally { setLoading(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            whileHover={{ y: -3, scale: 1.02 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-accent-cyan/15 bg-neural-deep/95 backdrop-blur-xl px-4 py-3 text-white shadow-neural-lg"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-cyan/15 to-accent-purple/15">
              <SparklesIcon className="h-5 w-5 text-accent-cyan" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Neural AI</p>
              <p className="text-sm font-semibold text-white/70">Ask anything</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-neural-deep/98 backdrop-blur-xl shadow-neural-lg"
          >
            {/* Header */}
            <div className="border-b border-white/[0.04] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-cyan/15 to-accent-purple/15">
                    <SparklesIcon className="h-4 w-4 text-accent-cyan" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/80">Neural Assistant</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-glow-pulse" />
                      <p className="text-[11px] text-white/25">Online</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 1 && (
                    <button onClick={clearHistory} className="rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20 hover:bg-white/[0.04] hover:text-white/40">
                      Clear
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-white/25 hover:bg-white/[0.04] hover:text-white/50">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-neural-void/50">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10">
                      <SparklesIcon className="h-3.5 w-3.5 text-accent-cyan/70" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-accent-cyan/15 to-accent-purple/15 text-white/80 border border-accent-cyan/10'
                      : 'bg-white/[0.03] text-white/60 border border-white/[0.04]'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                      <UserCircleIcon className="h-3.5 w-3.5 text-white/30" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10">
                    <SparklesIcon className="h-3.5 w-3.5 text-accent-cyan/70" />
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 1 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 mb-2">Suggestions</p>
                  {suggestedQuestions.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)}
                      className="block w-full rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left text-[13px] text-white/40 transition-all hover:bg-accent-cyan/[0.03] hover:border-accent-cyan/10 hover:text-white/60">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.04] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about OD, events, policies..."
                  className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/20"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="rounded-lg bg-gradient-to-r from-accent-cyan/80 to-accent-purple/80 p-2 text-white transition-opacity disabled:opacity-30"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
