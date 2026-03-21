import { useState, useEffect, useRef } from 'react'
import { featuresAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../context/ThemeContext'
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export default function RequestComments({ entityType, entityId }) {
  const { isDark: dark } = useTheme()
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (entityType && entityId) loadComments()
  }, [entityType, entityId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const loadComments = async () => {
    setLoading(true)
    try {
      const res = await featuresAPI.getComments(entityType, entityId)
      setComments(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  const sendComment = async () => {
    if (!newComment.trim()) return
    setSending(true)
    try {
      const res = await featuresAPI.postComment({
        entity_type: entityType,
        entity_id: entityId,
        message: newComment.trim()
      })
      if (res.data.success) {
        setComments(prev => [...prev, res.data.data])
        setNewComment('')
      }
    } catch {} finally { setSending(false) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendComment()
    }
  }

  return (
    <div className={`rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${dark ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-2`}>
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-500" />
        <h3 className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
          Discussion ({comments.length})
        </h3>
      </div>

      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No comments yet. Start the discussion!</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className={`flex gap-2 ${c.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                c.user_role === 'student' ? 'bg-blue-500' :
                c.user_role === 'staff' ? 'bg-emerald-500' : 'bg-purple-500'
              }`}>
                {c.user_name?.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                c.user_id === user?.id
                  ? 'bg-purple-500 text-white'
                  : dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`text-xs font-medium mb-0.5 ${c.user_id === user?.id ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {c.user_name} ({c.user_role})
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                <p className={`text-xs mt-1 ${c.user_id === user?.id ? 'text-purple-200' : 'text-gray-400'}`}>
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className={`p-3 border-t ${dark ? 'border-gray-700' : 'border-gray-200'} flex gap-2`}>
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
            dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-purple-500`}
          disabled={sending}
        />
        <button
          onClick={sendComment}
          disabled={!newComment.trim() || sending}
          className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
