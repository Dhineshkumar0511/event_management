import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiAPI } from '../services/api'
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserCircleIcon,
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
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return [defaultGreeting]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_history', JSON.stringify(messages.slice(-50)))
    } catch {}
  }, [messages])

  const clearHistory = () => {
    setMessages([defaultGreeting])
    localStorage.removeItem('ai_chat_history')
  }

  const sendMessage = async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await aiAPI.chat({
        message: userMessage,
        context: 'EventPass OD Letter Management System - help with OD requests, event registration, approval process, policies'
      })
      const reply = response.data.reply || response.data.data?.response || response.data.message || 'Let me help with that.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The assistant is temporarily unavailable. Please try again shortly.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            whileHover={{ y: -2 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-white/10 bg-[#0b141d] px-4 py-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#7fe2d0]" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">AI Assistant</p>
              <p className="text-sm font-semibold text-slate-100">Ask the platform</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[390px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b141d] shadow-[0_30px_90px_rgba(0,0,0,0.34)]"
          >
            <div className="border-b border-white/10 bg-[#0d1721] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5">
                    <SparklesIcon className="h-5 w-5 text-[#7fe2d0]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Department AI Assistant</h3>
                    <p className="text-xs text-slate-500">OD and platform support</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="rounded-xl p-1.5 text-slate-500 hover:bg-white/5 hover:text-white">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {messages.length > 1 && (
              <div className="border-b border-white/10 px-4 py-2 text-right">
                <button onClick={clearHistory} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 hover:text-white">
                  Clear History
                </button>
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#09121a] p-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/5">
                      <SparklesIcon className="h-4 w-4 text-[#7fe2d0]" />
                    </div>
                  )}

                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#7fe2d0] to-[#77c9ff] text-slate-950'
                      : 'border border-white/10 bg-white/[0.03] text-slate-200'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/5">
                      <UserCircleIcon className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/5">
                    <SparklesIcon className="h-4 w-4 text-[#7fe2d0]" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 1 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Suggested Questions</p>
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="block w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 bg-[#0d1721] p-4">
              <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.03] px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about OD requests or policies..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="rounded-2xl bg-gradient-to-r from-[#7fe2d0] to-[#77c9ff] p-2.5 text-slate-950 transition-opacity disabled:opacity-40"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-500">AI guidance should be reviewed before final decisions.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
